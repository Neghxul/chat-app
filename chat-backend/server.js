const { createServer } = require("http");
const next = require("next");
const { parse } = require("url");
const { Server: IOServer } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
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

  const io = new IOServer(server, {
    path: "/socket.io",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // users: socket.id -> nickname
  const users = {};

  io.on("connection", (socket) => {
    console.log("⚡️ New socket connected:", socket.id);

    // Cuando el cliente emite "join"
    socket.on("join", (nickname) => {
      // 1) Validar si ya existe ese nickname en users
      const nicknamesEnUso = Object.values(users);
      if (nicknamesEnUso.includes(nickname)) {
        // Emitir un evento de error solo a este socket
        socket.emit("joinError", "Nickname already in use. Choose another.");
        return;
      }

      // 2) Si no existe, registrar normalmente
      users[socket.id] = nickname;
      io.emit("userList", Object.values(users));
      io.emit("systemMessage", `${nickname} joined the chat.`);
    });

    socket.on("sendMessage", (message) => {
      const sender = users[socket.id] || "Anonymous";
      const payload = {
        sender,
        content: message,
        timestamp: Date.now(),
      };
      io.emit("newMessage", payload);
    });

    socket.on("privateMessage", ({ to, content }) => {
      const sender = users[socket.id];
      if (!sender) return;
      const recipientSocketId = Object.entries(users).find(
        ([id, nick]) => nick === to
      )?.[0];
      if (recipientSocketId) {
        const payload = {
          sender,
          content,
          timestamp: Date.now(),
          recipient: to,
        };
        io.to(recipientSocketId).emit("newPrivateMessage", payload);
        socket.emit("newPrivateMessage", payload);
      }
    });

    socket.on("disconnect", () => {
      const nickname = users[socket.id];
      if (nickname) {
        delete users[socket.id];
        io.emit("userList", Object.values(users));
        io.emit("systemMessage", `${nickname} left the chat.`);
      }
    });
  });

  const PORT = parseInt(process.env.PORT || "3000", 10);
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Server listening on http://localhost:${PORT}`);
  });
});
