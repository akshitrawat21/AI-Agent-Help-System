import type { GenerateInput, GenerateResult, Provider } from "@/lib/ai/types";

/**
 * The zero-config engine. It doesn't write prose — it returns the best matching
 * knowledge base answer and reports the retrieval score as its confidence, so
 * anything it can't ground in an article escalates to a human. That makes the
 * product genuinely usable before any API key exists, and the escalation loop
 * (which is the actual point of the system) exercises end to end.
 */
export const localProvider: Provider = {
  id: "local",

  async generate({ matches, settings }: GenerateInput): Promise<GenerateResult> {
    const best = matches[0];

    if (!best) {
      return {
        answer:
          "I don't have anything on that yet — let me bring in a teammate who can help.",
        confidence: 0,
        sources: [],
        engine: "Built-in engine",
      };
    }

    // A clear winner reads as more reliable than a field of near-ties.
    const runnerUp = matches[1]?.normalized ?? 0;
    const separation = Math.min(0.12, Math.max(0, best.normalized - runnerUp));
    const confidence = Math.min(1, best.normalized + separation);

    if (confidence < settings.confidenceThreshold) {
      return {
        answer: best.article.answer,
        confidence,
        sources: [best.article.id],
        engine: "Built-in engine",
      };
    }

    return {
      answer: best.article.answer,
      confidence,
      // Only the winning article — its answer is what was sent verbatim.
      // Listing near-misses would inflate their use counts and misreport
      // which article actually answered the question.
      sources: [best.article.id],
      engine: "Built-in engine",
    };
  },
};
