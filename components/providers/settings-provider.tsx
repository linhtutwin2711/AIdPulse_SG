"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export interface AppSettings {
  accent: string; // hex, drives the --info accent token
  reduceMotion: boolean;
  language: string;
  notif: { alerts: boolean; cases: boolean; volunteer: boolean; news: boolean };
}

const DEFAULT: AppSettings = {
  accent: "#3b82f6",
  reduceMotion: false,
  language: "en",
  notif: { alerts: true, cases: true, volunteer: true, news: true },
};

interface SettingsContextValue {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);
const KEY = "aidpulse:settings";

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT);

  useEffect(() => {
    try {
      const s = window.localStorage.getItem(KEY);
      if (s) setSettings({ ...DEFAULT, ...JSON.parse(s) });
    } catch {
      /* ignore */
    }
  }, []);

  // Apply visual settings live to the document.
  useEffect(() => {
    document.documentElement.style.setProperty("--info", settings.accent);
    document.documentElement.classList.toggle("reduce-motion", settings.reduceMotion);
  }, [settings.accent, settings.reduceMotion]);

  const update = (patch: Partial<AppSettings>) =>
    setSettings((prev) => {
      const next = { ...prev, ...patch, notif: { ...prev.notif, ...(patch.notif ?? {}) } };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

  const reset = () => {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setSettings(DEFAULT);
  };

  const value = useMemo(() => ({ settings, update, reset }), [settings]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
