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
    console.log("[AI] send() called with:", { text, clean, sessionId });
    if (!clean) {
      console.log("[AI] send() aborted — empty message");
      return;
    }
    setMessages((prev) => [...prev, { id: nextId(), role: "user", text: clean }]);
    setSending(true);

    try {
      console.log("[AI] POST /api/chat →", { message: clean, sessionId });
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: clean, sessionId }),
      });
      console.log("[AI] /api/chat status:", res.status, res.ok);
      const data = await res.json();
      console.log("[AI] /api/chat response body:", data);
      const reply =
        typeof data?.reply === "string" && data.reply
          ? data.reply
          : "Sorry, I'm having trouble responding right now. Please try again.";
      console.log("[AI] resolved reply:", reply);
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", text: reply },
      ]);
    } catch (err) {
      console.error("[AI] send() failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          text: "I couldn't reach the assistant. Please check your connection and try again.",
        },
      ]);
    } finally {
      console.log("[AI] send() done — sending=false");
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
