"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export interface DMMessage {
  id: string;
  text: string;
  self?: boolean;
  time: string;
  edited?: boolean;
}

export interface DMConversation {
  id: string;
  name: string;
  initials: string;
  online?: boolean;
  messages: DMMessage[];
}

const SEED: DMConversation[] = [
  {
    id: "alex",
    name: "Alex Tan",
    initials: "AT",
    online: true,
    messages: [{ id: "seed-alex-1", text: "Wassup", self: false, time: "now" }],
  },
  {
    id: "sarah",
    name: "Sarah Tan",
    initials: "ST",
    messages: [
      { id: "seed-sarah-1", text: "Are you joining the cleanup drive this weekend?", self: false, time: "5 min ago" },
    ],
  },
  {
    id: "support",
    name: "Emergency Support",
    initials: "ES",
    online: true,
    messages: [
      { id: "seed-support-1", text: "This is AidPulse Emergency Support. How can we help you today?", self: false, time: "1 hr ago" },
    ],
  },
];

interface MessagesContextValue {
  conversations: DMConversation[];
  getConversation: (id: string) => DMConversation | undefined;
  addConversation: (conv: Omit<DMConversation, "messages"> & { messages?: DMMessage[] }) => void;
  sendMessage: (convId: string, text: string) => void;
  editMessage: (convId: string, msgId: string, text: string) => void;
  deleteMessage: (convId: string, msgId: string) => void;
}

const MessagesContext = createContext<MessagesContextValue | null>(null);
const STORAGE_KEY = "aidpulse:messages";
const nid = () => `m-${Math.random().toString(36).slice(2, 9)}`;

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<DMConversation[]>(SEED);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed: DMConversation[] = JSON.parse(saved);
      // Merge in any newly-seeded conversations missing from saved state.
      const merged = [...parsed];
      for (const s of SEED) if (!merged.some((c) => c.id === s.id)) merged.push(s);
      setConversations(merged);
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (next: DMConversation[]) => {
    setConversations(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const value = useMemo<MessagesContextValue>(() => {
    const mapConv = (convId: string, fn: (m: DMMessage[]) => DMMessage[]) =>
      persist(conversations.map((c) => (c.id === convId ? { ...c, messages: fn(c.messages) } : c)));

    return {
      conversations,
      getConversation: (id) => conversations.find((c) => c.id === id),
      // Idempotent: opening a DM for a friend who already has a thread is a no-op.
      addConversation: (conv) => {
        if (conversations.some((c) => c.id === conv.id)) return;
        persist([...conversations, { messages: [], ...conv }]);
      },
      sendMessage: (convId, text) =>
        mapConv(convId, (m) => [...m, { id: nid(), text, self: true, time: "now" }]),
      editMessage: (convId, msgId, text) =>
        mapConv(convId, (m) => m.map((x) => (x.id === msgId ? { ...x, text, edited: true } : x))),
      deleteMessage: (convId, msgId) =>
        mapConv(convId, (m) => m.filter((x) => x.id !== msgId)),
    };
  }, [conversations]);

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error("useMessages must be used within MessagesProvider");
  return ctx;
}
