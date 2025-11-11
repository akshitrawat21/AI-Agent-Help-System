import { NextApiRequest } from "next";
import { NextApiResponseServerIO, initSocketIO } from "@/lib/websocket-server";

export default function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIO
) {
  if (!res.socket.server.io) {
    console.log("🔌 Setting up Socket.IO...");
    const io = initSocketIO(res.socket.server);
    res.socket.server.io = io;
  } else {
    console.log("🔌 Socket.IO already running");
  }

  res.end();
}
