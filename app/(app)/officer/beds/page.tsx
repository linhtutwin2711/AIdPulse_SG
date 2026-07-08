"use client";

import { useEffect, useState } from "react";
import { BedDouble, Building2, Minus, Plus, ShieldCheck } from "lucide-react";
import { OfficerNav } from "@/components/officer/officer-nav";
import { useRole } from "@/components/providers/role-provider";
import { getHospital, getHospitals } from "@/lib/data";
import { cn } from "@/lib/utils";

/**
 * Bed availability for the officer's OWN hospital (chosen at officer sign-in) —
 * an EO only manages the wards they're situated in, per department.
 * Edits persist locally per hospital; Supabase later: an UPDATE on a
 * `hospital_departments` table keyed by (hospital_id, department).
 */
export default function OfficerBedsPage() {
  const { officerHospitalId } = useRole();
  // Fall back to the first hospital if an officer signed in before hospital
  // selection existed.
  const hospital = (officerHospitalId ? getHospital(officerHospitalId) : undefined) ?? getHospitals()[0];
  const storageKey = `aidpulse:beds:${hospital.id}`;

  // occupied count per department, seeded from the fixture.
  const [occupied, setOccupied] = useState<Record<string, number>>(
    Object.fromEntries(hospital.departments.map((d) => [d.name, d.occupied]))
  );

  // Hydrate any previously saved counts for this hospital.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) setOccupied((prev) => ({ ...prev, ...JSON.parse(saved) }));
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const adjust = (dept: string, total: number, delta: number) => {
    setOccupied((prev) => {
      // +1 available = -1 occupied (steppers edit available beds).
      const next = { ...prev, [dept]: Math.max(0, Math.min(total, (prev[dept] ?? 0) - delta)) };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const totals = hospital.departments.reduce(
    (acc, d) => {
      acc.total += d.total;
      acc.occupied += occupied[d.name] ?? d.occupied;
      return acc;
    },
    { total: 0, occupied: 0 }
  );
  const availableTotal = totals.total - totals.occupied;
  const pct = totals.total ? Math.round((totals.occupied / totals.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Hospital Bed Availability</h1>
          <p className="text-sm text-muted-foreground">
            Update your hospital&apos;s real-time capacity, ward by ward.
          </p>
        </div>
        <OfficerNav />
      </div>

      {/* The officer's own hospital — the only one they can update. */}
      <div className="surface flex items-center gap-3 p-4">
        <span className="flex size-10 items-center justify-center rounded-xl bg-gold/15 text-gold">
          <Building2 className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Managing beds for</p>
          <p className="truncate font-semibold">{hospital.name}</p>
        </div>
        <span className="pill ml-auto shrink-0 gap-1 bg-gold/15 text-gold">
          <ShieldCheck className="size-3.5" /> Your hospital
        </span>
      </div>

      {/* Live summary */}
      <div className="surface p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 font-semibold">
            <BedDouble className="size-4 text-info" /> Overall capacity
          </span>
          <span className="font-semibold">
            {availableTotal} of {totals.total} beds available · {pct}% occupied
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              "h-full rounded-full",
              pct > 80 ? "bg-danger" : pct > 50 ? "bg-warning" : "bg-success"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Per-department steppers */}
      <ul className="space-y-3">
        {hospital.departments.map((d) => {
          const occ = occupied[d.name] ?? d.occupied;
          const available = d.total - occ;
          const deptPct = d.total ? Math.round((occ / d.total) * 100) : 0;
          return (
            <li key={d.name} className="surface-muted flex items-center justify-between gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{d.name}</p>
                <p className="text-xs text-muted-foreground">
                  {available} of {d.total} beds available · {deptPct}% occupied
                </p>
                <div className="mt-1.5 h-1.5 max-w-56 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      deptPct > 80 ? "bg-danger" : deptPct > 50 ? "bg-warning" : "bg-success"
                    )}
                    style={{ width: `${deptPct}%` }}
                  />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => adjust(d.name, d.total, -1)}
                  disabled={available <= 0}
                  className="flex size-8 items-center justify-center rounded-lg border border-border hover:bg-secondary disabled:opacity-40"
                  aria-label={`One fewer bed available in ${d.name}`}
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-8 text-center font-semibold">{available}</span>
                <button
                  onClick={() => adjust(d.name, d.total, 1)}
                  disabled={occ <= 0}
                  className="flex size-8 items-center justify-center rounded-lg border border-border hover:bg-secondary disabled:opacity-40"
                  aria-label={`One more bed available in ${d.name}`}
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted-foreground">
        Changes go live immediately for citizens and responders viewing this
        hospital on the map.
      </p>
    </div>
  );
}
