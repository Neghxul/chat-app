// lib/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  // Si no existe instancia O la existente está desconectada, creamos una nueva
  if (!socket || socket.disconnected) {
    // Si había una instancia anterior muerta, primero aseguramos que se borre:
    if (socket) {
      socket.off();     // quitamos todos los listeners
      socket.close();   // cerramos cualquier recurso pendiente
      socket = null;
    }

    // Creamos una nueva conexión (ajusta URL/path según tu entorno)
    //socket = io("http://localhost:3000", {
    //  path: "/socket.io",
    //});

    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      path: "/socket.io",
    });
  }
  return socket;
}
