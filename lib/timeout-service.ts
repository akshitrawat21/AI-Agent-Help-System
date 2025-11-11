import prisma from "@/lib/prisma";
import { notifyEscalationResolved } from "@/lib/websocket-server";

export interface TimeoutConfig {
  escalationTimeoutMinutes: number;
  helpRequestTimeoutMinutes: number;
}

export const DEFAULT_TIMEOUT_CONFIG: TimeoutConfig = {
  escalationTimeoutMinutes: 2, // 2 minutes for escalations
  helpRequestTimeoutMinutes: 60, // 60 minutes for help requests
};

export class TimeoutService {
  private static instance: TimeoutService;
  private timeouts = new Map<string, NodeJS.Timeout>();
  private config: TimeoutConfig;

  private constructor(config: TimeoutConfig = DEFAULT_TIMEOUT_CONFIG) {
    this.config = config;
  }

  static getInstance(config?: TimeoutConfig): TimeoutService {
    if (!TimeoutService.instance) {
      TimeoutService.instance = new TimeoutService(config);
    }
    return TimeoutService.instance;
  }

  // Schedule timeout for an escalation
  scheduleEscalationTimeout(escalationId: string): void {
    // Clear any existing timeout
    this.clearTimeout(escalationId);

    const timeoutMs = this.config.escalationTimeoutMinutes * 60 * 1000;

    const timeout = setTimeout(async () => {
      await this.handleEscalationTimeout(escalationId);
    }, timeoutMs);

    this.timeouts.set(escalationId, timeout);

    // Update database with timeout timestamp
    const timeoutAt = new Date(Date.now() + timeoutMs);
    prisma.escalation
      .update({
        where: { id: escalationId },
        data: { timeoutAt },
      })
      .catch(console.error);

    console.log(
      `⏰ Scheduled escalation timeout for ${escalationId} in ${this.config.escalationTimeoutMinutes} minutes`
    );
  }

  // Schedule timeout for a help request
  scheduleHelpRequestTimeout(helpRequestId: string): void {
    // Clear any existing timeout
    this.clearTimeout(helpRequestId);

    const timeoutMs = this.config.helpRequestTimeoutMinutes * 60 * 1000;

    const timeout = setTimeout(async () => {
      await this.handleHelpRequestTimeout(helpRequestId);
    }, timeoutMs);

    this.timeouts.set(helpRequestId, timeout);

    // Update database with timeout timestamp
    const timeoutAt = new Date(Date.now() + timeoutMs);
    prisma.helpRequest
      .update({
        where: { id: helpRequestId },
        data: { timeoutAt },
      })
      .catch(console.error);

    console.log(
      `⏰ Scheduled help request timeout for ${helpRequestId} in ${this.config.helpRequestTimeoutMinutes} minutes`
    );
  }

  // Clear timeout for an item
  clearTimeout(itemId: string): void {
    const timeout = this.timeouts.get(itemId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(itemId);
      console.log(`⏰ Cleared timeout for ${itemId}`);
    }
  }

  // Handle escalation timeout
  private async handleEscalationTimeout(escalationId: string): Promise<void> {
    try {
      console.log(
        `⏰ Escalation ${escalationId} timed out - marking as unresolved`
      );

      // Update escalation as unresolved due to timeout
      const escalation = await prisma.escalation.update({
        where: { id: escalationId },
        data: {
          resolved: false, // Keep as unresolved
          timedOut: true, // Mark that it timed out
          supervisorNote:
            "⏰ Automatically marked as unresolved - no supervisor response within 2 minutes",
        },
        include: {
          conversation: true,
        },
      });

      // Update conversation status to escalated (keep it escalated since unresolved)
      await prisma.conversation.update({
        where: { id: escalation.conversationId },
        data: {
          status: "escalated",
          agentStatus: "timed_out",
        },
      });

      // Add a system message to the conversation
      await prisma.message.create({
        data: {
          conversationId: escalation.conversationId,
          role: "system",
          content:
            "⏰ This escalation was automatically marked as unresolved due to no supervisor response within 2 minutes.",
        },
      });

      // Notify via WebSocket that escalation timed out
      notifyEscalationResolved(escalationId);

      // Clean up timeout reference
      this.timeouts.delete(escalationId);

      console.log(
        `⏰ Escalation ${escalationId} marked as unresolved due to timeout`
      );
    } catch (error) {
      console.error(
        `Failed to handle escalation timeout for ${escalationId}:`,
        error
      );
    }
  }

  // Handle help request timeout
  private async handleHelpRequestTimeout(helpRequestId: string): Promise<void> {
    try {
      console.log(`⏰ Help request ${helpRequestId} timed out`);

      // Update help request as unresolved due to timeout
      await prisma.helpRequest.update({
        where: { id: helpRequestId },
        data: {
          status: "unresolved",
        },
      });

      // Add timeout history entry
      await prisma.helpRequestHistory.create({
        data: {
          helpRequestId,
          supervisorComment:
            "Request timed out - automatically marked as unresolved",
        },
      });

      // Clean up timeout reference
      this.timeouts.delete(helpRequestId);

      console.log(
        `⏰ Help request ${helpRequestId} marked as unresolved due to timeout`
      );
    } catch (error) {
      console.error(
        `Failed to handle help request timeout for ${helpRequestId}:`,
        error
      );
    }
  }

  // Restore timeouts on server restart
  async restoreTimeouts(): Promise<void> {
    try {
      console.log("⏰ Restoring timeouts...");

      // For now, just schedule timeouts for all pending escalations and help requests
      // In a production environment, you'd want to properly restore based on timeout timestamps

      // Restore escalation timeouts
      const pendingEscalations = await prisma.escalation.findMany({
        where: {
          resolved: false,
        },
      });

      for (const escalation of pendingEscalations) {
        // Schedule new timeout (this will reset any existing timeouts)
        this.scheduleEscalationTimeout(escalation.id);
      }

      // Restore help request timeouts
      const pendingHelpRequests = await prisma.helpRequest.findMany({
        where: {
          status: "pending",
        },
      });

      for (const helpRequest of pendingHelpRequests) {
        this.scheduleHelpRequestTimeout(helpRequest.id);
      }

      console.log(`⏰ Restored ${this.timeouts.size} timeouts`);
    } catch (error) {
      console.error("Failed to restore timeouts:", error);
    }
  }

  // Get timeout status for an item
  getTimeoutInfo(itemId: string): {
    hasTimeout: boolean;
    remainingMs?: number;
  } {
    const timeout = this.timeouts.get(itemId);
    return { hasTimeout: !!timeout };
  }

  // Update timeout configuration
  updateConfig(config: Partial<TimeoutConfig>): void {
    this.config = { ...this.config, ...config };
    console.log("⏰ Updated timeout configuration:", this.config);
  }

  // Get active timeouts count
  getActiveTimeoutsCount(): number {
    return this.timeouts.size;
  }

  // Clean up all timeouts (for shutdown)
  cleanup(): void {
    this.timeouts.forEach((timeout) => clearTimeout(timeout));
    this.timeouts.clear();
    console.log("⏰ Cleaned up all timeouts");
  }
}

// Singleton instance
export const timeoutService = TimeoutService.getInstance();
