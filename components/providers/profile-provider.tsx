"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

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
  }, []);

  const setProfile = (p: Profile) => {
    setProfileState(p);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
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
