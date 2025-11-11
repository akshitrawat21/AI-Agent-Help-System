import { NextRequest, NextResponse } from "next/server";
import {
  SalonVoiceAgent,
  generateCallRoomName,
  defaultSalonConfig,
  validateLiveKitConfig,
} from "@/lib/livekit-agent";
import prisma from "@/lib/prisma";
import { notifyEscalation } from "@/lib/websocket-server";

// Store active voice agents (in production, use Redis or similar)
const activeAgents = new Map<string, SalonVoiceAgent>();

export async function POST(request: NextRequest) {
  try {
    // Validate LiveKit configuration
    const configValidation = validateLiveKitConfig();
    if (!configValidation.isValid) {
      return NextResponse.json(
        {
          error: "LiveKit not configured",
          message: `Missing environment variables: ${configValidation.missingVars.join(
            ", "
          )}`,
          setup:
            "Please configure LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL in your .env.local file",
        },
        { status: 503 }
      );
    }

    const { action, roomName, customerPhone } = await request.json();

    switch (action) {
      case "start-call":
        return await handleStartCall(customerPhone);

      case "end-call":
        return await handleEndCall(roomName);

      case "join-call":
        return await handleJoinCall(roomName);

      case "get-token":
        return await handleGetToken(roomName);

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("LiveKit API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleStartCall(customerPhone?: string) {
  try {
    const roomName = generateCallRoomName();

    // Create LiveKit room (server-side only)
    await SalonVoiceAgent.createCallRoom(roomName, defaultSalonConfig);

    console.log("📞 Created call room:", roomName);

    return NextResponse.json({
      success: true,
      roomName,
      wsUrl: defaultSalonConfig.wsUrl,
      message: "Voice call room created successfully",
    });
  } catch (error) {
    console.error("Failed to start voice call:", error);
    return NextResponse.json(
      { error: "Failed to start voice call" },
      { status: 500 }
    );
  }
}

async function handleGetToken(roomName: string) {
  try {
    const token = await SalonVoiceAgent.generateAccessToken(
      roomName,
      "customer",
      defaultSalonConfig
    );

    return NextResponse.json({
      success: true,
      token,
      wsUrl: defaultSalonConfig.wsUrl,
    });
  } catch (error) {
    console.error("Failed to generate token:", error);
    return NextResponse.json(
      { error: "Failed to generate access token" },
      { status: 500 }
    );
  }
}

async function handleEndCall(roomName: string) {
  try {
    const agent = activeAgents.get(roomName);
    if (agent) {
      await agent.disconnect();
      activeAgents.delete(roomName);
    }

    return NextResponse.json({
      success: true,
      message: "Voice call ended successfully",
    });
  } catch (error) {
    console.error("Failed to end voice call:", error);
    return NextResponse.json(
      { error: "Failed to end voice call" },
      { status: 500 }
    );
  }
}

async function handleJoinCall(roomName: string) {
  // Redirect to get-token functionality
  return handleGetToken(roomName);
}

export async function GET(request: NextRequest) {
  try {
    const roomName = request.nextUrl.searchParams.get("roomName");

    if (roomName) {
      const agent = activeAgents.get(roomName);
      return NextResponse.json({
        active: !!agent,
        roomName,
      });
    }

    // Return list of active rooms
    const activeRooms = Array.from(activeAgents.keys());
    return NextResponse.json({
      activeRooms,
      count: activeRooms.length,
    });
  } catch (error) {
    console.error("Failed to get voice call status:", error);
    return NextResponse.json(
      { error: "Failed to get status" },
      { status: 500 }
    );
  }
}

// API endpoint to relay supervisor responses back to voice calls
export async function PUT(request: NextRequest) {
  try {
    const { roomName, supervisorResponse, escalationId } = await request.json();

    if (!roomName || !supervisorResponse) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const agent = activeAgents.get(roomName);
    if (!agent) {
      return NextResponse.json(
        { error: "Voice call not found or ended" },
        { status: 404 }
      );
    }

    // Relay response back to customer via voice
    await agent.relaySupervisorResponse(supervisorResponse);

    // Mark escalation as resolved if provided
    if (escalationId) {
      await prisma.escalation.update({
        where: { id: escalationId },
        data: {
          resolved: true,
          resolvedAt: new Date(),
          supervisorNote: supervisorResponse,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Response relayed to customer",
    });
  } catch (error) {
    console.error("Failed to relay supervisor response:", error);
    return NextResponse.json(
      { error: "Failed to relay response" },
      { status: 500 }
    );
  }
}
