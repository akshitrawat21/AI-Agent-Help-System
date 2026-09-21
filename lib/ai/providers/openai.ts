import { buildMessages, buildSystemPrompt } from "@/lib/ai/prompt";
import type { GenerateInput, GenerateResult, Provider } from "@/lib/ai/types";

/**
 * Called over plain HTTP so the project doesn't carry a second vendor SDK for
 * what is a single JSON-mode request.
 */
export const openaiProvider: Provider = {
  id: "openai",

  async generate(input: GenerateInput): Promise<GenerateResult> {
    const apiKey = input.settings.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("No OpenAI API key configured");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: input.settings.model || "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `${buildSystemPrompt(input)}\n\nRespond with JSON: {"answer": string, "confidence": number, "sources": number[]}`,
          },
          ...buildMessages(input),
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenAI request failed (${response.status}): ${detail}`);
    }

    const payload = await response.json();
    const raw = payload.choices?.[0]?.message?.content;
    if (!raw) throw new Error("OpenAI returned an empty answer");

    const parsed = JSON.parse(raw) as {
      answer?: string;
      confidence?: number;
      sources?: number[];
    };

    if (!parsed.answer) throw new Error("OpenAI returned no answer field");

    return {
      answer: parsed.answer.trim(),
      confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0.5)),
      sources: (parsed.sources ?? [])
        .map((index) => input.matches[index - 1]?.article.id)
        .filter((id): id is string => Boolean(id)),
      engine: `OpenAI · ${payload.model ?? input.settings.model}`,
    };
  },
};
