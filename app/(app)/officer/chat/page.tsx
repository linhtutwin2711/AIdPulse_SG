"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Plus, Search, Send, UserPlus, Users } from "lucide-react";
import { officerDirectory } from "@/constants";
import { getConversations } from "@/lib/data";
import { useProfile } from "@/components/providers/profile-provider";
import { phoneKey } from "@/lib/volunteer";
import {
  findOfficerByHospital,
  getThread,
  sendMessageRpc,
  subscribeToMessages,
  type MessageRow,
  type OfficerContactLive,
} from "@/lib/chat";
import { cn } from "@/lib/utils";
import type { ChatMessage, Conversation, OfficerContact } from "@/types";

const fmtTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "now";
  }
};

type Filter = "all" | "direct" | "groups" | "unread";

// EO contacts you add (found by hospital search) survive reloads.
const CONTACTS_KEY = "aidpulse:eo-contacts";

export default function ResponderChatPage() {
  const seed = useMemo(() => getConversations(), []);
  const { profile, fullName, initials: myInitials } = useProfile();
  const myPhone = phoneKey(profile.countryCode, profile.phone);
  // Conversations opened by adding a hospital's duty officer.
  const [added, setAdded] = useState<Conversation[]>([]);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CONTACTS_KEY);
      if (saved) setAdded(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);

  const conversations = useMemo(() => [...added, ...seed], [added, seed]);
  const [activeId, setActiveId] = useState(seed[0].id);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, ChatMessage[]>>({});
  const [draft, setDraft] = useState("");
  // Real duty EOs discovered by hospital search (find_officer_by_hospital),
  // cached per hospital id (null = no live officer, fall back to the mock).
  const [liveOfficers, setLiveOfficers] = useState<Record<string, OfficerContactLive | null>>({});

  const active = conversations.find((c) => c.id === activeId) ?? seed[0];
  const messages = [...active.messages, ...(drafts[activeId] ?? [])];

  const q = search.trim().toLowerCase();
  const list = conversations.filter((c) => {
    if (q && !c.name.toLowerCase().includes(q)) return false;
    if (filter === "direct") return c.kind === "direct";
    if (filter === "groups") return c.kind === "group";
    if (filter === "unread") return !!c.unread;
    return true;
  });

  // Hospital search: each hospital has exactly one duty EO — find them by the
  // hospital's name (the officer-side equivalent of finding a friend by phone).
  const rawMatches = q
    ? officerDirectory
        .filter(
          (o) => o.hospitalName.toLowerCase().includes(q) || o.name.toLowerCase().includes(q),
        )
        .slice(0, 5)
    : [];
  const rawMatchesKey = rawMatches.map((o) => o.hospitalId).join(",");

  // Look up the REAL registered duty EO for each matched hospital; a live hit
  // overrides the mock officer (real name + phone, so chat is genuine).
  useEffect(() => {
    const ids = rawMatches.map((o) => o.hospitalId).filter((id) => !(id in liveOfficers));
    if (!ids.length) return;
    let alive = true;
    Promise.all(ids.map((id) => findOfficerByHospital(id).then((r) => [id, r] as const))).then(
      (entries) => {
        if (!alive) return;
        setLiveOfficers((prev) => {
          const next = { ...prev };
          for (const [id, r] of entries) next[id] = r;
          return next;
        });
      },
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawMatchesKey]);

  // Present the live EO when one is registered, else the mock duty officer. A
  // live contact is keyed by the officer's phone so messaging routes for real.
  const resolve = (o: OfficerContact): OfficerContact => {
    const live = liveOfficers[o.hospitalId];
    if (live && live.phone !== myPhone) {
      return { ...o, id: live.phone, name: live.name, initials: live.initials, online: live.online };
    }
    return o;
  };
  const directoryMatches: OfficerContact[] = rawMatches
    .map(resolve)
    .filter((o) => !conversations.some((c) => c.id === o.id));

  const addContact = (o: OfficerContact) => {
    const conv: Conversation = {
      id: o.id,
      name: o.name,
      kind: "direct",
      online: o.online,
      lastMessage: `Secure line · ${o.hospitalName}`,
      lastTime: "now",
      messages: [],
    };
    const next = [conv, ...added];
    setAdded(next);
    try {
      window.localStorage.setItem(CONTACTS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setActiveId(o.id);
    setSearch("");
  };

  // Live delivery: subscribe once to messages addressed to me and append each to
  // the sender's thread (opening a bare thread if they messaged first).
  const addedRef = useRef(added);
  addedRef.current = added;
  useEffect(() => {
    if (!myPhone) return;
    const unsub = subscribeToMessages(myPhone, (row: MessageRow) => {
      const from = row.sender_phone;
      // Ensure a conversation exists for an unknown sender.
      if (!addedRef.current.some((c) => c.id === from) && !seed.some((c) => c.id === from)) {
        const conv: Conversation = {
          id: from,
          name: from,
          kind: "direct",
          online: true,
          lastMessage: "Secure line",
          lastTime: "now",
          messages: [],
        };
        const next = [conv, ...addedRef.current];
        setAdded(next);
        try {
          window.localStorage.setItem(CONTACTS_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
      }
      setDrafts((prev) => {
        const cur = prev[from] ?? [];
        if (cur.some((m) => m.id === row.id)) return prev;
        return {
          ...prev,
          [from]: [
            ...cur,
            { id: row.id, author: from, initials: from.slice(-2), text: row.body, time: fmtTime(row.created_at), self: false },
          ],
        };
      });
    });
    return unsub;
  }, [myPhone, seed]);

  // Hydrate a real thread's history from Supabase when it's opened.
  const peerName = active.name;
  useEffect(() => {
    if (!myPhone || !activeId.startsWith("+")) return;
    let alive = true;
    getThread(myPhone, activeId).then((rows) => {
      if (!alive || !rows.length) return;
      setDrafts((prev) => ({
        ...prev,
        [activeId]: rows.map((r) => ({
          id: r.id,
          author: r.sender_phone === myPhone ? "You" : peerName,
          initials: r.sender_phone === myPhone ? myInitials : activeId.slice(-2),
          text: r.body,
          time: fmtTime(r.created_at),
          self: r.sender_phone === myPhone,
        })),
      }));
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, myPhone]);

  const send = () => {
    if (!draft.trim()) return;
    const text = draft.trim();
    setDrafts((prev) => ({
      ...prev,
      [activeId]: [
        ...(prev[activeId] ?? []),
        { id: `d${Date.now()}`, author: `${fullName} (You)`, initials: myInitials, text, time: "now", self: true },
      ],
    }));
    // Real (phone-keyed) threads persist + deliver to the other device.
    if (myPhone && activeId.startsWith("+")) void sendMessageRpc(myPhone, activeId, text);
    setDraft("");
  };

  return (
    // Responder chat takes over the whole page — the only chrome is a back
    // button to the officer dashboard.
    <div className="flex h-[calc(100dvh-7rem)] flex-col gap-3 overflow-hidden">
      <div>
        <Link
          href="/officer/dashboard"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to Dashboard
        </Link>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[320px_1fr] gap-4 overflow-hidden max-md:grid-cols-1">
      {/* Conversation list */}
      <aside className="surface flex flex-col overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h1 className="font-semibold">Chats</h1>
          <button className="flex size-8 items-center justify-center rounded-lg bg-secondary hover:bg-secondary/70" aria-label="New chat">
            <Plus className="size-4" />
          </button>
        </div>
        <div className="border-b border-border p-3">
          <label className="flex items-center gap-2 rounded-lg border border-border bg-input/30 px-3 py-2 text-sm">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats or a hospital…"
              className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </label>
          <div className="mt-3 flex gap-1.5">
            {(["all", "direct", "groups", "unread"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                  filter === f ? "bg-gold/15 text-gold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto no-scrollbar">
          {/* Hospital directory hits — duty EOs you haven't connected with yet. */}
          {directoryMatches.length > 0 && (
            <>
              <li className="px-4 pb-1 pt-3 text-xs font-semibold uppercase text-muted-foreground">
                Emergency Officers · by hospital
              </li>
              {directoryMatches.map((o) => (
                <li key={o.id}>
                  <button
                    onClick={() => addContact(o)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/40"
                  >
                    <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-gold/15 text-sm font-semibold text-gold">
                      {o.initials}
                      {o.online && <span className="absolute -bottom-0 -right-0 size-3 rounded-full border-2 border-card bg-success" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{o.name}</span>
                      <span className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <Building2 className="size-3 shrink-0" /> {o.hospitalName}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-[11px] font-semibold text-black">
                      <UserPlus className="size-3" /> Add
                    </span>
                  </button>
                </li>
              ))}
              {list.length > 0 && <li className="mx-4 my-1 h-px bg-border" />}
            </>
          )}
          {list.length === 0 && directoryMatches.length === 0 && q && (
            <li className="px-4 py-8 text-center text-sm text-muted-foreground">
              No chats or hospitals match &ldquo;{search.trim()}&rdquo;.
            </li>
          )}
          {list.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setActiveId(c.id)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/40",
                  activeId === c.id && "bg-secondary/60"
                )}
              >
                <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                  {c.kind === "group" ? <Users className="size-5" /> : c.name.split(" ").slice(-1)[0][0]}
                  {c.online && <span className="absolute -bottom-0 -right-0 size-3 rounded-full border-2 border-card bg-success" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between">
                    <span className="truncate text-sm font-medium">{c.name}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{c.lastTime}</span>
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{c.lastMessage}</span>
                </span>
                {c.unread ? (
                  <span className="flex size-5 items-center justify-center rounded-full bg-danger text-[11px] font-semibold text-white">{c.unread}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Thread */}
      <section className="surface flex flex-col overflow-hidden p-0">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-secondary font-semibold">
              {active.kind === "group" ? <Users className="size-5" /> : active.name.split(" ").slice(-1)[0][0]}
            </span>
            <div>
              <p className="font-semibold">{active.name}</p>
              <p className="text-xs text-muted-foreground">
                {active.kind === "group" ? `${active.members} members` : "Direct message"}
                {active.online && " · online"}
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-5 no-scrollbar">
          {messages.length === 0 && (
            <p className="mt-10 text-center text-sm text-muted-foreground">No messages yet. Start the conversation.</p>
          )}
          {messages.map((m) => (
            <div key={m.id} className={cn("flex gap-2", m.self ? "justify-end" : "justify-start")}>
              {!m.self && (
                <span className="flex size-8 shrink-0 items-center justify-center self-end rounded-full bg-secondary text-xs font-semibold">{m.initials}</span>
              )}
              <div className={cn("max-w-[70%]")}>
                {!m.self && <p className="mb-1 text-xs text-muted-foreground">{m.author}</p>}
                <div className={cn(
                  "rounded-2xl px-4 py-2.5 text-sm",
                  m.self ? "bg-gold text-black" : "border border-border bg-secondary/40"
                )}>
                  {m.text}
                </div>
                <p className={cn("mt-1 text-[11px] text-muted-foreground", m.self && "text-right")}>{m.time}</p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="border-t border-border p-4">
          <div className="flex items-center gap-2 rounded-full border border-border bg-input/30 px-4 py-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button type="submit" disabled={!draft.trim()} className="flex size-8 items-center justify-center rounded-full bg-gold text-black disabled:opacity-40" aria-label="Send">
              <Send className="size-4" />
            </button>
          </div>
        </form>
      </section>
      </div>
    </div>
  );
}
