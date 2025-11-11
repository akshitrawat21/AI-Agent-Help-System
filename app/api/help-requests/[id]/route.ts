import { prisma } from "@/lib/prisma"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const helpRequest = await prisma.helpRequest.findUnique({
      where: { id },
      include: {
        history: true,
        responses: true,
      },
    })

    if (!helpRequest) {
      return NextResponse.json({ error: "Help request not found" }, { status: 404 })
    }

    return NextResponse.json(helpRequest)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    const helpRequest = await prisma.helpRequest.update({
      where: { id },
      data: body,
      include: {
        history: true,
        responses: true,
      },
    })

    return NextResponse.json(helpRequest)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
