import { Server as NetServer } from "http";
import { NextApiRequest } from "next";
import { Server as ServerIO } from "socket.io";
import { NextApiResponse } from "next";

export type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: ServerIO;
    };
  };
};

let io: ServerIO | undefined;

export const getSocketIO = (): ServerIO | undefined => {
  return io;
};

export const initSocketIO = (server: NetServer): ServerIO => {
  if (!io) {
    console.log("🔌 Initializing Socket.IO server...");
    io = new ServerIO(server, {
      path: "/api/socketio",
      addTrailingSlash: false,
      cors: {
        origin:
          process.env.NODE_ENV === "production"
            ? false
            : ["http://localhost:3000"],
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log(`🔗 Client connected: ${socket.id}`);

      // Join supervisor room for escalation notifications
      socket.on("join-supervisor", () => {
        socket.join("supervisors");
        console.log(`👨‍💼 Supervisor ${socket.id} joined supervisor room`);
      });

      // Leave supervisor room
      socket.on("leave-supervisor", () => {
        socket.leave("supervisors");
        console.log(`👨‍💼 Supervisor ${socket.id} left supervisor room`);
      });

      socket.on("disconnect", () => {
        console.log(`🔗 Client disconnected: ${socket.id}`);
      });
    });
  }

  return io;
};

export const notifyEscalation = (escalationData: any) => {
  const globalIo = (global as any).io;
  if (globalIo) {
    console.log(
      "🚨 Broadcasting new escalation to supervisors:",
      escalationData.id
    );
    globalIo.to("supervisors").emit("new-escalation", escalationData);
  } else {
    console.warn(
      "⚠️  Socket.IO instance not found - escalation notification not sent"
    );
  }
};

export const notifyEscalationResolved = (escalationId: string) => {
  const globalIo = (global as any).io;
  if (globalIo) {
    console.log(
      "✅ Broadcasting escalation resolved to supervisors:",
      escalationId
    );
    globalIo.to("supervisors").emit("escalation-resolved", { escalationId });
  } else {
    console.warn(
      "⚠️  Socket.IO instance not found - escalation resolved notification not sent"
    );
  }
};
