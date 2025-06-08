// app/chat/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "../../lib/socket";

type ChatMessage = {
  sender: string;
  content: string;
  timestamp: number;
  recipient?: string;
};

export default function ChatPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string>("");
  const [users, setUsers] = useState<string[]>([]);
  const [groupMessages, setGroupMessages] = useState<ChatMessage[]>([]);
  const [privateMessages, setPrivateMessages] = useState<ChatMessage[]>([]);
  const [currentChat, setCurrentChat] = useState<"group" | string>("group");
  const [newMessage, setNewMessage] = useState<string>("");
  const socketRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll automático al final
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [groupMessages, privateMessages, currentChat]);

  useEffect(() => {
    const saved = sessionStorage.getItem("chat_nickname");
    if (!saved) {
      router.replace("/");
      return;
    }
    setNickname(saved);

    const socket = getSocket();
    socketRef.current = socket;

    // 1) Emitir join y manejar posible error de nickname repetido
    socket.emit("join", saved);
    socket.on("joinError", (msg: string) => {
      alert(msg);
      // Limpiar y volver al login
      sessionStorage.removeItem("chat_nickname");
      router.replace("/");
    });

    // 2) Si el join fue exitoso, escuchar la lista de usuarios
    socket.on("userList", (updatedUsers: string[]) => {
      setUsers(updatedUsers);
    });

    // 3) Mensajes del sistema (join/leave)
    socket.on("systemMessage", (text: string) => {
      const sysMsg: ChatMessage = {
        sender: "System",
        content: text,
        timestamp: Date.now(),
      };
      setGroupMessages((prev) => [...prev, sysMsg]);
    });

    // 4) Mensajes de grupo
    socket.on("newMessage", (msg: ChatMessage) => {
      setGroupMessages((prev) => [...prev, msg]);
    });

    // 5) Mensajes privados
    socket.on("newPrivateMessage", (msg: ChatMessage) => {
      setPrivateMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.disconnect();
    };
  }, [router]);

  const handleSend = () => {
    const trimmed = newMessage.trim();
    if (!trimmed || !socketRef.current) return;

    if (currentChat === "group") {
      socketRef.current.emit("sendMessage", trimmed);
    } else {
      socketRef.current.emit("privateMessage", {
        to: currentChat,
        content: trimmed,
      });
    }
    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const renderedMessages =
    currentChat === "group"
      ? groupMessages
      : privateMessages.filter(
          (msg) =>
            (msg.sender === nickname && msg.recipient === currentChat) ||
            (msg.sender === currentChat && msg.recipient === nickname)
        );

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="px-4 py-4 border-b">
          <h2 className="text-xl font-bold">Connected Users</h2>
        </div>
        <div className="flex-grow overflow-y-auto">
          <ul>
            <li
              key="group"
              className={`px-4 py-2 cursor-pointer hover:bg-gray-200 ${
                currentChat === "group" ? "bg-gray-200" : ""
              }`}
              onClick={() => setCurrentChat("group")}
            >
              Group Chat
            </li>
            {users
              .filter((user) => user !== nickname)
              .map((user) => (
                <li
                  key={user}
                  className={`px-4 py-2 cursor-pointer hover:bg-gray-200 ${
                    currentChat === user ? "bg-gray-200" : ""
                  }`}
                  onClick={() => setCurrentChat(user)}
                >
                  {user}
                </li>
              ))}
          </ul>
        </div>
        <div className="px-4 py-4 border-t">
          <button
            className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600"
            onClick={() => {
              // Desconectar inmediatamente
              if (socketRef.current) {
                socketRef.current.disconnect();
              }
              sessionStorage.removeItem("chat_nickname");
              router.replace("/");
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Área de Chat */}
      <div className="flex-1 flex flex-col">
        <header className="px-6 py-4 bg-white border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {currentChat === "group"
              ? "Group Chat"
              : `Private with ${currentChat}`}
          </h2>
          <span className="text-gray-500">You are: {nickname}</span>
        </header>

        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50">
          {renderedMessages.map((msg, idx) => (
            <div key={idx} className="flex flex-col">
              <span className="text-sm text-gray-600">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {" • "}
                <strong>{msg.sender}</strong>
                {msg.recipient ? ` → ${msg.recipient}` : ""}
              </span>
              <span className="mt-1 text-gray-800">{msg.content}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-6 py-4 bg-white border-t flex">
          <textarea
            rows={1}
            className="flex-1 border border-gray-300 rounded px-3 py-2 mr-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            onClick={handleSend}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
