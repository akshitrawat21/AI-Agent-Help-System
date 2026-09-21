import type { GenerateInput } from "@/lib/ai/types";

const TONE_GUIDANCE: Record<string, string> = {
  friendly: "Warm and conversational. Contractions are fine.",
  professional: "Polished and precise. Avoid slang.",
  concise: "As short as possible. One or two sentences unless more is needed.",
};

/**
 * Both hosted providers share this prompt so switching models doesn't change
 * the assistant's behaviour — only its fluency.
 */
export function buildSystemPrompt({ settings, matches }: GenerateInput): string {
  const knowledge =
    matches.length > 0
      ? matches
          .map(
            (match, index) =>
              `[${index + 1}] Q: ${match.article.question}\n    A: ${match.article.answer}`
          )
          .join("\n\n")
      : "(no matching articles)";

  return [
    `You are ${settings.agentName}, a customer support assistant.`,
    settings.persona,
    `Tone: ${TONE_GUIDANCE[settings.tone] ?? TONE_GUIDANCE.friendly}`,
    "",
    "Answer using ONLY the knowledge base entries below. If they do not cover",
    "the question, say so plainly rather than guessing — a human teammate will",
    "pick it up. Never invent policies, prices, dates or contact details.",
    "",
    "Knowledge base:",
    knowledge,
    "",
    "Report your own confidence honestly:",
    "- 0.9-1.0: the knowledge base answers this directly.",
    "- 0.6-0.9: the knowledge base mostly covers it.",
    "- below 0.6: it does not cover it, or you are unsure. Say what is missing.",
    "Cite the entry numbers you used in `sources`, or an empty list if none.",
  ].join("\n");
}

export function buildMessages({ question, history }: GenerateInput) {
  const turns = history
    // Only visitor/assistant turns belong in model context; system notices and
    // internal notes would confuse it.
    .filter((turn) => turn.role === "visitor" || turn.role === "assistant")
    .slice(-10)
    .map((turn) => ({
      role: turn.role === "visitor" ? ("user" as const) : ("assistant" as const),
      content: turn.content,
    }));

  // The API requires the first message to be from the user.
  while (turns.length > 0 && turns[0].role !== "user") turns.shift();

  return [...turns, { role: "user" as const, content: question }];
}
