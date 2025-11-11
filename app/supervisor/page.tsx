"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useWebSocket } from "@/hooks/use-websocket";

interface Escalation {
  id: string;
  conversationId: string;
  agentResponse: string;
  reason: string;
  resolved: boolean;
  messages: { id: string; role: string; content: string }[];
}

export default function SupervisorDashboard() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
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
    fetchEscalations();

    // Set up WebSocket event listeners
    onNewEscalation((newEscalation) => {
      console.log(
        "🚨 New escalation received via WebSocket:",
        newEscalation.id
      );
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
    });

    // Join supervisor room after a short delay to ensure connection is established
    const timer = setTimeout(() => {
      joinSupervisorRoom();
    }, 1000);

    return () => {
      clearTimeout(timer);
      leaveSupervisorRoom();
      offNewEscalation();
      offEscalationResolved();
    };
  }, []);

  const fetchEscalations = async () => {
    try {
      const response = await fetch("/api/escalations");

      if (!response.ok) {
        console.error("Failed to fetch escalations: HTTP", response.status);
        setEscalations([]);
        return;
      }

      const data = await response.json();

      if (data.error) {
        console.error("API error:", data.error);
        setEscalations([]);
      } else if (data && Array.isArray(data.escalations)) {
        setEscalations(data.escalations);
      } else {
        console.error("API returned unexpected data format:", data);
        setEscalations([]);
      }
    } catch (error) {
      console.error("Failed to fetch escalations:", error);
      setEscalations([]);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    pending: escalations.filter((e) => !e.resolved).length,
    resolved: escalations.filter((e) => e.resolved).length,
    total: escalations.length,
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-blue-900 mb-2">
                Supervisor Dashboard
              </h1>
              <p className="text-blue-700">
                Monitor and respond to escalated customer conversations
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={isConnected ? "default" : "destructive"}
                className="animate-pulse"
              >
                {isConnected ? "🔗 Live" : "🔴 Offline"}
              </Badge>
              {newEscalationAlert && (
                <Badge variant="destructive" className="animate-bounce">
                  🚨 New Escalation!
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/knowledge-base">
              <Button
                className="bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
                size="sm"
              >
                Knowledge Base
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white border-2 border-blue-200 hover:border-blue-400 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">
                Pending Escalations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.pending}
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Need supervisor response
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-blue-200 hover:border-blue-400 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">
                Resolved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.resolved}
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Completed escalations
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-blue-200 hover:border-blue-400 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">
                {stats.total}
              </div>
              <p className="text-xs text-blue-600 mt-1">All escalations</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Action */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="bg-white border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">
                Escalated Conversations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-600">
                    Pending escalations requiring attention
                  </span>
                  {stats.pending > 0 && (
                    <Badge variant="destructive" className="animate-pulse">
                      {stats.pending} New
                    </Badge>
                  )}
                </div>
                <Link href="/supervisor/escalations">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    size="lg"
                  >
                    {stats.pending > 0
                      ? `Review ${stats.pending} Escalation${
                          stats.pending > 1 ? "s" : ""
                        }`
                      : "View All Escalations"}
                  </Button>
                </Link>
                <p className="text-xs text-blue-600">
                  Real-time monitoring • Auto-refresh every 5 seconds
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-blue-600">Loading escalations...</p>
              ) : escalations.length === 0 ? (
                <p className="text-sm text-blue-600">
                  No escalations yet. The chat system will escalate
                  conversations with low confidence scores.
                </p>
              ) : (
                <div className="space-y-3">
                  {escalations.slice(0, 3).map((esc) => (
                    <div
                      key={esc.id}
                      className="flex items-center justify-between py-2 border-b-2 border-blue-100 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          {esc.reason}
                        </p>
                        <p className="text-xs text-blue-600">
                          {esc.messages.length} messages
                        </p>
                      </div>
                      <Badge
                        variant={esc.resolved ? "secondary" : "destructive"}
                      >
                        {esc.resolved ? "Resolved" : "Pending"}
                      </Badge>
                    </div>
                  ))}
                  {escalations.length > 3 && (
                    <Link href="/supervisor/escalations">
                      <Button
                        className="w-full mt-2 bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50"
                        size="sm"
                      >
                        View all {escalations.length} escalations
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
