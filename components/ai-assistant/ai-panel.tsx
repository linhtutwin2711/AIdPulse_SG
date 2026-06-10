"use client";

import { useState } from "react";
import {
  HeartPulse,
  Info,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { aiTopics } from "@/constants";
import { useProfile } from "@/components/providers/profile-provider";
import { cn } from "@/lib/utils";
import { useAI } from "./ai-context";

const ICONS = { Info, HeartPulse, Users, ShieldCheck, MessageCircle } as const;

export function AIPanel() {
  const { open, setOpen, messages, sending, send } = useAI();
  const { displayName } = useProfile();
  const [draft, setDraft] = useState("");

  const submit = () => {
    send(draft);
    setDraft("");
  };

  return (
    <>
      {/* Scrim — on every screen. The chat is a modal overlay: the page behind
          keeps its full size and is dimmed + blurred. Clicking it closes the chat. */}
      <div
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />
      {/* Floating side drawer:
          - mobile: full-screen
          - desktop (lg+): fixed 380px column docked to the right, below the nav,
            with a 24px gutter — never covering the map or hospital panel. */}
      <aside
        className={cn(
          "fixed z-50 flex flex-col bg-popover shadow-2xl transition-transform duration-300",
          "inset-y-0 right-0 w-full max-w-md border-l border-border",
          "lg:inset-y-auto lg:top-[84px] lg:bottom-6 lg:right-6 lg:w-[360px] lg:max-w-none lg:rounded-2xl lg:border",
          open ? "translate-x-0" : "translate-x-[120%]"
        )}
        aria-hidden={!open}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4 lg:rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-info/15 text-info">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">AidPulse Assistant</p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-1.5 rounded-full bg-success" /> Online
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Close assistant"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 no-scrollbar">
          {messages.length === 0 ? (
            <>
              <div>
                <h3 className="text-lg font-semibold">Hello, {displayName}! 👋</h3>
                <p className="text-sm text-muted-foreground">
                  How can I help you today? Pick a topic or ask anything.
                </p>
              </div>
              <div className="space-y-2">
                {aiTopics.map((t) => {
                  const Icon = ICONS[t.icon as keyof typeof ICONS] ?? Info;
                  return (
                    <button
                      key={t.id}
                      onClick={() => send(t.label)}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm font-medium transition-colors hover:border-info/50 hover:bg-info/5"
                    >
                      <span className="flex size-8 items-center justify-center rounded-lg bg-info/15 text-info">
                        <Icon className="size-4" />
                      </span>
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex",
                  m.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-card"
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))
          )}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
                Typing…
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border p-4 lg:rounded-b-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="flex size-8 items-center justify-center rounded-full bg-info text-info-foreground disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
