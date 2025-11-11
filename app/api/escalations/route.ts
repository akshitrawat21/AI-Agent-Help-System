import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const escalations = await prisma.escalation.findMany({
      include: {
        conversation: {
          include: {
            messages: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      escalations: escalations.map((esc) => ({
        id: esc.id,
        conversationId: esc.conversationId,
        agentResponse: esc.agentResponse,
        reason: esc.reason,
        resolved: esc.resolved,
        timedOut: esc.timedOut,
        messages: esc.conversation.messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
        })),
      })),
    });
  } catch (error) {
    console.error("Get escalations error:", error);
    // Return empty array on error instead of failing
    return NextResponse.json({ escalations: [] });
  }
}
