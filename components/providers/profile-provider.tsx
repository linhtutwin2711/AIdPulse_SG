"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { phoneKey } from "@/lib/volunteer";
import { flushPendingProfile, registerProfile } from "@/lib/chat";

export interface Profile {
  firstName: string;
  lastName: string;
  preferredName: string; // "what should we call you" — optional, defaults to firstName
  countryCode: string;
  phone: string;
}

const DEFAULT_PROFILE: Profile = {
  firstName: "Alex",
  lastName: "Lee",
  preferredName: "Alex",
  countryCode: "+65",
  phone: "",
};

interface ProfileContextValue {
  profile: Profile;
  setProfile: (p: Profile) => void;
  displayName: string;
  fullName: string;
  initials: string;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);
const STORAGE_KEY = "aidpulse:profile";

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<Profile>(DEFAULT_PROFILE);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setProfileState({ ...DEFAULT_PROFILE, ...JSON.parse(saved) });
    } catch {
      /* ignore malformed storage */
    }
    // Re-send any profile write stashed by a previous failed attempt.
    void flushPendingProfile();
  }, []);

  const setProfile = (p: Profile) => {
    setProfileState(p);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    // Make this account searchable by its phone on other devices (chat spec).
    // Fire-and-forget with retry + offline stash; no-op without phone/Supabase.
    const phone = phoneKey(p.countryCode, p.phone);
    const displayName = p.preferredName.trim() || p.firstName || "Friend";
    const fullName = [p.firstName, p.lastName].filter(Boolean).join(" ") || displayName;
    const initials =
      ((p.firstName[0] ?? "") + (p.lastName[0] ?? "")).toUpperCase() ||
      displayName.slice(0, 2).toUpperCase();
    void registerProfile(phone, { displayName: fullName, initials, role: "citizen" });
  };

  const value = useMemo<ProfileContextValue>(() => {
    const displayName = profile.preferredName.trim() || profile.firstName || "Friend";
    const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || displayName;
    const initials =
      ((profile.firstName[0] ?? "") + (profile.lastName[0] ?? "")).toUpperCase() ||
      displayName.slice(0, 2).toUpperCase();
    return { profile, setProfile, displayName, fullName, initials };
  }, [profile]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
