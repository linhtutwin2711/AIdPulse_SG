"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  MessageSquare,
  Search,
  Send,
  UserPlus,
  UserRoundCheck,
  UserRoundX,
  Users,
} from "lucide-react";
import { useFriends } from "@/components/providers/friends-provider";
import {
  FLYER_PATH,
  buildInviteMessage,
  findPersonByPhoneLive,
  looksLikePhone,
  whatsappInviteUrl,
} from "@/lib/data";
import { roleLabel } from "@/lib/ui";
import { cn } from "@/lib/utils";
import type { Friend } from "@/types";

type Tab = "friends" | "discover";

/** Friends hub: your connections + a directory to add new ones. */
export function FriendsPanel({ onMessage }: { onMessage: (convId: string) => void }) {
  const { friends, suggestions, isFriend, addFriend, addFriendProfile, removeFriend } = useFriends();
  const [tab, setTab] = useState<Tab>("friends");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  // Digits → WhatsApp-style exact phone lookup; anything else → name/area filter.
  const phoneSearch = looksLikePhone(query);
  // Exact-match lookup hits the real Supabase directory first (async), then the
  // mock. Held in state so a network round-trip doesn't block rendering.
  const [phoneMatch, setPhoneMatch] = useState<Friend | null>(null);
  useEffect(() => {
    if (!phoneSearch) {
      setPhoneMatch(null);
      return;
    }
    let active = true;
    findPersonByPhoneLive(query).then((m) => {
      if (active) setPhoneMatch(m);
    });
    return () => {
      active = false;
    };
  }, [query, phoneSearch]);

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
                placeholder="Search by name, area, or phone number…"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            {phoneSearch ? (
              phoneMatch ? (
                <ul className="space-y-2">
                  <PersonRow person={phoneMatch} showPhone>
                    {isFriend(phoneMatch.id) ? (
                      <IconButton
                        label={`Message ${phoneMatch.name}`}
                        onClick={() => onMessage(phoneMatch.id)}
                        className="hover:bg-info/15 hover:text-info"
                      >
                        <MessageSquare className="size-4" />
                      </IconButton>
                    ) : (
                      <button
                        onClick={() =>
                          // Real accounts (phone id) persist server-side via
                          // add_friend; mock directory hits keep the old path.
                          phoneMatch.id.startsWith("+")
                            ? addFriendProfile(phoneMatch)
                            : addFriend(phoneMatch.id)
                        }
                        className="flex items-center gap-1.5 rounded-full bg-gold px-3 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-90"
                      >
                        <UserPlus className="size-3.5" /> Add
                      </button>
                    )}
                  </PersonRow>
                  <p className="px-1 pt-1 text-xs text-muted-foreground">
                    {isFriend(phoneMatch.id)
                      ? "You're already friends — say hi!"
                      : "This number is on AidPulse."}
                  </p>
                </ul>
              ) : (
                <>
                  <Empty
                    icon={UserRoundX}
                    title="Number not on AidPulse"
                    hint="No account is registered with this phone number. Check the digits, or invite them to join."
                  />
                  <InviteCard phone={query} />
                </>
              )
            ) : filteredSuggestions.length === 0 ? (
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

/**
 * Invite an unregistered number to AidPulse: flyer preview + ready-made pitch,
 * sendable via WhatsApp or copied to the clipboard.
 */
function InviteCard({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false);
  const [flyerOk, setFlyerOk] = useState(true);
  // window is client-only; read origin after mount to stay hydration-safe.
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const message = buildInviteMessage(origin || "https://aidpulse.sg");

  const copyInvite = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(message);
      ok = true;
    } catch {
      // Fallback for contexts where the Clipboard API is unavailable.
      const ta = document.createElement("textarea");
      ta.value = message;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        ok = document.execCommand("copy");
      } finally {
        ta.remove();
      }
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mx-1 rounded-2xl border border-gold/25 bg-gold/5 p-4">
      <div className="flex items-start gap-3">
        {flyerOk && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={FLYER_PATH}
            alt="AidPulse SG flyer"
            onError={() => setFlyerOk(false)}
            className="w-16 shrink-0 rounded-lg border border-border object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Invite {phone.trim()} to AidPulse</p>
          <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
            {message}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={whatsappInviteUrl(phone, origin || "https://aidpulse.sg")}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-full bg-success px-3.5 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-90"
        >
          <Send className="size-3.5" /> Invite via WhatsApp
        </a>
        <button
          onClick={copyInvite}
          aria-label="Copy invite message"
          className="flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
          {copied ? "Copied!" : "Copy invite"}
        </button>
      </div>
    </div>
  );
}

function PersonRow({
  person,
  showPhone,
  children,
}: {
  person: Friend;
  showPhone?: boolean;
  children: React.ReactNode;
}) {
  const meta = [
    person.role ? roleLabel[person.role] : null,
    person.area,
    showPhone ? person.phone : null,
  ]
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
