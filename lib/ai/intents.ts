/**
 * Conversational intents the assistant should handle itself.
 *
 * Retrieval is the wrong tool for "hi" or "thanks": a knowledge base has no
 * article about being greeted, so every pleasantry scores near zero and gets
 * handed to a human. That is the fastest way to bury a support queue in noise,
 * so these are matched before retrieval ever runs.
 *
 * Matching is deliberately conservative — anchored on short inputs, or on
 * clear leading phrases — so a real question that merely starts with "hi"
 * ("hi, where is my order?") still goes to retrieval.
 */

export type Intent =
  | "greeting"
  | "how_are_you"
  | "thanks"
  | "goodbye"
  | "identity"
  | "capabilities"
  | "affirm"
  | "dissatisfied"
  | "human_request";

type Rule = {
  intent: Intent;
  /** Matched against the whole message, once trimmed and lowercased. */
  exact?: string[];
  /** Matched anywhere in the message — use only for unambiguous phrases. */
  contains?: string[];
  /** Matched only at the start of the message. */
  startsWith?: string[];
  /**
   * Cap on word count. Greetings are short; a long message that happens to
   * contain "hello" is a real question with a polite opener.
   */
  maxWords?: number;
};

const RULES: Rule[] = [
  {
    intent: "human_request",
    contains: [
      "speak to a human",
      "talk to a human",
      "speak to someone",
      "talk to someone",
      "speak to a person",
      "talk to a person",
      "real person",
      "human agent",
      "real human",
      "customer service rep",
      "speak to an agent",
      "talk to an agent",
      "speak to a manager",
      "talk to a manager",
      "escalate this",
      "get me someone",
      "connect me to",
      "transfer me",
      "supervisor",
      // "I need a human" and friends — at least as common as "speak to".
      "need a human",
      "want a human",
      "get a human",
      "need a person",
      "want a person",
      "need an agent",
      "want an agent",
      "live agent",
      "live person",
      "human please",
      "agent please",
      "representative",
      "operator",
      "someone who can help",
      "somebody who can help",
    ],
  },
  {
    intent: "dissatisfied",
    contains: [
      "not what i asked",
      "not what i meant",
      "that doesn't help",
      "that does not help",
      "not helpful",
      "you're not helping",
      "you are not helping",
      "this is useless",
      "useless",
      "that's wrong",
      "that is wrong",
      "you don't understand",
      "you do not understand",
      "still not",
      "didn't answer",
      "did not answer",
      "doesn't answer",
      "you keep saying",
      "i already said",
      "this is frustrating",
      "waste of time",
    ],
  },
  {
    intent: "how_are_you",
    contains: [
      "how are you",
      "how's it going",
      "hows it going",
      "how are things",
      "how do you do",
    ],
    maxWords: 8,
  },
  {
    intent: "identity",
    contains: [
      "who are you",
      "what are you",
      "are you a bot",
      "are you a robot",
      "are you human",
      "are you real",
      "your name",
    ],
    maxWords: 10,
  },
  {
    intent: "capabilities",
    contains: [
      "what can you do",
      "what can you help",
      "how can you help",
      "what do you do",
      "what can i ask",
      "help me with",
    ],
    maxWords: 12,
  },
  {
    intent: "thanks",
    exact: ["thanks", "thank you", "ty", "thx", "cheers", "much appreciated"],
    startsWith: ["thanks", "thank you", "thanks a lot", "thank u"],
    maxWords: 6,
  },
  {
    intent: "goodbye",
    exact: ["bye", "goodbye", "see you", "later", "that's all", "thats all"],
    startsWith: ["bye", "goodbye", "see ya", "that's all", "thats all"],
    maxWords: 6,
  },
  {
    intent: "greeting",
    exact: [
      "hi",
      "hii",
      "hey",
      "hello",
      "yo",
      "hiya",
      "howdy",
      "good morning",
      "good afternoon",
      "good evening",
      "hi there",
      "hello there",
      "hey there",
    ],
    startsWith: ["hi ", "hey ", "hello ", "good morning", "good afternoon"],
    maxWords: 4,
  },
  {
    intent: "affirm",
    exact: ["yes", "yeah", "yep", "ok", "okay", "sure", "got it", "perfect", "great"],
    maxWords: 3,
  },
];

export function detectIntent(message: string): Intent | null {
  const normalized = message.trim().toLowerCase().replace(/[!.?,]+$/g, "");
  const words = normalized.split(/\s+/).filter(Boolean).length;

  for (const rule of RULES) {
    if (rule.maxWords !== undefined && words > rule.maxWords) continue;

    if (rule.exact?.includes(normalized)) return rule.intent;
    if (rule.contains?.some((phrase) => normalized.includes(phrase))) {
      return rule.intent;
    }
    if (rule.startsWith?.some((phrase) => normalized.startsWith(phrase))) {
      return rule.intent;
    }
  }

  return null;
}

/**
 * Canned replies for the social intents. These are the assistant's own voice,
 * not knowledge base content, so they don't cite sources and don't affect the
 * org's confidence average in a meaningful way.
 */
export function smallTalkReply(
  intent: Intent,
  agentName: string,
  topics: string[]
): string | null {
  const examples = topics.slice(0, 3);
  const topicList =
    examples.length > 0
      ? ` I can help with things like ${formatList(examples)}.`
      : "";

  switch (intent) {
    case "greeting":
      return `Hi! I'm ${agentName}.${topicList} What can I do for you?`;
    case "how_are_you":
      return `Doing well, thanks for asking!${topicList} What do you need a hand with?`;
    case "identity":
      return `I'm ${agentName}, the support assistant here. I answer from this company's help documentation, and I'll bring in a teammate whenever something needs a person.`;
    case "capabilities":
      return examples.length > 0
        ? `I can answer questions about ${formatList(examples)}, among other things. Ask away — and if I can't help, I'll pass you to a teammate.`
        : `Ask me anything about this company's products and policies. If I can't answer it, I'll pass you to a teammate.`;
    case "thanks":
      return "Happy to help! Anything else I can look up for you?";
    case "goodbye":
      return "Thanks for stopping by — take care!";
    case "affirm":
      return "Great. Anything else I can help with?";
    default:
      return null;
  }
}

function formatList(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
