"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

export const useWebSocket = () => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const initSocket = () => {
      // Connect to the socket
      socketRef.current = io("http://localhost:3000", {
        path: "/api/socketio",
        addTrailingSlash: false,
      });

      socketRef.current.on("connect", () => {
        console.log("🔌 Connected to WebSocket server:", socketRef.current?.id);
      });

      socketRef.current.on("disconnect", () => {
        console.log("🔌 Disconnected from WebSocket server");
      });

      socketRef.current.on("connect_error", (error) => {
        console.error("🔌 WebSocket connection error:", error);
      });
    };

    initSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const joinSupervisorRoom = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("join-supervisor");
      console.log("👨‍💼 Joined supervisor room for escalation notifications");
    } else if (socketRef.current) {
      // If not connected yet, wait for connection
      socketRef.current.once("connect", () => {
        socketRef.current?.emit("join-supervisor");
        console.log(
          "👨‍💼 Joined supervisor room for escalation notifications (after connect)"
        );
      });
    }
  };

  const leaveSupervisorRoom = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("leave-supervisor");
      console.log("👨‍💼 Left supervisor room");
    }
  };

  const onNewEscalation = (callback: (escalation: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on("new-escalation", callback);
    }
  };

  const onEscalationResolved = (
    callback: (data: { escalationId: string }) => void
  ) => {
    if (socketRef.current) {
      socketRef.current.on("escalation-resolved", callback);
    }
  };

  const offNewEscalation = () => {
    if (socketRef.current) {
      socketRef.current.off("new-escalation");
    }
  };

  const offEscalationResolved = () => {
    if (socketRef.current) {
      socketRef.current.off("escalation-resolved");
    }
  };

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected ?? false,
    joinSupervisorRoom,
    leaveSupervisorRoom,
    onNewEscalation,
    onEscalationResolved,
    offNewEscalation,
    offEscalationResolved,
  };
};
