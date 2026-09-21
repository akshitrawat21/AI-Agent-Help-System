export const ROLES = ["owner", "admin", "agent"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  agent: "Agent",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner: "Full access, including billing and deleting the workspace.",
  admin: "Manage the assistant, knowledge base and teammates.",
  agent: "Answer escalations and reply in the inbox.",
};

/// Ranked so permission checks can compare levels numerically.
export const ROLE_RANK: Record<Role, number> = { owner: 3, admin: 2, agent: 1 };

export const CONVERSATION_STATUSES = [
  "active",
  "waiting",
  "live",
  "resolved",
  "missed",
] as const;
export type ConversationStatus = (typeof CONVERSATION_STATUSES)[number];

export const ESCALATION_STATUSES = ["pending", "answered", "missed"] as const;
export type EscalationStatus = (typeof ESCALATION_STATUSES)[number];

export const ESCALATION_REASONS = {
  low_confidence: "Low confidence",
  no_match: "No knowledge match",
  visitor_request: "Visitor asked for a human",
  visitor_unsatisfied: "Visitor wasn't satisfied",
  repeated_miss: "Couldn't answer twice",
} as const;

export const TONES = ["friendly", "professional", "concise"] as const;

export const PROVIDERS = [
  {
    id: "local",
    name: "Built-in engine",
    description:
      "Answers from your knowledge base using local retrieval. No API key needed.",
    models: ["retrieval-v1"],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude models. Best quality for nuanced support answers.",
    models: ["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5-20251001"],
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT models via the OpenAI API.",
    models: ["gpt-4o", "gpt-4o-mini"],
  },
] as const;

export const AVATAR_COLORS = [
  "slate",
  "blue",
  "violet",
  "emerald",
  "amber",
  "rose",
] as const;

export const KB_CATEGORIES = [
  "General",
  "Billing",
  "Account",
  "Product",
  "Shipping",
  "Technical",
  "Policy",
] as const;
