import {
  Room,
  RoomEvent,
  LocalTrackPublication,
  RemoteTrackPublication,
  AudioTrack,
  TrackPublication,
} from "livekit-client";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

export interface LiveKitConfig {
  wsUrl: string;
  apiKey: string;
  apiSecret: string;
}

export interface SalonAgentOptions {
  roomName: string;
  participantName: string;
  onEscalation?: (message: string, audioData?: Blob) => void;
  onKnowledgeUpdate?: (question: string, answer: string) => void;
}

export class SalonVoiceAgent {
  private room: Room;
  private config: LiveKitConfig;
  private isConnected = false;
  private onEscalation?: (message: string, audioData?: Blob) => void;
  private onKnowledgeUpdate?: (question: string, answer: string) => void;

  constructor(config: LiveKitConfig) {
    this.config = config;
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
  }

  async initialize(options: SalonAgentOptions): Promise<void> {
    const { roomName, participantName, onEscalation, onKnowledgeUpdate } =
      options;

    this.onEscalation = onEscalation;
    this.onKnowledgeUpdate = onKnowledgeUpdate;

    // Generate access token
    const token = await this.generateAccessToken(roomName, participantName);

    // Set up event listeners
    this.setupEventListeners();

    // Connect to room
    await this.room.connect(this.config.wsUrl, token);
    this.isConnected = true;

    // Enable microphone for the agent
    await this.room.localParticipant.setMicrophoneEnabled(true);

    console.log("🎤 Salon Voice Agent connected to LiveKit room");
  }

  private async generateAccessToken(
    roomName: string,
    participantName: string
  ): Promise<string> {
    const at = new AccessToken(this.config.apiKey, this.config.apiSecret, {
      identity: participantName,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    return at.toJwt();
  }

  private setupEventListeners(): void {
    this.room.on(
      RoomEvent.TrackSubscribed,
      this.handleTrackSubscribed.bind(this)
    );
    this.room.on(
      RoomEvent.TrackUnsubscribed,
      this.handleTrackUnsubscribed.bind(this)
    );
    this.room.on(
      RoomEvent.ParticipantConnected,
      this.handleParticipantConnected.bind(this)
    );
    this.room.on(
      RoomEvent.ParticipantDisconnected,
      this.handleParticipantDisconnected.bind(this)
    );
    this.room.on(
      RoomEvent.AudioPlaybackStatusChanged,
      this.handleAudioPlayback.bind(this)
    );
  }

  private async handleTrackSubscribed(
    track: any,
    publication: any,
    participant: any
  ): Promise<void> {
    if (track.kind === "audio") {
      console.log("🎵 Audio track received from customer");

      // Convert audio to text and process with AI
      const audioTrack = track as AudioTrack;
      if (audioTrack) {
        await this.processIncomingAudio(audioTrack);
      }
    }
  }

  private handleTrackUnsubscribed(
    track: any,
    publication: any,
    participant: any
  ): void {
    console.log("🔇 Audio track unsubscribed");
  }

  private handleParticipantConnected(participant: any): void {
    console.log("👤 Customer connected to salon:", participant.identity);

    // Greet the customer
    this.speakToCustomer(
      "Hello! Welcome to Bella's Salon. How can I help you today?"
    );
  }

  private handleParticipantDisconnected(participant: any): void {
    console.log("👋 Customer disconnected:", participant.identity);
  }

  private handleAudioPlayback(): void {
    console.log("🔊 Audio playback status changed");
  }

  private async processIncomingAudio(audioTrack: AudioTrack): Promise<void> {
    try {
      // Simulate speech-to-text conversion
      // In a real implementation, you'd use a service like Deepgram, OpenAI Whisper, etc.
      const transcribedText = await this.speechToText(audioTrack);
      console.log("📝 Customer said:", transcribedText);

      // Process with salon AI agent
      const response = await this.processSalonQuery(transcribedText);

      if (response.shouldEscalate) {
        console.log("🚨 Escalating to human supervisor");
        this.speakToCustomer(
          "Let me check with my supervisor and get back to you right away."
        );

        // Trigger escalation callback
        if (this.onEscalation) {
          this.onEscalation(transcribedText);
        }
      } else {
        // Respond to customer
        this.speakToCustomer(response.message);

        // Update knowledge base if new information learned
        if (response.learnedAnswer && this.onKnowledgeUpdate) {
          this.onKnowledgeUpdate(transcribedText, response.message);
        }
      }
    } catch (error) {
      console.error("Error processing audio:", error);
      this.speakToCustomer(
        "I'm sorry, I had trouble understanding that. Could you please repeat?"
      );
    }
  }

  private async speechToText(audioTrack: AudioTrack): Promise<string> {
    // Mock implementation - replace with actual speech-to-text service
    const mockResponses = [
      "Hi, I'd like to book an appointment for a haircut",
      "What are your prices for hair coloring?",
      "Are you open on Sundays?",
      "Do you do nail services?",
      "I need to cancel my appointment",
      "What's your address?",
      "Do you offer wedding hair and makeup packages?",
    ];

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return mockResponses[Math.floor(Math.random() * mockResponses.length)];
  }

  private async processSalonQuery(query: string): Promise<{
    message: string;
    shouldEscalate: boolean;
    confidence: number;
    learnedAnswer?: boolean;
  }> {
    const lowerQuery = query.toLowerCase();

    // Salon-specific business logic
    const salonKnowledge = {
      appointments: {
        message:
          "I'd be happy to help you book an appointment! We're open Tuesday through Saturday, 9 AM to 7 PM, and Sundays 10 AM to 5 PM. You can book online or I can help you schedule right now. What service are you interested in?",
        confidence: 0.9,
      },
      pricing: {
        message:
          "Our haircut prices range from $45 to $85 depending on your stylist. Color services start at $80. Highlights begin at $120. Would you like specific pricing for a particular service?",
        confidence: 0.85,
      },
      hours: {
        message:
          "We're open Tuesday through Saturday from 9 AM to 7 PM, and Sundays from 10 AM to 5 PM. We're closed on Mondays. Would you like to schedule an appointment?",
        confidence: 0.95,
      },
      services: {
        message:
          "We offer complete hair services including cuts, color, highlights, perms, and treatments. We also provide nail services, facials, and special event styling. What service interests you most?",
        confidence: 0.9,
      },
      location: {
        message:
          "We're located at 123 Beauty Street, downtown in the Fashion District. There's free parking in the lot behind our building. Do you need directions?",
        confidence: 0.95,
      },
      cancellation: {
        message:
          "I can help you with appointment changes. Please provide your name and appointment date, or you can call us directly at (555) 123-SALON for immediate assistance.",
        confidence: 0.8,
      },
    };

    // Check for known queries
    if (
      lowerQuery.includes("appointment") ||
      lowerQuery.includes("book") ||
      lowerQuery.includes("schedule")
    ) {
      return { ...salonKnowledge.appointments, shouldEscalate: false };
    } else if (
      lowerQuery.includes("price") ||
      lowerQuery.includes("cost") ||
      lowerQuery.includes("how much")
    ) {
      return { ...salonKnowledge.pricing, shouldEscalate: false };
    } else if (
      lowerQuery.includes("hours") ||
      lowerQuery.includes("open") ||
      lowerQuery.includes("close")
    ) {
      return { ...salonKnowledge.hours, shouldEscalate: false };
    } else if (
      lowerQuery.includes("service") ||
      lowerQuery.includes("nail") ||
      lowerQuery.includes("hair")
    ) {
      return { ...salonKnowledge.services, shouldEscalate: false };
    } else if (
      lowerQuery.includes("address") ||
      lowerQuery.includes("location") ||
      lowerQuery.includes("where")
    ) {
      return { ...salonKnowledge.location, shouldEscalate: false };
    } else if (
      lowerQuery.includes("cancel") ||
      lowerQuery.includes("reschedule") ||
      lowerQuery.includes("change")
    ) {
      return { ...salonKnowledge.cancellation, shouldEscalate: false };
    } else {
      // Unknown query - escalate to human
      return {
        message:
          "That's a great question! Let me connect you with one of our salon specialists who can give you the most accurate information.",
        shouldEscalate: true,
        confidence: 0.3,
      };
    }
  }

  private async speakToCustomer(message: string): Promise<void> {
    try {
      console.log("🗣️ Agent speaking:", message);

      // Convert text to speech and play
      // In a real implementation, you'd use a TTS service
      await this.textToSpeech(message);
    } catch (error) {
      console.error("Error speaking to customer:", error);
    }
  }

  private async textToSpeech(text: string): Promise<void> {
    // Mock implementation - replace with actual TTS service
    console.log("🔊 Playing TTS:", text);

    // Simulate TTS processing
    await new Promise((resolve) => setTimeout(resolve, text.length * 50));

    // In a real implementation, you would:
    // 1. Call TTS service (OpenAI, ElevenLabs, etc.)
    // 2. Get audio stream
    // 3. Publish audio track to room
    // 4. Play audio to customer
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.room.disconnect();
      this.isConnected = false;
      console.log("🔌 Salon Voice Agent disconnected");
    }
  }

  // Method to handle supervisor responses and relay back to customer
  async relaySupervisorResponse(response: string): Promise<void> {
    if (this.isConnected) {
      const message = `Great news! I got the information you needed: ${response}`;
      await this.speakToCustomer(message);
    }
  }

  // Method to create room for incoming calls
  static async createCallRoom(
    roomName: string,
    config: LiveKitConfig
  ): Promise<string> {
    const roomService = new RoomServiceClient(
      config.wsUrl.replace("ws://", "http://").replace("wss://", "https://"),
      config.apiKey,
      config.apiSecret
    );

    try {
      await roomService.createRoom({
        name: roomName,
        emptyTimeout: 10 * 60, // 10 minutes
        maxParticipants: 10,
      });
      console.log(`📞 Created call room: ${roomName}`);
      return roomName;
    } catch (error) {
      console.error("Failed to create room:", error);
      throw error;
    }
  }

  // Static method to generate access tokens
  static async generateAccessToken(
    roomName: string,
    participantName: string,
    config: LiveKitConfig
  ): Promise<string> {
    const accessToken = new AccessToken(config.apiKey, config.apiSecret, {
      identity: participantName,
    });

    accessToken.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    return await accessToken.toJwt();
  }
}

// Utility function to generate unique room names for calls
export function generateCallRoomName(): string {
  return `salon-call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Configuration for salon LiveKit setup
export const defaultSalonConfig: LiveKitConfig = {
  wsUrl:
    process.env.LIVEKIT_URL ||
    process.env.LIVEKIT_WS_URL ||
    "wss://salon-demo.livekit.cloud",
  apiKey: process.env.LIVEKIT_API_KEY || "",
  apiSecret: process.env.LIVEKIT_API_SECRET || "",
};

// Helper function to validate LiveKit configuration
export function validateLiveKitConfig(): {
  isValid: boolean;
  missingVars: string[];
} {
  const missingVars: string[] = [];

  if (!process.env.LIVEKIT_API_KEY) {
    missingVars.push("LIVEKIT_API_KEY");
  }

  if (!process.env.LIVEKIT_API_SECRET) {
    missingVars.push("LIVEKIT_API_SECRET");
  }

  if (!process.env.LIVEKIT_URL && !process.env.LIVEKIT_WS_URL) {
    missingVars.push("LIVEKIT_URL");
  }

  return {
    isValid: missingVars.length === 0,
    missingVars,
  };
}
