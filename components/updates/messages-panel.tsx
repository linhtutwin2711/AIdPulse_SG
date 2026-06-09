"use client";

import { useState } from "react";
import { Check, Pencil, Send, Trash2, X } from "lucide-react";
import { useMessages } from "@/components/providers/messages-provider";
import { cn } from "@/lib/utils";

/** Chat window for a single conversation (the sidebar is the conversation list). */
export function MessagesPanel({ activeId }: { activeId: string }) {
  const { getConversation, sendMessage, editMessage, deleteMessage } = useMessages();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const active = getConversation(activeId);

  if (!active) {
    return (
      <div className="surface grid h-[72vh] place-items-center text-sm text-muted-foreground">
        Select a chat to start messaging.
      </div>
    );
  }

  const send = () => {
    if (!draft.trim()) return;
    sendMessage(active.id, draft.trim());
    setDraft("");
  };

  const saveEdit = (msgId: string) => {
    if (!editText.trim()) return;
    editMessage(active.id, msgId, editText.trim());
    setEditingId(null);
  };

  return (
    <div className="surface flex h-[72vh] flex-col overflow-hidden p-0">
      <header className="flex items-center gap-3 border-b border-border px-5 py-3">
        <span className="relative flex size-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
          {active.initials}
          {active.online && (
            <span className="absolute -bottom-0 -right-0 size-2.5 rounded-full border-2 border-card bg-success" />
          )}
        </span>
        <div>
          <p className="text-sm font-semibold">{active.name}</p>
          {active.online && <p className="text-xs text-success">online</p>}
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-5 no-scrollbar">
        {active.messages.map((m) => (
          <div key={m.id} className={cn("group flex", m.self ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[75%]", m.self && "flex flex-col items-end")}>
              {editingId === m.id ? (
                <div className="flex items-center gap-1.5">
                  <input
                    value={editText}
                    autoFocus
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit(m.id)}
                    className="rounded-xl border border-input bg-input/30 px-3 py-1.5 text-sm outline-none"
                  />
                  <button onClick={() => saveEdit(m.id)} className="text-success" aria-label="Save">
                    <Check className="size-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-muted-foreground" aria-label="Cancel">
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2 text-sm",
                    m.self ? "bg-info text-info-foreground" : "border border-border bg-secondary/40"
                  )}
                >
                  {m.text}
                </div>
              )}
              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>{m.time}{m.edited ? " · edited" : ""}</span>
                {m.self && editingId !== m.id && (
                  <span className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => { setEditingId(m.id); setEditText(m.text); }}
                      className="hover:text-info"
                      aria-label="Edit message"
                    >
                      <Pencil className="size-3" />
                    </button>
                    <button
                      onClick={() => deleteMessage(active.id, m.id)}
                      className="hover:text-danger"
                      aria-label="Delete message"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </span>
                )}
              </div>
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
          <button
            type="submit"
            disabled={!draft.trim()}
            className="flex size-8 items-center justify-center rounded-full bg-info text-info-foreground disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="size-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
