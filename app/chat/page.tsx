"use client";

import { useState } from "react";
import { LiveChat } from "@/components/live-chat";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import VoiceCallInterface from "@/components/voice-call-interface";

export default function ChatPage() {
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [fallbackMessage, setFallbackMessage] = useState<string>("");
  const [currentMode, setCurrentMode] = useState<"voice" | "chat">("voice");

  const startNewChat = () => {
    setConversationId(undefined);
    setFallbackMessage("");
    setCurrentMode("chat");
  };

  const handleConversationStart = (id: string) => {
    setConversationId(id);
  };

  const handleVoiceFallback = (message: string) => {
    // When voice call falls back to chat, start a new chat with the message
    setFallbackMessage(message);
    setConversationId(undefined); // Start new conversation
    setCurrentMode("chat"); // Switch to chat mode

    // Show a brief notification
    alert(
      "AI agent needs help with your question. Transferring to text chat for better assistance!"
    );
  };

  const handleBackToVoice = () => {
    setCurrentMode("voice");
    setFallbackMessage("");
    setConversationId(undefined);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">
            Contact Bella's Salon
          </h1>
          <p className="text-blue-600">
            {currentMode === "voice"
              ? "🎤 Start with a voice call - our AI will help or transfer you to chat if needed!"
              : "💬 Chat with our team - we're here to help with your questions!"}
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          {currentMode === "voice" ? (
            /* Voice Call Interface */
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-blue-900 text-center">
                Voice Call
              </h2>
              <VoiceCallInterface
                onFallbackToChat={handleVoiceFallback}
                onEscalation={(msg) => console.log("Escalated:", msg)}
                showFallbackButton={false}
              />
              <div className="text-center text-sm text-blue-500 space-y-1">
                <p>🎤 Speak naturally with our AI assistant</p>
                <p>📞 Get instant answers about appointments & services</p>
                <p>💬 Will transfer to chat if AI needs assistance</p>
              </div>

              <div className="text-center pt-4 border-t">
                <p className="text-xs text-blue-400 mb-2">
                  Prefer to type instead?
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={startNewChat}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  Switch to Text Chat
                </Button>
              </div>
            </div>
          ) : (
            /* Text Chat Interface */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-blue-900">
                  Text Chat
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBackToVoice}
                  className="text-blue-600 border-blue-300 hover:bg-blue-50"
                >
                  ← Back to Voice Call
                </Button>
              </div>

              <div className="bg-white rounded-lg border border-blue-200 shadow-lg">
                <div className="flex items-center justify-between p-4 border-b border-blue-100">
                  <h3 className="text-lg font-semibold text-blue-900">
                    Chat Support
                  </h3>
                  <Button
                    onClick={startNewChat}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    New Chat
                  </Button>
                </div>
                <div className="h-[500px]">
                  <LiveChat
                    conversationId={conversationId}
                    onConversationStart={handleConversationStart}
                    initialMessage={fallbackMessage}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
