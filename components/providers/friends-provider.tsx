"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { initialFriendIds, peopleDirectory } from "@/constants";
import { phoneKey } from "@/lib/volunteer";
import { fetchFriendIds, saveFriendIds } from "@/lib/user-state";
import { addFriendRpc, getFriends } from "@/lib/chat";
import { useMessages } from "./messages-provider";
import { useProfile } from "./profile-provider";
import type { Friend } from "@/types";

interface FriendsContextValue {
  friends: Friend[];
  // People in the directory you haven't added yet.
  suggestions: Friend[];
  isFriend: (id: string) => boolean;
  addFriend: (id: string) => void;
  // Add a REAL account found by phone (id = its E.164 phone), not a mock
  // directory entry. Persists the friendship in Supabase via add_friend.
  addFriendProfile: (friend: Friend) => void;
  removeFriend: (id: string) => void;
}

const FriendsContext = createContext<FriendsContextValue | null>(null);
const STORAGE_KEY = "aidpulse:friends";
// Cache of real (phone-keyed) friends, so they survive reloads offline too.
const LIVE_KEY = "aidpulse:live-friends";

export function FriendsProvider({ children }: { children: React.ReactNode }) {
  // Adding a friend opens a DM thread, so we lean on the messages provider.
  const { addConversation } = useMessages();
  const { profile } = useProfile();
  const phone = phoneKey(profile.countryCode, profile.phone);
  const [friendIds, setFriendIds] = useState<string[]>(initialFriendIds);
  // Real accounts you've added by phone — not in the mock directory.
  const [liveFriends, setLiveFriends] = useState<Friend[]>([]);

  // Load friends: real accounts from Supabase (get_friends) + the directory-id
  // set from Supabase-by-phone (else localStorage), so both paths coexist.
  useEffect(() => {
    let active = true;

    getFriends(phone).then((live) => {
      if (!active) return;
      if (live !== null) {
        setLiveFriends(live);
        try {
          window.localStorage.setItem(LIVE_KEY, JSON.stringify(live));
        } catch {
          /* ignore */
        }
      } else {
        // No Supabase / no phone — restore the cached real friends.
        try {
          const cached = window.localStorage.getItem(LIVE_KEY);
          if (cached) setLiveFriends(JSON.parse(cached));
        } catch {
          /* ignore */
        }
      }
    });

    fetchFriendIds(phone).then((ids) => {
      if (!active) return;
      if (ids !== null) {
        setFriendIds(ids);
        return;
      }
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) setFriendIds(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    });

    return () => {
      active = false;
    };
  }, [phone]);

  const persist = (next: string[]) => {
    setFriendIds(next);
    if (phone) {
      saveFriendIds(phone, next);
    } else {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    }
  };

  const persistLive = (next: Friend[]) => {
    setLiveFriends(next);
    try {
      window.localStorage.setItem(LIVE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const value = useMemo<FriendsContextValue>(() => {
    const byId = (id: string) => peopleDirectory.find((p) => p.id === id);
    const dirFriends = friendIds
      .map(byId)
      .filter((p): p is Friend => Boolean(p));
    // Real accounts first, then mock directory friends (deduped by id).
    const seen = new Set(liveFriends.map((f) => f.id));
    const friends = [...liveFriends, ...dirFriends.filter((f) => !seen.has(f.id))];
    const suggestions = peopleDirectory.filter((p) => !friendIds.includes(p.id));

    const openThread = (f: Friend) =>
      addConversation({ id: f.id, name: f.name, initials: f.initials, online: f.online });

    return {
      friends,
      suggestions,
      isFriend: (id) => friendIds.includes(id) || liveFriends.some((f) => f.id === id),
      addFriend: (id) => {
        if (friendIds.includes(id)) return;
        const person = byId(id);
        if (!person) return;
        persist([...friendIds, id]);
        // Open a DM thread so you can message your new friend right away.
        openThread(person);
      },
      addFriendProfile: (friend) => {
        if (liveFriends.some((f) => f.id === friend.id)) {
          openThread(friend);
          return;
        }
        persistLive([...liveFriends, friend]);
        // Persist the friendship server-side (canonical row); fire-and-forget.
        void addFriendRpc(phone, friend.phone ?? friend.id);
        openThread(friend);
      },
      removeFriend: (id) => {
        if (liveFriends.some((f) => f.id === id)) {
          persistLive(liveFriends.filter((f) => f.id !== id));
          return;
        }
        persist(friendIds.filter((x) => x !== id));
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendIds, liveFriends, addConversation, phone]);

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
}

export function useFriends() {
  const ctx = useContext(FriendsContext);
  if (!ctx) throw new Error("useFriends must be used within FriendsProvider");
  return ctx;
}
