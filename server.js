const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  // Initialize Socket.IO
  const io = new Server(server, {
    path: "/api/socketio",
    addTrailingSlash: false,
    cors: {
      origin: dev ? ["http://localhost:3000"] : false,
      methods: ["GET", "POST"],
    },
  });

  // Store io instance globally for API routes
  global.io = io;

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

  server
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log("🔌 Socket.IO server initialized");
    });
});
