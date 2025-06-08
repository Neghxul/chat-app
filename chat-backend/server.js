// backend/server.js
const { createServer } = require("http");
const { Server: IOServer } = require("socket.io");

const PORT = parseInt(process.env.PORT, 10) || 3000;

// 1) Creamos un HTTP server con un handler básico
const httpServer = createServer((req, res) => {
  // si es un GET a la raíz, devolvemos 200
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
  } else {
    // para cualquier otra ruta, también cerramos la conexión
    res.writeHead(404);
    res.end();
  }
});

// 2) Montamos Socket.io sobre ese mismo servidor
const io = new IOServer(httpServer, {
  path: "/socket.io",
  cors: { origin: "*" },
});

const users = {};
io.on("connection", socket => {
  /* ... tu lógica de join, messages, disconnect ... */
});

httpServer.listen(PORT, () => {
  console.log(`WebSocket backend listening on http://0.0.0.0:${PORT}`);
});
