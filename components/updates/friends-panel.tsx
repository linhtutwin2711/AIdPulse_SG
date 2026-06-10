"use client";

import { useState } from "react";
import {
  MessageSquare,
  Search,
  UserPlus,
  UserRoundCheck,
  UserRoundX,
  Users,
} from "lucide-react";
import { useFriends } from "@/components/providers/friends-provider";
import { roleLabel } from "@/lib/ui";
import { cn } from "@/lib/utils";
import type { Friend } from "@/types";

type Tab = "friends" | "discover";

/** Friends hub: your connections + a directory to add new ones. */
export function FriendsPanel({ onMessage }: { onMessage: (convId: string) => void }) {
  const { friends, suggestions, addFriend, removeFriend } = useFriends();
  const [tab, setTab] = useState<Tab>("friends");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filteredSuggestions = q
    ? suggestions.filter((p) => `${p.name} ${p.area ?? ""}`.toLowerCase().includes(q))
    : suggestions;

  return (
    <div className="surface flex h-[72vh] flex-col overflow-hidden p-0">
      <header className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-gold" />
          <h1 className="text-lg font-bold">Friends</h1>
          <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
            {friends.length}
          </span>
        </div>
        <div className="mt-3 flex gap-1.5">
          {(["friends", "discover"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                tab === t ? "bg-gold/15 text-gold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "friends" ? "My Friends" : "Add Friends"}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        {tab === "friends" ? (
          friends.length === 0 ? (
            <Empty
              icon={Users}
              title="No friends yet"
              hint="Switch to “Add Friends” to connect with people on AidPulse."
            />
          ) : (
            <ul className="space-y-2">
              {friends.map((f) => (
                <PersonRow key={f.id} person={f}>
                  <IconButton
                    label={`Message ${f.name}`}
                    onClick={() => onMessage(f.id)}
                    className="hover:bg-info/15 hover:text-info"
                  >
                    <MessageSquare className="size-4" />
                  </IconButton>
                  <IconButton
                    label={`Remove ${f.name}`}
                    onClick={() => removeFriend(f.id)}
                    className="hover:bg-danger/15 hover:text-danger"
                  >
                    <UserRoundX className="size-4" />
                  </IconButton>
                </PersonRow>
              ))}
            </ul>
          )
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2 rounded-full border border-border bg-input/30 px-4 py-2.5">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search people by name or area…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            {filteredSuggestions.length === 0 ? (
              <Empty
                icon={UserRoundCheck}
                title={q ? "No matches" : "You're all caught up"}
                hint={q ? "Try a different name or area." : "You've added everyone in the directory."}
              />
            ) : (
              <ul className="space-y-2">
                {filteredSuggestions.map((p) => (
                  <PersonRow key={p.id} person={p}>
                    <button
                      onClick={() => addFriend(p.id)}
                      className="flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-90"
                    >
                      <UserPlus className="size-3.5" /> Add
                    </button>
                  </PersonRow>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PersonRow({ person, children }: { person: Friend; children: React.ReactNode }) {
  const meta = [person.role ? roleLabel[person.role] : null, person.area]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 p-3">
      <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
        {person.initials}
        {person.online && (
          <span className="absolute -bottom-0 -right-0 size-3 rounded-full border-2 border-card bg-success" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{person.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {meta}
          {person.mutualFriends ? ` · ${person.mutualFriends} mutual` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">{children}</div>
    </li>
  );
}

function IconButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors",
        className
      )}
    >
      {children}
    </button>
  );
}

function Empty({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof Users;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <Icon className="size-8 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}
