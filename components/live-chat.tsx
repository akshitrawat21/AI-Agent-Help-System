"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, AlertCircle } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "agent" | "supervisor";
  content: string;
  confidence?: number;
  isEscalated?: boolean;
  createdAt: string;
}

interface LiveChatProps {
  initialMessage?: string;
  conversationId?: string;
  onConversationStart?: (id: string) => void;
}

export function LiveChat({
  conversationId,
  onConversationStart,
  initialMessage,
}: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationStatus, setConversationStatus] = useState<
    "open" | "escalated" | "resolved"
  >("open");
  const [lastMessageCount, setLastMessageCount] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [newSupervisorMessage, setNewSupervisorMessage] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle initial message from voice call fallback
  useEffect(() => {
    if (initialMessage && !conversationId) {
      setInput(initialMessage);
      // Automatically send the message after a brief delay
      const timer = setTimeout(() => {
        const syntheticEvent = { preventDefault: () => {} } as React.FormEvent;
        sendMessage(syntheticEvent);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [initialMessage]);

  // Load existing messages if conversationId exists
  useEffect(() => {
    if (conversationId) {
      loadMessages();
    }
  }, [conversationId]);

  // Poll for new messages when conversation is escalated
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    console.log("🔄 Polling useEffect triggered:", {
      conversationId,
      conversationStatus,
      shouldPoll: conversationId && conversationStatus === "escalated",
    });

    if (conversationId && conversationStatus === "escalated") {
      setIsPolling(true);
      console.log("✅ Starting polling for conversation:", conversationId);

      // Poll every 2 seconds when escalated to check for supervisor responses
      interval = setInterval(async () => {
        console.log("🔄 Polling for updates...");
        await loadMessages();
      }, 2000);
    } else {
      setIsPolling(false);
      if (conversationStatus === "resolved") {
        console.log("✅ Conversation resolved, stopping polling");
      } else if (!conversationId) {
        console.log("❌ No conversationId available for polling");
      } else if (conversationStatus !== "escalated") {
        console.log(
          "❌ Conversation status is not escalated:",
          conversationStatus
        );
      }
    }

    return () => {
      if (interval) {
        console.log("Clearing polling interval");
        clearInterval(interval);
      }
    };
  }, [conversationId, conversationStatus]);

  const loadMessages = async () => {
    if (!conversationId) {
      console.log("No conversationId available for loading messages");
      return;
    }

    try {
      console.log("Loading messages for conversation:", conversationId);
      const res = await fetch(`/api/chat/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        const newMessages = data.messages;

        // Check if we have new messages from supervisor
        if (newMessages.length > lastMessageCount && lastMessageCount > 0) {
          const latestMessage = newMessages[newMessages.length - 1];
          if (latestMessage.role === "supervisor") {
            console.log(
              "🎉 Supervisor responded! New message:",
              latestMessage.content
            );
            setNewSupervisorMessage(true);
            // Clear the notification after 3 seconds
            setTimeout(() => setNewSupervisorMessage(false), 3000);
          }
        }

        setMessages(newMessages);
        setConversationStatus(data.status);
        setLastMessageCount(newMessages.length);

        console.log(
          "Messages loaded:",
          newMessages.length,
          "Status:",
          data.status
        );
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message: input,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);

        console.log("🔍 Chat response data:", {
          conversationId: data.conversationId,
          conversationStatus: data.conversationStatus,
          messageRole: data.message.role,
          isEscalated: data.message.isEscalated,
        });

        setConversationStatus(data.conversationStatus);

        // Set the conversationId when a new conversation is created
        if (!conversationId && data.conversationId && onConversationStart) {
          console.log("🆔 Setting new conversationId:", data.conversationId);
          onConversationStart(data.conversationId);
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Chat</h2>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              conversationStatus === "escalated"
                ? "destructive"
                : conversationStatus === "resolved"
                ? "secondary"
                : "default"
            }
          >
            {conversationStatus === "escalated"
              ? "Escalated to Supervisor"
              : conversationStatus === "resolved"
              ? "Supervisor Responded - Continue Chatting"
              : "Connected to Agent"}
          </Badge>
          {isPolling && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Waiting for supervisor...</span>
            </div>
          )}
        </div>
      </div>

      {/* Supervisor Response Notification */}
      {newSupervisorMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded text-sm">
          🎉 Supervisor has responded to your question!
        </div>
      )}

      {/* Messages Container */}
      <ScrollArea className="flex-1 border rounded-lg bg-card p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <p>Start a conversation...</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-2 rounded-lg ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : msg.role === "supervisor"
                      ? "bg-amber-100 text-amber-900"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold">
                      {msg.role === "supervisor"
                        ? "👤 Supervisor"
                        : msg.role === "agent"
                        ? "🤖 Agent"
                        : "You"}
                    </span>
                    {msg.isEscalated && <AlertCircle className="w-3 h-3" />}
                  </div>
                  <p className="text-sm">{msg.content}</p>
                  {msg.confidence !== undefined && (
                    <p className="text-xs mt-1 opacity-70">
                      Confidence: {(msg.confidence * 100).toFixed(0)}%
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input Form */}
      <form onSubmit={sendMessage} className="flex gap-2">
        <Input
          placeholder={
            conversationStatus === "resolved"
              ? "Continue the conversation..."
              : "Type your message..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="flex-1"
        />
        <Button disabled={loading} type="submit" size="icon">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
