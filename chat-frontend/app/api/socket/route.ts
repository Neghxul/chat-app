// app/api/socket/route.ts
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Server as HTTPServer } from "http";
import { Server as IOServer } from "socket.io";

// Asegúrate de declarar esto para que Next use Node.js y no Edge
export const runtime = "nodejs";

interface UserMap {
  [socketId: string]: string;
}

// Mantén el mapa de usuarios en memoria (o reinícialo cuando reinicie el servidor)
let users: UserMap = {};

export async function GET(req: NextRequest) {
  // Esta llamada crea la respuesta por defecto y nos da acceso a res.socket.server
  const res = NextResponse.next();

  // @ts-ignore: le decimos a TypeScript que confíe en que existe res.socket.server
  const server = (res as any).socket?.server as HTTPServer & { io?: IOServer };

  if (server && !server.io) {
    // Si aún no hemos inicializado io, lo creamos
    const io = new IOServer(server, {
      path: "/api/socket", // debe coincidir con lo que usa el cliente
      cors: {
        origin: "*",
      },
    });

    // Guardamos la instancia para que no se vuelva a inicializar
    server.io = io;

    io.on("connection", (socket) => {
      // Cuando un cliente envía "join"
      socket.on("join", (nickname: string) => {
        users[socket.id] = nickname;
        // Emitimos la lista actualizada a todos
        io.emit("userList", Object.values(users));
        // Mensaje del sistema
        io.emit("systemMessage", `${nickname} joined the chat.`);
      });

      // Cuando un cliente envía un mensaje de grupo
      socket.on("sendMessage", (message: string) => {
        const sender = users[socket.id] || "Anonymous";
        const payload = {
          sender,
          content: message,
          timestamp: Date.now(),
        };
        io.emit("newMessage", payload);
      });

      // Cuando un cliente envía mensaje privado
      socket.on(
        "privateMessage",
        ({ to, content }: { to: string; content: string }) => {
          const sender = users[socket.id];
          if (!sender) return;
          // Buscamos el socketId del destinatario
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
            // Emitir solo al destinatario
            io.to(recipientSocketId).emit("newPrivateMessage", payload);
            // Y también al emisor (para mostrarlo en su ventana privada)
            socket.emit("newPrivateMessage", payload);
          }
        }
      );

      // Cuando se desconecta un socket
      socket.on("disconnect", () => {
        const nickname = users[socket.id];
        if (nickname) {
          delete users[socket.id];
          io.emit("userList", Object.values(users));
          io.emit("systemMessage", `${nickname} left the chat.`);
        }
      });
    });

    console.log("✅ Socket.io server initialized");
  }

  return res;
}
