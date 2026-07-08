"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { phoneKey } from "@/lib/volunteer";
import { getThread, sendMessageRpc, subscribeToMessages, type MessageRow } from "@/lib/chat";
import { useProfile } from "./profile-provider";

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
  // Hydrate a real (phone-keyed) thread from Supabase when it's opened.
  openConversation: (id: string) => void;
  sendMessage: (convId: string, text: string) => void;
  editMessage: (convId: string, msgId: string, text: string) => void;
  deleteMessage: (convId: string, msgId: string) => void;
}

const MessagesContext = createContext<MessagesContextValue | null>(null);
const STORAGE_KEY = "aidpulse:messages";
const nid = () => `m-${Math.random().toString(36).slice(2, 9)}`;

// Real conversation ids are E.164 phones ("+65…"); mock seed ids are names.
const isPhoneId = (id: string) => id.startsWith("+");
const fmtTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "now";
  }
};
const rowToMessage = (row: MessageRow, me: string): DMMessage => ({
  id: row.id,
  text: row.body,
  self: row.sender_phone === me,
  time: fmtTime(row.created_at),
});

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useProfile();
  const myPhone = phoneKey(profile.countryCode, profile.phone);
  const [conversations, setConversations] = useState<DMConversation[]>(SEED);
  // Kept in a ref so the Realtime callback always sees the latest list without
  // resubscribing on every message.
  const convRef = useRef(conversations);
  convRef.current = conversations;

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

  // Live delivery: a message addressed to me lands here in ~1s. Append it to the
  // sender's thread (creating a bare thread if they messaged first).
  useEffect(() => {
    if (!myPhone) return;
    const unsub = subscribeToMessages(myPhone, (row) => {
      const convId = row.sender_phone;
      const incoming = rowToMessage(row, myPhone);
      const prev = convRef.current;
      if (!prev.some((c) => c.id === convId)) {
        setConversations([
          ...prev,
          { id: convId, name: convId, initials: convId.slice(-2), messages: [incoming] },
        ]);
        return;
      }
      setConversations(
        prev.map((c) =>
          c.id === convId && !c.messages.some((m) => m.id === incoming.id)
            ? { ...c, messages: [...c.messages, incoming] }
            : c,
        ),
      );
    });
    return unsub;
  }, [myPhone]);

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
      openConversation: (id) => {
        if (!myPhone || !isPhoneId(id)) return;
        void getThread(myPhone, id).then((rows) => {
          if (!rows.length) return;
          const mapped = rows.map((r) => rowToMessage(r, myPhone));
          setConversations((prev) =>
            prev.map((c) => (c.id === id ? { ...c, messages: mapped } : c)),
          );
        });
      },
      sendMessage: (convId, text) => {
        // Optimistic local echo so sending feels instant on the sender's side.
        mapConv(convId, (m) => [...m, { id: nid(), text, self: true, time: "now" }]);
        // Persist + deliver to the other device for real (phone) threads.
        if (myPhone && isPhoneId(convId)) void sendMessageRpc(myPhone, convId, text);
      },
      editMessage: (convId, msgId, text) =>
        mapConv(convId, (m) => m.map((x) => (x.id === msgId ? { ...x, text, edited: true } : x))),
      deleteMessage: (convId, msgId) =>
        mapConv(convId, (m) => m.filter((x) => x.id !== msgId)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, myPhone]);

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error("useMessages must be used within MessagesProvider");
  return ctx;
}
