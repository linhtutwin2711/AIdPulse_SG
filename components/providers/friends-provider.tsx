"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { initialFriendIds, peopleDirectory } from "@/constants";
import { phoneKey } from "@/lib/volunteer";
import { fetchFriendIds, saveFriendIds } from "@/lib/user-state";
import { useMessages } from "./messages-provider";
import { useProfile } from "./profile-provider";
import type { Friend } from "@/types";

interface FriendsContextValue {
  friends: Friend[];
  // People in the directory you haven't added yet.
  suggestions: Friend[];
  isFriend: (id: string) => boolean;
  addFriend: (id: string) => void;
  removeFriend: (id: string) => void;
}

const FriendsContext = createContext<FriendsContextValue | null>(null);
const STORAGE_KEY = "aidpulse:friends";

export function FriendsProvider({ children }: { children: React.ReactNode }) {
  // Adding a friend opens a DM thread, so we lean on the messages provider.
  const { addConversation } = useMessages();
  const { profile } = useProfile();
  const phone = phoneKey(profile.countryCode, profile.phone);
  const [friendIds, setFriendIds] = useState<string[]>(initialFriendIds);

  // Load friends: from Supabase by phone when available, else localStorage.
  useEffect(() => {
    let active = true;
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

  const value = useMemo<FriendsContextValue>(() => {
    const byId = (id: string) => peopleDirectory.find((p) => p.id === id);
    const friends = friendIds
      .map(byId)
      .filter((p): p is Friend => Boolean(p));
    const suggestions = peopleDirectory.filter((p) => !friendIds.includes(p.id));

    return {
      friends,
      suggestions,
      isFriend: (id) => friendIds.includes(id),
      addFriend: (id) => {
        if (friendIds.includes(id)) return;
        const person = byId(id);
        if (!person) return;
        persist([...friendIds, id]);
        // Open a DM thread so you can message your new friend right away.
        addConversation({
          id: person.id,
          name: person.name,
          initials: person.initials,
          online: person.online,
        });
      },
      removeFriend: (id) => persist(friendIds.filter((x) => x !== id)),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendIds, addConversation, phone]);

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
}

export function useFriends() {
  const ctx = useContext(FriendsContext);
  if (!ctx) throw new Error("useFriends must be used within FriendsProvider");
  return ctx;
}
