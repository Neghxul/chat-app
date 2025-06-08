// backend/server.js
const http = require("http");
const { Server: IOServer } = require("socket.io");

const PORT = parseInt(process.env.PORT, 10) || 3000;

// 1) HTTP server que responde al GET "/" para health-checks
const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
  } else {
    // 404 para cualquier otra ruta HTTP
    res.writeHead(404);
    res.end();
  }
});

// 2) Monta Socket.io sobre ese mismo server
const io = new IOServer(server, {
  path: "/socket.io",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// 3) Guarda socket.id → nickname y valida duplicados
const users = {};

io.on("connection", (socket) => {
  console.log("⚡️ Socket connected:", socket.id);

  socket.on("join", (nickname) => {
    // Si el nickname ya está en uso, avisamos solo a este socket
    if (Object.values(users).includes(nickname)) {
      socket.emit("joinError", "Nickname already in use. Choose another.");
      return;
    }
    // Si no, lo registramos y emitimos la lista
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
    const recipientId = Object.entries(users).find(
      ([, nick]) => nick === to
    )?.[0];
    if (recipientId) {
      const payload = { sender, content, timestamp: Date.now(), recipient: to };
      io.to(recipientId).emit("newPrivateMessage", payload);
      socket.emit("newPrivateMessage", payload);
    }
  });

  socket.on("sendImage", ({ to, data }) => {
  const sender = users[socket.id];
  const payload = { sender, image: data, timestamp: Date.now(), recipient: to };
  if (to === "group") {
    io.emit("newImage", payload);
  } else {
    const rid = Object.entries(users).find(([,n]) => n===to)?.[0];
    if (rid) {
      io.to(rid).emit("newPrivateImage", payload);
      socket.emit("newPrivateImage", payload);
    }
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

// 4) Arranca el servidor HTTP + WebSocket
server.listen(PORT, () => {
  console.log(`Backend listening on http://0.0.0.0:${PORT}`);
});
