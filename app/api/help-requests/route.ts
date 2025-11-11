import { prisma } from "@/lib/prisma"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { customer_id, question } = body

    if (!customer_id || !question) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const helpRequest = await prisma.helpRequest.create({
      data: {
        customerId: customer_id,
        question,
        status: "pending",
      },
    })

    return NextResponse.json(helpRequest, { status: 201 })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const helpRequests = await prisma.helpRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        history: true,
        responses: true,
      },
    })

    return NextResponse.json(helpRequests)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
