import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
// The SDK's zod helper targets Zod v4, which zod 3.25 ships at this subpath.
import { z } from "zod/v4";
import { buildMessages, buildSystemPrompt } from "@/lib/ai/prompt";
import type { GenerateInput, GenerateResult, Provider } from "@/lib/ai/types";

const SupportAnswer = z.object({
  answer: z.string(),
  confidence: z.number(),
  /** 1-based indexes into the knowledge entries listed in the system prompt. */
  sources: z.array(z.number()),
});

export const anthropicProvider: Provider = {
  id: "anthropic",

  async generate(input: GenerateInput): Promise<GenerateResult> {
    const apiKey = input.settings.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("No Anthropic API key configured");

    const client = new Anthropic({ apiKey });

    const response = await client.messages.parse({
      model: input.settings.model || "claude-opus-5",
      max_tokens: 2048,
      system: buildSystemPrompt(input),
      messages: buildMessages(input),
      // Support replies are short and latency-sensitive; low effort keeps them
      // snappy without giving up the grounding the system prompt enforces.
      output_config: {
        effort: "low",
        format: zodOutputFormat(SupportAnswer),
      },
    });

    const parsed = response.parsed_output;
    if (!parsed) throw new Error("Model returned an unparseable answer");

    return {
      answer: parsed.answer.trim(),
      confidence: Math.max(0, Math.min(1, parsed.confidence)),
      sources: resolveSources(parsed.sources, input),
      engine: `Anthropic · ${response.model}`,
    };
  },
};

/** Maps the model's 1-based citation numbers back to article ids. */
function resolveSources(indexes: number[], input: GenerateInput): string[] {
  return indexes
    .map((index) => input.matches[index - 1]?.article.id)
    .filter((id): id is string => Boolean(id));
}
