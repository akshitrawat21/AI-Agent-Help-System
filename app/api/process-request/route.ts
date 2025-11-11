import { prisma } from "@/lib/prisma"
import { generateAIResponse, calculateConfidenceScore } from "@/lib/ai-service"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { request_id } = body

    if (!request_id) {
      return NextResponse.json({ error: "request_id is required" }, { status: 400 })
    }

    // Fetch the help request
    const helpRequest = await prisma.helpRequest.findUnique({
      where: { id: request_id },
    })

    if (!helpRequest) {
      return NextResponse.json({ error: "Help request not found" }, { status: 404 })
    }

    // Fetch relevant knowledge base articles
    const kbArticles = await prisma.knowledgeBase.findMany({
      take: 5,
    })

    // Prepare knowledge base context
    const knowledgeBaseContext =
      kbArticles
        .map((article) => `Q: ${article.question}\nA: ${article.answer}\nCategory: ${article.category}`)
        .join("\n\n") || ""

    // Generate AI response
    const aiResponseText = await generateAIResponse({
      question: helpRequest.question,
      knowledgeBase: knowledgeBaseContext,
    })

    // Calculate confidence score
    const confidenceScore = calculateConfidenceScore(aiResponseText)

    // Store response in help request history
    const history = await prisma.helpRequestHistory.create({
      data: {
        helpRequestId: request_id,
        agentResponse: aiResponseText,
      },
    })

    // Update help request status
    await prisma.helpRequest.update({
      where: { id: request_id },
      data: { status: "pending_review" },
    })

    return NextResponse.json(
      {
        success: true,
        response: history,
        confidenceScore,
        message: "AI response generated successfully",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
