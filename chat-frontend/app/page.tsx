// app/page.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [nickname, setNickname] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Si ya existe un nickname en sessionStorage, redirige directo al chat
    const saved = sessionStorage.getItem("chat_nickname");
    if (saved) {
      router.replace("/chat");
    }
  }, [router]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) return;
    sessionStorage.setItem("chat_nickname", trimmed);
    router.push("/chat");
  };

  return (
    <main className="flex items-center justify-center h-screen bg-gray-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm"
      >
        <h1 className="text-2xl mb-4">Enter a Nickname</h1>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Your nickname"
          className="border border-gray-300 p-2 w-full rounded mb-4"
          required
        />
        <button
          type="submit"
          className="bg-blue-500 text-white py-2 px-4 rounded w-full hover:bg-blue-600"
        >
          Join Chat
        </button>
      </form>
    </main>
  );
}
