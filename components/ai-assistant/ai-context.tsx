"use client";

import { createContext, useCallback, useContext, useState } from "react";

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

interface AIContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
  messages: AIMessage[];
  sending: boolean;
  send: (text: string) => void;
}

const AIContext = createContext<AIContextValue | null>(null);

let idSeq = 0;
const nextId = () => `m${++idSeq}`;

// Stable per-tab id so the n8n workflow can keep conversation memory.
const sessionId = `web-${idSeq}-${Math.floor(Date.now())}`;

export function AIProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [sending, setSending] = useState(false);

  const send = useCallback(async (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setMessages((prev) => [...prev, { id: nextId(), role: "user", text: clean }]);
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: clean, sessionId }),
      });
      const data = await res.json();
      const reply =
        typeof data?.reply === "string" && data.reply
          ? data.reply
          : "Sorry, I'm having trouble responding right now. Please try again.";
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", text: reply },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          text: "I couldn't reach the assistant. Please check your connection and try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }, []);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  return (
    <AIContext.Provider value={{ open, setOpen, toggle, messages, sending, send }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const ctx = useContext(AIContext);
  if (!ctx) throw new Error("useAI must be used within AIProvider");
  return ctx;
}
