import { z } from "zod";
import { KB_CATEGORIES, PROVIDERS, ROLES, TONES } from "@/lib/constants";

const providerIds = PROVIDERS.map((provider) => provider.id) as [
  string,
  ...string[]
];

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Your name is required").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters").max(200),
  orgName: z.string().trim().min(1, "Workspace name is required").max(80),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export const articleSchema = z.object({
  question: z.string().trim().min(3, "Add a question").max(500),
  answer: z.string().trim().min(3, "Add an answer").max(5000),
  category: z.enum(KB_CATEGORIES).or(z.string().trim().min(1).max(40)),
});

export const agentConfigSchema = z.object({
  agentName: z.string().trim().min(1).max(40),
  greeting: z.string().trim().min(1).max(300),
  persona: z.string().trim().min(1).max(2000),
  tone: z.enum(TONES),
  confidenceThreshold: z.number().min(0.1).max(0.95),
  escalationTimeout: z.number().int().min(1).max(1440),
  autoLearn: z.boolean(),
  voiceEnabled: z.boolean(),
  collectVisitorDetails: z.boolean(),
  provider: z.enum(providerIds),
  model: z.string().trim().min(1).max(80),
  // Empty string clears the stored key; undefined leaves it untouched.
  apiKey: z.string().max(300).optional(),
});

export const answerEscalationSchema = z.object({
  answer: z.string().trim().min(1, "Write an answer").max(5000),
  /** Save this answer to the knowledge base so the assistant learns it. */
  saveToKnowledge: z.boolean().default(true),
  category: z.string().trim().max(40).optional(),
});

export const replySchema = z.object({
  content: z.string().trim().min(1).max(5000),
});

export const chatSchema = z.object({
  message: z.string().trim().min(1, "Type a message").max(2000),
  conversationId: z.string().trim().max(60).optional(),
  /** Proves the caller owns the conversation they're continuing. */
  visitorToken: z.string().trim().max(200).optional(),
  channel: z.enum(["chat", "voice", "widget"]).default("widget"),
  /** Who's asking, if the host site or a pre-chat form told us. */
  visitorName: z.string().trim().max(80).optional(),
  visitorEmail: z.string().trim().toLowerCase().email().max(200).optional(),
});

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  name: z.string().trim().min(1).max(80),
  password: z.string().min(8, "Use at least 8 characters").max(200),
  role: z.enum(ROLES),
});

export const memberRoleSchema = z.object({
  role: z.enum(ROLES),
});

export const orgSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes only"),
  /**
   * Origins allowed to embed the widget, one per line. Each must be a bare
   * origin (scheme + host, optional port) — a path would never match.
   */
  allowedOrigins: z
    .string()
    .max(4000)
    .transform((text) =>
      text
        .split(/\r?\n|,/)
        .map((line) => line.trim().replace(/\/+$/, ""))
        .filter(Boolean)
    )
    .refine(
      (origins) =>
        origins.every((origin) => /^https?:\/\/[^\s/]+$/i.test(origin)),
      { message: "Each line must be an origin like https://www.example.com" }
    )
    .transform((origins) => origins.join("\n")),
});

/** Turns a zod error into the flat `{ field: message }` shape the forms expect. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
