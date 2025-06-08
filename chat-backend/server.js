// backend/server.js

const { createServer } = require("http");
const { Server: IOServer } = require("socket.io");

const PORT = parseInt(process.env.PORT || "3000", 10);

// 1. Creamos un HTTP server vacío
const httpServer = createServer();

// 2. Montamos Socket.io sobre él
const io = new IOServer(httpServer, {
  path: "/socket.io",
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const users = {};

// 3. Definimos los eventos de Socket.io
io.on("connection", (socket) => {
  console.log("⚡️ Socket connected:", socket.id);

  socket.on("join", (nickname) => {
    const taken = Object.values(users).includes(nickname);
    if (taken) {
      socket.emit("joinError", "Nickname already in use");
      return;
    }
    users[socket.id] = nickname;
    io.emit("userList", Object.values(users));
    io.emit("systemMessage", `${nickname} joined the chat.`);
  });

  socket.on("sendMessage", (msg) => {
    const sender = users[socket.id] || "Anonymous";
    io.emit("newMessage", { sender, content: msg, timestamp: Date.now() });
  });

  socket.on("privateMessage", ({ to, content }) => {
    const sender = users[socket.id];
    const recipientId = Object.entries(users).find(([,nick]) => nick === to)?.[0];
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

// 4. Ponemos a escuchar
httpServer.listen(PORT, () => {
  console.log(`WebSocket backend listening on port ${PORT}`);
});
