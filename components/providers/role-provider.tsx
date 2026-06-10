"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Role } from "@/types";

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
  /** False until the persisted role has been read from localStorage. Guards
   *  must wait for this before redirecting, or a real volunteer/officer who
   *  reloads on a protected page would be bounced out during hydration. */
  hydrated: boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);
const STORAGE_KEY = "aidpulse:role";

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>("citizen");
  const [hydrated, setHydrated] = useState(false);

  // Hydrate the persisted role after mount (avoids SSR mismatch).
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Role | null;
    if (saved === "citizen" || saved === "volunteer" || saved === "officer") {
      setRoleState(saved);
    }
    setHydrated(true);
  }, []);

  const setRole = (next: Role) => {
    setRoleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo(() => ({ role, setRole, hydrated }), [role, hydrated]);
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
