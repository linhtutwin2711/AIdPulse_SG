"use client";

import { Building2, Cross, Tent, X } from "lucide-react";
import type { TempFacility } from "@/types";
import { cn } from "@/lib/utils";

const KIND = {
  quarantine: { label: "Quarantine / Community Care", icon: Tent },
  treatment: { label: "Temporary Treatment Clinic", icon: Cross },
} as const;

/**
 * Right-panel details for a temporary emergency facility (campus space offered
 * as quarantine or treatment site) — the map's counterpart to HospitalDetail.
 */
export function TempFacilityDetail({
  facility,
  onClose,
}: {
  facility: TempFacility;
  onClose: () => void;
}) {
  const kind = KIND[facility.kind];
  const pct = Math.round((facility.occupied / facility.capacity) * 100);

  return (
    <div className="surface pointer-events-auto flex max-h-full flex-col overflow-hidden p-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-border p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
            <kind.icon className="size-5" />
          </span>
          <div>
            <p className="font-semibold leading-tight">{facility.name}</p>
            <span
              className={cn(
                "pill mt-1",
                facility.status === "active" ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"
              )}
            >
              {facility.status === "active" ? "Active" : "On standby"} · {kind.label}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="space-y-4 overflow-y-auto p-4 no-scrollbar">
        <p className="text-sm text-muted-foreground">{facility.purpose}</p>

        <div className="surface-muted flex items-center gap-3 p-3 text-sm">
          <Building2 className="size-4 shrink-0 text-info" />
          <span>
            Hosted by <span className="font-medium text-foreground">{facility.host}</span>
          </span>
        </div>

        {/* Capacity */}
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Capacity</span>
            <span className="font-semibold">
              {facility.occupied}/{facility.capacity} ({pct}%)
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full rounded-full",
                pct > 80 ? "bg-danger" : pct > 50 ? "bg-warning" : "bg-success"
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {facility.since} · Temporary facility stood up for the current health
          emergency — capacity and status are managed by emergency officers.
        </p>
      </div>
    </div>
  );
}
