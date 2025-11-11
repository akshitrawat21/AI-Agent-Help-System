import { type NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notifyEscalation } from "@/lib/websocket-server";
import { timeoutService } from "@/lib/timeout-service";

export async function POST(request: NextRequest) {
  let conversationId: string | undefined;
  let message: string = "";

  try {
    const body = await request.json();
    conversationId = body.conversationId;
    message = body.message;

    // Helper function to validate UUID
    const isValidUUID = (str: string) => {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(str);
    };

    // Create or retrieve conversation
    let conversation = null;

    if (conversationId && isValidUUID(conversationId)) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId: "550e8400-e29b-41d4-a716-446655440000", // Anonymous user UUID
          title: message.substring(0, 50),
        },
      });
    } else if (conversation.status === "resolved") {
      // If conversation was resolved but user is continuing, reopen it
      console.log("🔄 Reopening resolved conversation");
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: "open",
          agentStatus: "processing",
        },
      });
    }

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    });

    // Call LiveAgentKit to generate response
    const agentResponse = await callLiveAgentKit(message, conversation.id);

    // Determine if we need to escalate
    const shouldEscalate = agentResponse.confidence < 0.7;

    let responseMessage = agentResponse.response;
    let messageRole: "agent" | "supervisor" = "agent";

    if (shouldEscalate) {
      // Create or update escalation record (handle case where escalation already exists)
      const escalation = await prisma.escalation.upsert({
        where: {
          conversationId: conversation.id,
        },
        create: {
          conversationId: conversation.id,
          agentResponse: agentResponse.response,
          reason: "Low confidence score",
        },
        update: {
          agentResponse: agentResponse.response,
          reason: "Low confidence score",
          resolved: false, // Re-escalate if it was previously resolved
          resolvedAt: null,
          supervisorNote: null,
        },
        include: {
          conversation: {
            include: {
              messages: true,
            },
          },
        },
      });

      // Notify supervisors via WebSocket
      notifyEscalation({
        id: escalation.id,
        conversationId: escalation.conversationId,
        agentResponse: escalation.agentResponse,
        reason: escalation.reason,
        resolved: escalation.resolved,
        messages: escalation.conversation.messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
        })),
      });

      // Schedule timeout for the escalation
      timeoutService.scheduleEscalationTimeout(escalation.id);

      responseMessage = `I'm not entirely sure about this. Let me escalate this to our supervisor team. They'll get back to you shortly.`;
      messageRole = "agent";

      // Update conversation status
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: "escalated",
          agentStatus: "escalated",
        },
      });
    } else {
      // Update conversation status
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          agentStatus: "confident",
          confidence: agentResponse.confidence,
        },
      });
    }

    // Save agent response
    const savedMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: messageRole,
        content: responseMessage,
        confidence: agentResponse.confidence,
        isEscalated: shouldEscalate,
      },
    });

    console.log("📤 API Response:", {
      conversationId: conversation.id,
      conversationStatus: conversation.status,
      messageRole: savedMessage.role,
      isEscalated: savedMessage.isEscalated,
      shouldEscalate,
    });

    return NextResponse.json({
      message: {
        id: savedMessage.id,
        role: savedMessage.role,
        content: savedMessage.content,
        confidence: savedMessage.confidence,
        isEscalated: savedMessage.isEscalated,
        createdAt: savedMessage.createdAt.toISOString(),
      },
      conversationId: conversation.id,
      conversationStatus: conversation.status,
    });
  } catch (error) {
    console.error("Chat error:", error);

    // If database is down, still provide a response using the already-parsed message
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Can't reach database") && message) {
      const aiResponse = await callLiveAgentKit(message, "temp");

      return NextResponse.json({
        message: {
          id: "temp-" + Date.now(),
          role: "agent",
          content: aiResponse.response,
          confidence: aiResponse.confidence,
          isEscalated: false,
          createdAt: new Date().toISOString(),
        },
        conversationId: "temp",
        conversationStatus: "open",
      });
    }

    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}

async function callLiveAgentKit(message: string, conversationId: string) {
  try {
    // TODO: Replace this mock with actual LiveAgentKit API integration
    // For now, using a simple mock response based on message content

    // Check if we have knowledge base entries that might match (skip if DB is down)
    try {
      const knowledgeEntries = await prisma.knowledgeBase.findMany({
        where: {
          question: {
            contains: message.toLowerCase(),
            mode: "insensitive",
          },
        },
        orderBy: {
          confidence: "desc",
        },
        take: 1,
      });

      if (knowledgeEntries.length > 0) {
        const entry = knowledgeEntries[0];
        return {
          response: entry.answer,
          confidence: entry.confidence,
        };
      }
    } catch (dbError) {
      console.log("Knowledge base query failed, using built-in responses");
    }

    // Mock responses for common salon queries
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes("hello") || lowerMessage.includes("hi")) {
      return {
        response: "Hello! Welcome to our salon. How can I help you today?",
        confidence: 0.9,
      };
    } else if (
      lowerMessage.includes("appointment") ||
      lowerMessage.includes("book")
    ) {
      return {
        response:
          "I'd be happy to help you book an appointment! You can call us at (555) 123-SALON or use our online booking system. What service are you interested in?",
        confidence: 0.85,
      };
    } else if (
      lowerMessage.includes("price") ||
      lowerMessage.includes("cost") ||
      lowerMessage.includes("how much")
    ) {
      return {
        response:
          "Our prices vary by service and stylist level. Haircuts range from $45-85, color services start at $80. Would you like specific pricing for a particular service?",
        confidence: 0.8,
      };
    } else if (
      lowerMessage.includes("hours") ||
      lowerMessage.includes("open") ||
      lowerMessage.includes("closed")
    ) {
      return {
        response:
          "We're open Tuesday-Saturday 9AM-7PM, Sunday 10AM-5PM. We're closed Mondays. Would you like to schedule an appointment?",
        confidence: 0.9,
      };
    } else if (
      lowerMessage.includes("hair") ||
      lowerMessage.includes("cut") ||
      lowerMessage.includes("color")
    ) {
      return {
        response:
          "We offer full hair services including cuts, coloring, highlights, and treatments. Our stylists can help you achieve the perfect look! What are you thinking about?",
        confidence: 0.8,
      };
    } else if (
      lowerMessage.includes("nail") ||
      lowerMessage.includes("manicure") ||
      lowerMessage.includes("pedicure")
    ) {
      return {
        response:
          "Yes, we offer professional nail services including manicures and pedicures. Would you like to book an appointment or learn more about our nail services?",
        confidence: 0.8,
      };
    } else if (
      lowerMessage.includes("service") ||
      lowerMessage.includes("what do you offer") ||
      lowerMessage.includes("what services")
    ) {
      return {
        response:
          "We offer a full range of beauty services including haircuts, coloring, styling, nail services, and special treatments. Would you like to know more about any specific service?",
        confidence: 0.85,
      };
    } else if (
      lowerMessage.includes("location") ||
      lowerMessage.includes("address") ||
      lowerMessage.includes("where are you")
    ) {
      return {
        response:
          "We're conveniently located in the heart of the city. Please call us at (555) 123-SALON for our exact address and directions!",
        confidence: 0.9,
      };
    } else if (
      lowerMessage.includes("thank") ||
      lowerMessage.includes("thanks")
    ) {
      return {
        response:
          "You're very welcome! Is there anything else I can help you with today?",
        confidence: 0.95,
      };
    } else if (
      lowerMessage.includes("question") ||
      lowerMessage.includes("help") ||
      lowerMessage.includes("information")
    ) {
      return {
        response:
          "I'm here to help! I can assist you with information about our services, booking appointments, pricing, and hours. What would you like to know?",
        confidence: 0.8,
      };
    } else {
      // Only very specific or complex queries should escalate
      return {
        response:
          "That's a great question! Let me connect you with our team who can provide you with detailed information about that.",
        confidence: 0.5,
      };
    }
  } catch (error) {
    console.error("LiveAgentKit error:", error);
    return {
      response:
        "I'm having trouble processing that. Please try again or let me connect you with a human agent.",
      confidence: 0.2,
    };
  }
}
