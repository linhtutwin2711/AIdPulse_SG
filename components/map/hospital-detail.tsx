"use client";

import { useState } from "react";
import { Activity, Building2, MapPin, Phone, X } from "lucide-react";
import { bedSummary, getCaseMarkers } from "@/lib/data";
import { hospitalFillColor } from "./hospital-marker";
import type { Hospital } from "@/types";
import { cn } from "@/lib/utils";

const STATUS = {
  available: { label: "Available", cls: "bg-success/15 text-success" },
  limited: { label: "Limited", cls: "bg-warning/15 text-warning" },
  full: { label: "Full", cls: "bg-danger/15 text-danger" },
} as const;

const TABS = ["beds", "info", "cases"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  beds: "Bed Availability",
  info: "Hospital Info",
  cases: "Active Cases",
};

export function HospitalDetail({
  hospital,
  onClose,
}: {
  hospital: Hospital;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("beds");
  const b = bedSummary(hospital);
  const status = STATUS[b.status];

  return (
    <div className="surface flex max-h-full flex-col overflow-hidden p-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-border p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-info/15 text-info">
            <Building2 className="size-5" />
          </span>
          <div>
            <p className="font-semibold leading-tight">{hospital.name}</p>
            <span className={cn("pill mt-1", status.cls)}>{status.label} · {b.occupancy}% full</span>
          </div>
        </div>
        <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Close">
          <X className="size-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border px-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "relative flex-1 py-2.5 text-xs font-medium transition-colors",
              tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {TAB_LABEL[t]}
            {tab === t && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        {tab === "beds" && (
          <div className="space-y-4">
            {/* Overall */}
            <div className="surface-muted p-4 text-center">
              <p className="text-xs text-muted-foreground">Overall Availability</p>
              <p className="mt-1 text-3xl font-bold">{100 - b.occupancy}%</p>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${b.occupancy}%`, background: hospitalFillColor(b.occupancy) }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{b.occupancy}% occupied</p>
            </div>

            {/* Totals */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="surface-muted py-3">
                <p className="text-xl font-bold">{b.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="surface-muted py-3">
                <p className="text-xl font-bold text-danger">{b.occupied}</p>
                <p className="text-xs text-muted-foreground">Occupied</p>
              </div>
              <div className="surface-muted py-3">
                <p className="text-xl font-bold text-success">{b.available}</p>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
            </div>

            {/* Departments */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Departments</p>
              {hospital.departments.map((d) => {
                const pct = Math.round((d.occupied / d.total) * 100);
                return (
                  <div key={d.name}>
                    <div className="flex items-center justify-between text-sm">
                      <span>{d.name}</span>
                      <span className="text-muted-foreground">{d.occupied}/{d.total}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: hospitalFillColor(pct) }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "info" && (
          <ul className="space-y-3 text-sm">
            <InfoRow icon={Building2} label="Type" value={hospital.type ?? "Hospital"} />
            <InfoRow icon={MapPin} label="Address" value={hospital.address ?? "—"} />
            <InfoRow icon={Phone} label="Contact" value={hospital.phone ?? "—"} />
            <InfoRow icon={MapPin} label="Coordinates" value={`${hospital.lat.toFixed(4)}, ${hospital.lng.toFixed(4)}`} />
          </ul>
        )}

        {tab === "cases" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Active cases reported nearby</p>
            {getCaseMarkers().slice(0, 5).map((c) => (
              <div key={c.id} className="surface-muted flex items-center justify-between p-3 text-sm">
                <span className="flex items-center gap-2">
                  <Activity className="size-4 text-danger" /> {c.area}
                  <span className="capitalize text-muted-foreground">· {c.type}</span>
                </span>
                <span className="font-semibold">{c.cases}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <li className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </li>
  );
}
