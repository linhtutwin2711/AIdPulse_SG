"use client";

import { useState } from "react";
import { HeartPulse } from "lucide-react";
import { volunteerRoster } from "@/constants";
import { useMissions } from "@/components/providers/missions-provider";
import { useProfile } from "@/components/providers/profile-provider";
import { ImpactStats } from "@/components/volunteer/impact-stats";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { VolunteerProfile } from "@/types";

export default function OfficerVolunteersPage() {
  const { stats } = useMissions();
  const { displayName, initials } = useProfile();
  const [selected, setSelected] = useState<VolunteerProfile | null>(null);

  // The signed-in volunteer first (live stats), then the mock roster.
  const roster: VolunteerProfile[] = [
    { id: "you", name: displayName, initials, skills: ["General Volunteer"], stats, you: true },
    ...volunteerRoster,
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Volunteers</h1>
        <p className="text-sm text-muted-foreground">
          Browse volunteers and their impact. Click a volunteer to see their full profile.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roster.map((v) => (
          <button
            key={v.id}
            onClick={() => setSelected(v)}
            className="surface flex items-center gap-4 p-5 text-left transition-colors hover:border-gold/50"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-white">
              {v.initials}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold">{v.name}</p>
                {v.you && <span className="pill bg-info/15 text-[10px] text-info">You</span>}
              </div>
              <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                <HeartPulse className="size-3.5 text-danger" /> {v.stats.livesSupported} lives supported
              </p>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <DialogContent className="sm:max-w-lg">
            <div className="flex items-center gap-4">
              <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-lg font-bold text-white">
                {selected.initials}
              </span>
              <div>
                <DialogTitle className="text-xl">{selected.name}</DialogTitle>
                <DialogDescription>
                  {selected.you ? "Your volunteer profile" : "Volunteer profile"}
                </DialogDescription>
              </div>
            </div>

            <ImpactStats stats={selected.stats} className="mt-2 grid-cols-1 sm:grid-cols-3" />

            <div>
              <p className="text-sm font-medium">Skills &amp; Expertise</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selected.skills.map((s) => (
                  <span key={s} className="pill bg-secondary text-xs text-muted-foreground">{s}</span>
                ))}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
