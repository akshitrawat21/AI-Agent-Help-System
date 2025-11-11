import { prisma } from "@/lib/prisma"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { help_request_id, response, approved, supervisor_comment } = body

    if (!help_request_id || response === undefined || approved === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supervisorResponse = await prisma.supervisorResponse.create({
      data: {
        helpRequestId: help_request_id,
        response,
        approved,
      },
    })

    // Update help request history with supervisor approval
    await prisma.helpRequestHistory.create({
      data: {
        helpRequestId: help_request_id,
        supervisorApproval: approved,
        supervisorComment: supervisor_comment || null,
      },
    })

    // Update help request status
    const newStatus = approved ? "resolved" : "unresolved"
    await prisma.helpRequest.update({
      where: { id: help_request_id },
      data: { status: newStatus },
    })

    return NextResponse.json(supervisorResponse, { status: 201 })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const helpRequestId = request.nextUrl.searchParams.get("help_request_id")

    if (!helpRequestId) {
      return NextResponse.json({ error: "help_request_id query parameter required" }, { status: 400 })
    }

    const response = await prisma.supervisorResponse.findFirst({
      where: { helpRequestId },
      orderBy: { createdAt: "desc" },
    })

    if (!response) {
      return NextResponse.json({ error: "Supervisor response not found" }, { status: 404 })
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
