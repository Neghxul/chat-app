// backend/server.js
const { createServer } = require("http");
const next = require("next");
const { parse } = require("url");
const { Server: IOServer } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // 1) HTTP server que responde tanto a Next como a websockets
  const server = createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    } catch (err) {
      console.error("❌ Error handling request:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  // 2) Montamos Socket.io
  const io = new IOServer(server, {
    path: "/socket.io",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // 3) Mapa de usuarios y validación de nicknames
  const users = {};

  io.on("connection", (socket) => {
    console.log("⚡️ New socket connected:", socket.id);

    socket.on("join", (nickname) => {
      const used = Object.values(users);
      if (used.includes(nickname)) {
        socket.emit("joinError", "Nickname already in use. Choose another.");
        return;
      }
      users[socket.id] = nickname;
      io.emit("userList", Object.values(users));
      io.emit("systemMessage", `${nickname} joined the chat.`);
    });

    socket.on("sendMessage", (message) => {
      const sender = users[socket.id] || "Anonymous";
      io.emit("newMessage", {
        sender,
        content: message,
        timestamp: Date.now(),
      });
    });

    socket.on("privateMessage", ({ to, content }) => {
      const sender = users[socket.id];
      const recipientId = Object.entries(users).find(([, nick]) => nick === to)?.[0];
      if (recipientId) {
        const payload = { sender, content, timestamp: Date.now(), recipient: to };
        io.to(recipientId).emit("newPrivateMessage", payload);
        socket.emit("newPrivateMessage", payload);
      }
    });

    socket.on("disconnect", () => {
      const nick = users[socket.id];
      if (nick) {
        delete users[socket.id];
        io.emit("userList", Object.values(users));
        io.emit("systemMessage", `${nick} left the chat.`);
      }
    });
  });

  // 4) Arrancamos en el puerto que Render provee
  const PORT = parseInt(process.env.PORT || "3000", 10);
  server.listen(PORT, () => {
    console.log(`> Server listening on http://localhost:${PORT}`);
  });
});
