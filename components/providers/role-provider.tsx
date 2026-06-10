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
  /** Hospital the signed-in officer belongs to (chosen at officer sign-in).
   *  Opportunities they post are attributed to this hospital. */
  officerHospitalId: string | null;
  setOfficerHospitalId: (id: string) => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);
const STORAGE_KEY = "aidpulse:role";
const HOSPITAL_KEY = "aidpulse:officer-hospital";

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>("citizen");
  const [hydrated, setHydrated] = useState(false);
  const [officerHospitalId, setOfficerHospitalIdState] = useState<string | null>(null);

  // Hydrate the persisted role + officer hospital after mount (avoids SSR mismatch).
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Role | null;
    if (saved === "citizen" || saved === "volunteer" || saved === "officer") {
      setRoleState(saved);
    }
    const hospital = window.localStorage.getItem(HOSPITAL_KEY);
    if (hospital) setOfficerHospitalIdState(hospital);
    setHydrated(true);
  }, []);

  const setRole = (next: Role) => {
    setRoleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  const setOfficerHospitalId = (id: string) => {
    setOfficerHospitalIdState(id);
    window.localStorage.setItem(HOSPITAL_KEY, id);
  };

  const value = useMemo(
    () => ({ role, setRole, hydrated, officerHospitalId, setOfficerHospitalId }),
    [role, hydrated, officerHospitalId],
  );
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
