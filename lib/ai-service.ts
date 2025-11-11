import { generateText } from "ai"

interface AIGenerationParams {
  question: string
  knowledgeBase: string
  systemPrompt?: string
}

export async function generateAIResponse({ question, knowledgeBase, systemPrompt }: AIGenerationParams) {
  const defaultSystemPrompt = `You are a helpful customer support AI assistant. 
Your role is to provide accurate, concise, and helpful responses to customer questions.
Use the provided knowledge base to inform your responses.
If you're not sure about something, acknowledge the limitation and suggest contacting support.`

  const context = `Knowledge Base:\n${knowledgeBase || "No knowledge base articles available yet."}`

  const { text } = await generateText({
    model: "openai/gpt-4o-mini",
    system: systemPrompt || defaultSystemPrompt,
    prompt: `${context}\n\nCustomer Question: ${question}`,
  })

  return text
}

export function calculateConfidenceScore(text: string): number {
  // Simple confidence scoring based on response characteristics
  let score = 0.7 // Base score

  // Increase confidence if response contains specific details
  if (text.length > 200) score += 0.1
  if (text.includes("specific") || text.includes("solution")) score += 0.05
  if (text.includes("?")) score -= 0.1 // Decrease if uncertain tone

  return Math.min(Math.max(score, 0), 1)
}
