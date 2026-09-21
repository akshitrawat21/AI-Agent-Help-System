import { detectIntent, smallTalkReply, type Intent } from "@/lib/ai/intents";
import { rankArticles } from "@/lib/ai/retrieval";
import { anthropicProvider } from "@/lib/ai/providers/anthropic";
import { localProvider } from "@/lib/ai/providers/local";
import { openaiProvider } from "@/lib/ai/providers/openai";
import type {
  AgentSettings,
  Article,
  ConversationTurn,
  GenerateResult,
  Provider,
} from "@/lib/ai/types";

const PROVIDERS: Record<string, Provider> = {
  local: localProvider,
  anthropic: anthropicProvider,
  openai: openaiProvider,
};

export type EscalationReason =
  | "low_confidence"
  | "no_match"
  | "visitor_request"
  | "visitor_unsatisfied"
  | "repeated_miss";

export type AnswerOutcome = GenerateResult & {
  /** True when the answer is withheld and a human is brought in. */
  shouldEscalate: boolean;
  escalationReason: EscalationReason;
  /**
   * Set when the assistant couldn't answer but is trying again rather than
   * handing off — these are offered to the visitor as things it *can* answer.
   */
  suggestions?: string[];
  /** True when this turn was social chit-chat rather than a real question. */
  smallTalk?: boolean;
  /** Set when a hosted provider failed and the local engine stood in. */
  fallbackNotice?: string;
};

export async function answerQuestion(options: {
  question: string;
  history: ConversationTurn[];
  articles: Article[];
  settings: AgentSettings;
  /**
   * How many times in a row the assistant has just failed to answer. The
   * caller derives this from the transcript; at 1 or more, the next miss
   * hands off instead of asking the visitor to rephrase again.
   */
  missStreak?: number;
}): Promise<AnswerOutcome> {
  const {
    question,
    history,
    articles,
    settings,
    missStreak = 0,
  } = options;

  const intent = detectIntent(question);

  // 1. An explicit request for a person always wins, however confident the
  //    assistant is — refusing to hand off is the fastest way to lose trust.
  if (intent === "human_request") {
    return {
      answer:
        "Of course — I'm bringing in a teammate now. Stay here and they'll pick this up.",
      // Not a confidence in an *answer*: there is no answer here, only a
      // hand-off. Reporting 1 would put a green bar on an unanswered
      // escalation and inflate the org's average confidence.
      confidence: 0,
      sources: [],
      engine: "Routing",
      shouldEscalate: true,
      escalationReason: "visitor_request",
    };
  }

  // 2. The visitor says the last answer missed. Their judgement beats the
  //    retrieval score, so hand off rather than trying a third phrasing.
  if (intent === "dissatisfied") {
    return {
      answer:
        "Sorry about that — let me get a teammate who can help properly. Stay here and they'll join you.",
      confidence: 0,
      sources: [],
      engine: "Routing",
      shouldEscalate: true,
      escalationReason: "visitor_unsatisfied",
    };
  }

  // 3. Chit-chat. A knowledge base has no article about being greeted, so
  //    without this every "hi" scores near zero and lands in the queue.
  const topics = topicExamples(articles);
  const social = intent ? smallTalkReply(intent, settings.agentName, topics) : null;
  if (social) {
    return {
      answer: social,
      confidence: 1,
      sources: [],
      engine: "Conversation",
      shouldEscalate: false,
      escalationReason: "low_confidence",
      smallTalk: true,
    };
  }

  // 4. A real question: retrieve and answer.
  const matches = rankArticles(question, articles);
  const input = { question, history, matches, settings };
  const provider = PROVIDERS[settings.provider] ?? localProvider;

  let result: GenerateResult;
  let fallbackNotice: string | undefined;

  try {
    result = await provider.generate(input);
  } catch (error) {
    // A bad key or a provider outage must not take the assistant down: fall
    // back to local retrieval and surface why in the inbox.
    console.error(`[ai] ${provider.id} provider failed:`, error);
    result = await localProvider.generate(input);
    fallbackNotice =
      error instanceof Error ? error.message : "Provider request failed";
  }

  if (result.confidence >= settings.confidenceThreshold) {
    return {
      ...result,
      shouldEscalate: false,
      escalationReason: "low_confidence",
      fallbackNotice,
    };
  }

  // 5. Below the bar. First time, try to help rather than hand off — most
  //    misses are a wording mismatch, and a suggestion resolves them without
  //    ever costing a teammate's time. A second consecutive miss means
  //    rephrasing isn't working, so stop wasting the visitor's time.
  const nearby = matches
    .slice(0, 3)
    .map((match) => match.article.question)
    .filter(Boolean);

  if (missStreak === 0) {
    return {
      ...result,
      answer: clarifyingReply(nearby),
      shouldEscalate: false,
      escalationReason: matches.length === 0 ? "no_match" : "low_confidence",
      suggestions: nearby.length > 0 ? nearby : exampleQuestions(articles),
      fallbackNotice,
    };
  }

  return {
    ...result,
    shouldEscalate: true,
    escalationReason:
      missStreak > 0
        ? "repeated_miss"
        : matches.length === 0
          ? "no_match"
          : "low_confidence",
    fallbackNotice,
  };
}

/** What the visitor sees on a first miss, in place of a hand-off. */
function clarifyingReply(nearby: string[]): string {
  if (nearby.length === 0) {
    return "I don't think I have anything on that. Could you put it another way? Here's what I do cover — or say \"I need a human\" and I'll bring someone in.";
  }

  return `I'm not certain I've got the right answer for that. Did you mean one of these? If not, rephrase it and I'll try again — or say "talk to a human" and I'll bring someone in.`;
}

/** Category names, for the "I can help with billing, shipping…" sentence. */
function topicExamples(articles: Article[]): string[] {
  const seen = new Set<string>();
  for (const article of articles) seen.add(article.category.toLowerCase());
  return [...seen].slice(0, 4);
}

/**
 * Real questions to offer as "did you mean" chips — one per category, so the
 * spread is useful rather than four variations on the same topic. Category
 * names alone make poor suggestions: nobody clicks "billing".
 */
function exampleQuestions(articles: Article[]): string[] {
  const byCategory = new Map<string, string>();
  for (const article of articles) {
    if (!byCategory.has(article.category)) {
      byCategory.set(article.category, article.question);
    }
  }
  return [...byCategory.values()].slice(0, 3);
}

/** What the visitor sees once a hand-off is under way. */
export function escalationMessage(): string {
  return "I want to get this right, so I've passed it to a teammate. Stay here — they'll join you shortly.";
}

export type { AgentSettings, Article, ConversationTurn };
export type { Intent };
