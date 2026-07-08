"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Plus, Search, Send, UserPlus, Users } from "lucide-react";
import { officerDirectory } from "@/constants";
import { getConversations } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { ChatMessage, Conversation, OfficerContact } from "@/types";

type Filter = "all" | "direct" | "groups" | "unread";

// EO contacts you add (found by hospital search) survive reloads.
const CONTACTS_KEY = "aidpulse:eo-contacts";

export default function ResponderChatPage() {
  const seed = useMemo(() => getConversations(), []);
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
  const directoryMatches: OfficerContact[] = q
    ? officerDirectory
        .filter(
          (o) =>
            !conversations.some((c) => c.id === o.id) &&
            (o.hospitalName.toLowerCase().includes(q) || o.name.toLowerCase().includes(q))
        )
        .slice(0, 5)
    : [];

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

  const send = () => {
    if (!draft.trim()) return;
    setDrafts((prev) => ({
      ...prev,
      [activeId]: [
        ...(prev[activeId] ?? []),
        { id: `d${Date.now()}`, author: "John Lim (You)", initials: "JL", text: draft.trim(), time: "now", self: true },
      ],
    }));
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
