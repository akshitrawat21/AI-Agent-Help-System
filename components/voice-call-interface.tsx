"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Phone, PhoneOff, Loader2 } from "lucide-react";
import { Room, RoomEvent } from "livekit-client";

interface VoiceCallProps {
  onEscalation?: (message: string) => void;
  onFallbackToChat?: (message: string) => void;
  showFallbackButton?: boolean; // Controls whether to show internal fallback button
}

export default function VoiceCallInterface({
  onEscalation,
  onFallbackToChat,
  showFallbackButton = true,
}: VoiceCallProps) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [agentStatus, setAgentStatus] = useState<
    "ready" | "listening" | "processing" | "speaking"
  >("ready");

  const roomRef = useRef<Room | null>(null);
  const callStartTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [lastCustomerMessage, setLastCustomerMessage] = useState<string>("");
  const [agentResponse, setAgentResponse] = useState<string>("");
  const [micPermission, setMicPermission] = useState<boolean | null>(null);
  const [voiceConversationId, setVoiceConversationId] = useState<string>("");
  const [recordingCountdown, setRecordingCountdown] = useState<number>(0);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, []);

  const startCall = async () => {
    try {
      setIsConnecting(true);

      // Generate conversation ID for this voice call session
      const conversationId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setVoiceConversationId(conversationId);

      // Request microphone permission
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicPermission(true);
      } catch (error) {
        setMicPermission(false);
        alert(
          "Microphone access is required for voice calls. Please allow microphone access and try again."
        );
        setIsConnecting(false);
        return;
      }

      // Start voice agent and create room
      const response = await fetch("/api/livekit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start-call",
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        if (response.status === 503 && responseData.setup) {
          throw new Error(
            `LiveKit Configuration Required: ${responseData.message}. ${responseData.setup}`
          );
        }
        throw new Error(responseData.error || "Failed to start call");
      }
      setRoomName(responseData.roomName);

      // Get customer token to join room
      const tokenResponse = await fetch("/api/livekit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get-token",
          roomName: responseData.roomName,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        throw new Error(tokenData.error || "Failed to get access token");
      }

      // Connect to LiveKit room as customer
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      roomRef.current = room;

      // Set up room event listeners
      room.on(RoomEvent.Connected, () => {
        console.log("🔗 Connected to salon voice system");
        setIsCallActive(true);
        setIsConnecting(false);
        setAgentStatus("listening");

        // Start call timer
        callStartTimeRef.current = Date.now();
        durationIntervalRef.current = setInterval(() => {
          setCallDuration(
            Math.floor((Date.now() - callStartTimeRef.current) / 1000)
          );
        }, 1000);
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log("📞 Disconnected from salon");
        handleEndCall();
      });

      room.on(RoomEvent.ParticipantConnected, (participant) => {
        if (participant.identity === "salon-ai-agent") {
          console.log("🤖 AI Agent joined the call");
        }
      });

      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (
          track.kind === "audio" &&
          participant.identity === "salon-ai-agent"
        ) {
          setAgentStatus("speaking");
          // Agent is speaking, customer should listen
          setTimeout(() => setAgentStatus("listening"), 3000); // Mock duration
        }
      });

      // Connect to room
      await room.connect(tokenData.wsUrl, tokenData.token);

      // Enable microphone for customer
      await room.localParticipant.setMicrophoneEnabled(true);

      setIsCallActive(true);
      setIsConnecting(false);
      callStartTimeRef.current = Date.now();

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setCallDuration(
          Math.floor((Date.now() - callStartTimeRef.current) / 1000)
        );
      }, 1000);

      // Start voice conversation after connection
      setTimeout(async () => {
        setAgentStatus("speaking");
        const greeting =
          "Hi! Welcome to Bella's Salon. How can I help you today?";
        setAgentResponse(greeting);

        // Speak the greeting
        await speakResponse(greeting);

        // After greeting, ready to listen for customer
        setAgentStatus("listening");
      }, 1000);
    } catch (error) {
      console.error("Failed to start call:", error);
      setIsConnecting(false);
      alert("Failed to connect to salon. Please try again.");
    }
  };

  const endCall = async () => {
    if (roomRef.current) {
      await roomRef.current.disconnect();
    }

    if (roomName) {
      try {
        await fetch("/api/livekit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "end-call",
            roomName,
          }),
        });
      } catch (error) {
        console.error("Failed to end call:", error);
      }
    }

    handleEndCall();
  };

  const handleEndCall = () => {
    setIsCallActive(false);
    setIsConnecting(false);
    setRoomName(null);
    setCallDuration(0);
    setAgentStatus("ready");

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  const toggleMute = async () => {
    if (roomRef.current) {
      const enabled = !isMuted;
      await roomRef.current.localParticipant.setMicrophoneEnabled(enabled);
      setIsMuted(!enabled);
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Start recording speech
  const startRecording = () => {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      alert("Speech recognition not supported in this browser");
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true; // Keep recording until stopped
    recognition.interimResults = true; // Show interim results
    recognition.lang = "en-US";

    recognition.onstart = () => {
      console.log("🎤 Recording started...");
      setIsRecording(true);
      setLastCustomerMessage("Listening...");
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      // Show interim results while speaking
      if (interimTranscript) {
        setLastCustomerMessage(interimTranscript);
      }
      if (finalTranscript) {
        setLastCustomerMessage((prev) =>
          prev === "Listening..."
            ? finalTranscript.trim()
            : prev + " " + finalTranscript.trim()
        );
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
      setAgentResponse(`Error: ${event.error}. Please try again.`);
    };

    recognition.onend = () => {
      console.log("🎤 Recording ended");
      setIsRecording(false);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (error) {
      console.error("Failed to start recognition:", error);
      setIsRecording(false);
    }
  };

  // Stop recording and process the speech
  const stopRecording = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);

      // Wait a bit for final results
      setTimeout(async () => {
        const transcript = lastCustomerMessage
          .replace("Listening...", "")
          .trim();

        if (!transcript) {
          setAgentResponse("I didn't hear anything. Please try again.");
          await speakResponse("I didn't hear anything. Please try again.");
          setAgentStatus("listening");
          return;
        }

        console.log("✅ Customer said:", transcript);

        // Process the transcript
        setAgentStatus("processing");

        // Get AI response
        const aiResult = await getAIResponse(transcript);
        setAgentResponse(aiResult.response);

        if (aiResult.shouldEscalate || aiResult.confidence < 0.6) {
          // Low confidence - fallback to chat
          setAgentStatus("ready");

          // Speak farewell message before transferring
          await speakResponse(
            "Let me transfer you to our chat system for better assistance with your question."
          );

          if (onFallbackToChat) {
            onFallbackToChat(transcript);
          }
          handleEndCall(); // End voice call and redirect to chat
        } else {
          // AI can handle it - respond via voice
          setAgentStatus("speaking");

          // Speak the AI response
          await speakResponse(aiResult.response);

          // Ready for next voice input
          setAgentStatus("listening");
        }
      }, 500);
    }
  };

  // Text-to-speech for AI responses
  const speakResponse = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window)) {
        console.log("Text-to-speech not supported, showing text only");
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      speechSynthesis.speak(utterance);
    });
  };

  // Process AI response for salon questions
  const getAIResponse = async (
    customerMessage: string
  ): Promise<{
    response: string;
    shouldEscalate: boolean;
    confidence: number;
  }> => {
    try {
      // Call the existing chat API to get AI response
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: customerMessage,
          conversationId: voiceConversationId, // Use the stored conversation ID
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();

      // Handle error responses from the API
      if (data.error) {
        throw new Error(data.error);
      }

      console.log("🎤 Voice AI Response:", data);

      return {
        response: data.message.content,
        shouldEscalate:
          data.message.isEscalated || data.message.confidence < 0.6,
        confidence: data.message.confidence,
      };
    } catch (error) {
      console.error("Failed to get AI response:", error);
      return {
        response:
          "I'm having trouble processing your request. Let me connect you with our team.",
        shouldEscalate: true,
        confidence: 0.1,
      };
    }
  };

  const getStatusColor = (status: typeof agentStatus) => {
    switch (status) {
      case "ready":
        return "bg-gray-100 text-gray-700 border border-gray-300";
      case "listening":
        return "bg-blue-50 text-blue-700 border border-blue-300";
      case "processing":
        return "bg-gray-100 text-gray-700 border border-gray-300";
      case "speaking":
        return "bg-gray-100 text-gray-700 border border-gray-300";
      default:
        return "bg-gray-100 text-gray-700 border border-gray-300";
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="text-center pb-4 border-b border-gray-100">
          <CardTitle className="text-xl font-semibold text-gray-900">
            Bella's Salon
          </CardTitle>
          <p className="text-gray-600 text-sm">Voice Assistant</p>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {/* Enhanced Status Display */}
          <div className="text-center space-y-3">
            <div className="relative">
              <Badge
                className={`px-4 py-2 text-base font-medium ${getStatusColor(
                  agentStatus
                )} border-2`}
              >
                {agentStatus === "ready" && "Ready to Call"}
                {agentStatus === "listening" && "Listening..."}
                {agentStatus === "processing" && "Processing..."}
                {agentStatus === "speaking" && "AI Speaking..."}
              </Badge>
            </div>

            {isCallActive && (
              <div className="text-sm text-gray-600">
                Duration: {formatDuration(callDuration)}
              </div>
            )}
          </div>

          {/* Call Instructions */}
          {!isCallActive && !isConnecting && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-base font-medium text-gray-900 mb-2">
                Voice Assistant
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Talk naturally with our AI assistant for help with:
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                <div>• Appointments</div>
                <div>• Services</div>
                <div>• Pricing</div>
                <div>• Hours</div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Transfers to chat only if needed
              </p>
            </div>
          )}

          {/* Active Call Info */}
          {isCallActive && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="text-sm font-medium text-gray-900">
                  Connected
                </div>
              </div>
            </div>
          )}

          {/* Listening Prompt */}
          {isCallActive && agentStatus === "listening" && !isRecording && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-center">
              <p className="text-sm font-medium text-gray-900">
                Click "Start Speaking" to ask your question
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Click "Stop Speaking" when you're done
              </p>
            </div>
          )}

          {/* Recording Prompt */}
          {isCallActive && isRecording && (
            <div className="bg-red-50 border border-red-300 p-3 rounded-lg text-center animate-pulse">
              <p className="text-sm font-medium text-red-900">
                🎤 Recording... Speak now
              </p>
              <p className="text-xs text-red-600 mt-1">
                Click "Stop Speaking" when finished
              </p>
            </div>
          )}

          {/* Conversation Display */}
          {(lastCustomerMessage || agentResponse) && isCallActive && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Conversation
              </h4>
              <div className="space-y-3 max-h-40 overflow-y-auto">
                {lastCustomerMessage && (
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">
                      You:
                    </p>
                    <p className="text-sm text-gray-900">
                      "{lastCustomerMessage}"
                    </p>
                  </div>
                )}
                {agentResponse && (
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">
                      AI:
                    </p>
                    <p className="text-sm text-gray-900">{agentResponse}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Call Controls */}
          <div className="flex justify-center space-x-4">
            {!isCallActive ? (
              <Button
                onClick={startCall}
                disabled={isConnecting}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full flex items-center space-x-2"
              >
                <Phone className="w-5 h-5" />
                <span>{isConnecting ? "Connecting..." : "Call Salon"}</span>
              </Button>
            ) : (
              <>
                <Button
                  onClick={toggleMute}
                  variant={isMuted ? "destructive" : "outline"}
                  className="rounded-full p-3"
                >
                  {isMuted ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </Button>

                {agentStatus === "listening" && !isRecording && (
                  <Button
                    onClick={startRecording}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full flex items-center space-x-2"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Start Speaking</span>
                  </Button>
                )}

                {isRecording && (
                  <Button
                    onClick={stopRecording}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full flex items-center space-x-2 animate-pulse"
                  >
                    <MicOff className="w-4 h-4" />
                    <span>Stop Speaking</span>
                  </Button>
                )}

                {agentStatus === "processing" && (
                  <Button
                    disabled
                    className="bg-yellow-500 text-white px-6 py-3 rounded-full flex items-center space-x-2 opacity-80"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </Button>
                )}

                <Button
                  onClick={endCall}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-full p-3"
                >
                  <PhoneOff className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>

          {/* Fallback to Text Chat */}
          {!isCallActive && showFallbackButton && (
            <div className="text-center border-t pt-4">
              <p className="text-xs text-blue-500 mb-2">
                Prefer text? Use our chat system below
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = "/chat")}
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                Switch to Text Chat
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
