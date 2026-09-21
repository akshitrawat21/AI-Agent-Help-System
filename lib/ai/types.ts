import type { Article, ScoredArticle } from "@/lib/ai/retrieval";

export type AgentSettings = {
  agentName: string;
  greeting: string;
  persona: string;
  tone: string;
  confidenceThreshold: number;
  provider: string;
  model: string;
  apiKey: string | null;
};

export type ConversationTurn = {
  role: string;
  content: string;
};

export type GenerateInput = {
  question: string;
  history: ConversationTurn[];
  matches: ScoredArticle[];
  settings: AgentSettings;
};

export type GenerateResult = {
  answer: string;
  /** 0..1. Below the org's threshold the answer is held back and escalated. */
  confidence: number;
  /** Knowledge article ids the answer drew on. */
  sources: string[];
  /** Which engine produced this, for display in the inbox. */
  engine: string;
};

export type Provider = {
  id: string;
  generate(input: GenerateInput): Promise<GenerateResult>;
};

export type { Article, ScoredArticle };
