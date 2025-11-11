import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notifyEscalationResolved } from "@/lib/websocket-server";
import { timeoutService } from "@/lib/timeout-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supervisorResponse } = await request.json();
    const { id } = await params;

    const escalation = await prisma.escalation.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        supervisorNote: supervisorResponse,
      },
    });

    // Add supervisor response to conversation
    await prisma.message.create({
      data: {
        conversationId: escalation.conversationId,
        userId: "550e8400-e29b-41d4-a716-446655440000", // Use the anonymous user ID for now
        role: "supervisor",
        content: supervisorResponse,
        confidence: 1.0, // Supervisor responses have full confidence
      },
    });

    // Update conversation status
    await prisma.conversation.update({
      where: { id: escalation.conversationId },
      data: {
        status: "resolved",
        agentStatus: "resolved",
      },
    });

    // Clear the timeout since escalation is resolved
    timeoutService.clearTimeout(escalation.id);

    // Notify supervisors via WebSocket
    notifyEscalationResolved(escalation.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resolve escalation error:", error);
    return NextResponse.json(
      { error: "Failed to resolve escalation" },
      { status: 500 }
    );
  }
}
