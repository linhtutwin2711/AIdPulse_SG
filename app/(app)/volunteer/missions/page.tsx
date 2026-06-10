"use client";

import { useState } from "react";
import { CalendarDays, ClipboardList, Clock, HeartPulse, MapPin } from "lucide-react";
import { statusClass } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { useMissions } from "@/components/providers/missions-provider";
import { VolunteerNav } from "@/components/volunteer/volunteer-nav";
import type { MissionStatus } from "@/types";

const FILTERS: { id: MissionStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "assigned", label: "Assigned" },
  { id: "ongoing", label: "Ongoing" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

export default function MissionsPage() {
  const { missions: all, stats } = useMissions();
  const [filter, setFilter] = useState<MissionStatus | "all">("all");
  const missions = filter === "all" ? all : all.filter((m) => m.status === filter);

  const STAT_CARDS = [
    { icon: ClipboardList, label: "Total Missions", value: stats.totalMissions, c: "text-info bg-info/15" },
    { icon: Clock, label: "Volunteering Hours", value: stats.hours, c: "text-warning bg-warning/15" },
    { icon: HeartPulse, label: "Lives Supported", value: stats.livesSupported, c: "text-danger bg-danger/15" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Missions</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage all your volunteering missions in one place.
          </p>
        </div>
        <VolunteerNav />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {STAT_CARDS.map((s) => (
          <div key={s.label} className="surface flex items-center gap-4 p-5">
            <span className={cn("flex size-12 items-center justify-center rounded-xl", s.c)}>
              <s.icon className="size-6" />
            </span>
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              filter === f.id ? "border-transparent bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {missions.map((m) => (
          <div key={m.id} className="surface flex items-center justify-between gap-4 p-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{m.title}</p>
                <span className={cn("pill", statusClass[m.status])}>{m.status}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span>{m.org}</span>
                <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {m.location}</span>
                <span className="flex items-center gap-1"><CalendarDays className="size-3.5" /> {m.date}</span>
                {m.hours > 0 && <span className="flex items-center gap-1"><Clock className="size-3.5" /> {m.hours}h</span>}
                {typeof m.beneficiaries === "number" && (
                  <span className="flex items-center gap-1"><HeartPulse className="size-3.5" /> {m.beneficiaries} lives</span>
                )}
              </div>
            </div>
          </div>
        ))}
        {missions.length === 0 && (
          <div className="surface p-10 text-center text-sm text-muted-foreground">
            No {filter} missions.
          </div>
        )}
      </div>
    </div>
  );
}
