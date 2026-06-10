import { ClipboardList, Clock, HeartPulse } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VolunteerStats } from "@/types";

/** The three volunteer impact tiles, shared by the volunteer's own profile and
 *  the officer roster so they always read the same way. */
export function ImpactStats({ stats, className }: { stats: VolunteerStats; className?: string }) {
  const cards = [
    { icon: ClipboardList, label: "Total Missions", value: stats.totalMissions, c: "text-info bg-info/15" },
    { icon: Clock, label: "Volunteering Hours", value: stats.hours, c: "text-warning bg-warning/15" },
    { icon: HeartPulse, label: "Lives Supported", value: stats.livesSupported, c: "text-danger bg-danger/15" },
  ];
  return (
    <div className={cn("grid gap-4 sm:grid-cols-3", className)}>
      {cards.map((s) => (
        <div key={s.label} className="surface-muted flex items-center gap-4 p-4">
          <span className={cn("flex size-11 items-center justify-center rounded-xl", s.c)}>
            <s.icon className="size-5" />
          </span>
          <div>
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
