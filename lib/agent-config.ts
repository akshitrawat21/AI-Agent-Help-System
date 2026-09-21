import { db } from "@/lib/db";
import type { AgentSettings } from "@/lib/ai/types";

/**
 * Reads an org's assistant settings, creating defaults on first access so a
 * workspace never has to be configured before it works.
 */
export async function getAgentConfig(orgId: string) {
  const existing = await db.agentConfig.findUnique({ where: { orgId } });
  if (existing) return existing;
  return db.agentConfig.create({ data: { orgId } });
}

export function toAgentSettings(config: {
  agentName: string;
  greeting: string;
  persona: string;
  tone: string;
  confidenceThreshold: number;
  provider: string;
  model: string;
  apiKey: string | null;
}): AgentSettings {
  return {
    agentName: config.agentName,
    greeting: config.greeting,
    persona: config.persona,
    tone: config.tone,
    confidenceThreshold: config.confidenceThreshold,
    provider: config.provider,
    model: config.model,
    apiKey: config.apiKey,
  };
}
