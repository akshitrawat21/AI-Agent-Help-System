"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";

interface Escalation {
  id: string;
  conversationId: string;
  agentResponse: string;
  reason: string;
  messages: { id: string; role: string; content: string }[];
  resolved: boolean;
  timedOut: boolean;
}

export default function EscalationsPage() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEscalation, setSelectedEscalation] =
    useState<Escalation | null>(null);
  const [supervisorResponse, setSupervisorResponse] = useState("");
  const [responding, setResponding] = useState(false);
  const [lastEscalationCount, setLastEscalationCount] = useState(0);
  const [newEscalationAlert, setNewEscalationAlert] = useState(false);
  const {
    joinSupervisorRoom,
    leaveSupervisorRoom,
    onNewEscalation,
    onEscalationResolved,
    offNewEscalation,
    offEscalationResolved,
    isConnected,
  } = useWebSocket();

  useEffect(() => {
    loadEscalations();

    // Join supervisor room for WebSocket notifications
    joinSupervisorRoom();

    // Set up WebSocket event listeners
    onNewEscalation((newEscalation) => {
      console.log("� New escalation received via WebSocket:", newEscalation.id);
      setEscalations((prev) => [newEscalation, ...prev]);
      setNewEscalationAlert(true);
      // Clear alert after 5 seconds
      setTimeout(() => setNewEscalationAlert(false), 5000);
    });

    onEscalationResolved(({ escalationId }) => {
      console.log("✅ Escalation resolved via WebSocket:", escalationId);
      setEscalations((prev) =>
        prev.map((esc) =>
          esc.id === escalationId ? { ...esc, resolved: true } : esc
        )
      );
      // If the resolved escalation was selected, clear selection
      if (selectedEscalation?.id === escalationId) {
        setSelectedEscalation(null);
      }
    });

    return () => {
      leaveSupervisorRoom();
      offNewEscalation();
      offEscalationResolved();
    };
  }, []);

  const loadEscalations = async () => {
    try {
      const res = await fetch("/api/escalations");
      if (res.ok) {
        const data = await res.json();
        const newEscalations = data.escalations;

        // Check for new escalations
        if (
          newEscalations.length > lastEscalationCount &&
          lastEscalationCount > 0
        ) {
          console.log("🚨 New escalation detected!");
          setNewEscalationAlert(true);
          // Clear alert after 5 seconds
          setTimeout(() => setNewEscalationAlert(false), 5000);
        }

        setEscalations(newEscalations);
        setLastEscalationCount(newEscalations.length);
      }
    } catch (error) {
      console.error("Failed to load escalations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!selectedEscalation || !supervisorResponse.trim()) return;

    setResponding(true);
    try {
      const res = await fetch(
        `/api/escalations/${selectedEscalation.id}/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supervisorResponse,
          }),
        }
      );

      if (res.ok) {
        setSupervisorResponse("");
        setSelectedEscalation(null);
        loadEscalations();
      }
    } catch (error) {
      console.error("Failed to respond:", error);
    } finally {
      setResponding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-blue-900">
            Escalated Conversations
            {escalations.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {escalations.length}
              </Badge>
            )}
          </h1>
          <div className="flex items-center gap-3">
            <Badge
              variant={isConnected ? "default" : "destructive"}
              className="animate-pulse"
            >
              {isConnected ? "🔗 Live Connection" : "🔴 Offline"}
            </Badge>
            {newEscalationAlert && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded animate-bounce">
                🚨 New escalation received!
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Escalations List */}
          <div className="md:col-span-1">
            <div className="space-y-2">
              {escalations.length === 0 ? (
                <Card className="bg-white border-2 border-blue-200">
                  <CardContent className="pt-6">
                    <p className="text-blue-600">No escalations pending</p>
                  </CardContent>
                </Card>
              ) : (
                escalations.map((esc) => (
                  <Card
                    key={esc.id}
                    className={`cursor-pointer transition-all bg-white border-2 border-blue-200 hover:border-blue-400 ${
                      selectedEscalation?.id === esc.id
                        ? "ring-2 ring-blue-500"
                        : ""
                    }`}
                    onClick={() => setSelectedEscalation(esc)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-semibold text-sm truncate text-blue-900">
                            {esc.reason}
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            {esc.messages.length} messages
                          </p>
                        </div>
                        {!esc.resolved ? (
                          <Badge variant="destructive" className="text-xs">
                            New
                          </Badge>
                        ) : esc.timedOut ? (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-orange-100 text-orange-700"
                          >
                            Timed Out
                          </Badge>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Escalation Details */}
          {selectedEscalation && (
            <div className="md:col-span-2">
              <Card className="bg-white border-2 border-blue-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-blue-900">
                      Conversation Details
                    </CardTitle>
                    {selectedEscalation.timedOut && (
                      <Badge
                        variant="secondary"
                        className="bg-orange-100 text-orange-700"
                      >
                        Timed Out - No Supervisor Response
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Chat History */}
                  <div className="space-y-3 max-h-64 overflow-y-auto bg-blue-50 p-3 rounded border-2 border-blue-100">
                    {selectedEscalation.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-2 rounded ${
                          msg.role === "user"
                            ? "bg-blue-100"
                            : "bg-white border border-blue-200"
                        }`}
                      >
                        <p className="text-xs font-semibold mb-1 text-blue-700">
                          {msg.role === "user" ? "Customer" : "Agent"}
                        </p>
                        <p className="text-sm text-blue-900">{msg.content}</p>
                      </div>
                    ))}
                  </div>

                  {/* Agent Response */}
                  <div>
                    <p className="text-sm font-semibold mb-2 text-blue-900">
                      Agent's Response:
                    </p>
                    <p className="text-sm bg-blue-50 p-3 rounded border-2 border-blue-100 text-blue-900">
                      {selectedEscalation.agentResponse}
                    </p>
                  </div>

                  {/* Supervisor Response */}
                  <div>
                    <label className="text-sm font-semibold mb-2 block text-blue-900">
                      Your Response:
                    </label>
                    {selectedEscalation.timedOut && (
                      <div className="mb-2 p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-700">
                        This escalation was automatically marked as unresolved
                        after 2 minutes without a response.
                      </div>
                    )}
                    <Textarea
                      placeholder="Provide your response to send to the customer..."
                      value={supervisorResponse}
                      onChange={(e) => setSupervisorResponse(e.target.value)}
                      className="min-h-24 border-2 border-blue-200 focus:border-blue-400"
                      disabled={selectedEscalation.resolved}
                    />
                  </div>

                  {!selectedEscalation.resolved && (
                    <Button
                      onClick={handleRespond}
                      disabled={!supervisorResponse.trim() || responding}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {responding ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send Response"
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
