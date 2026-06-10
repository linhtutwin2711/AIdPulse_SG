"use client";

import { useState } from "react";
import { Ban, ChevronDown, HeartPulse } from "lucide-react";
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
import type { MissionCancellation, VolunteerProfile } from "@/types";

// Relative-time label for a cancellation. Only rendered inside the profile
// dialog (which opens on click), so it never runs in the SSR pass.
function whenLabel(iso?: string): string {
  if (!iso) return "recently";
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "recently";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr${hr > 1 ? "s" : ""} ago`;
  const day = Math.floor(hr / 24);
  return `${day} day${day > 1 ? "s" : ""} ago`;
}

// One cancellation entry inside a volunteer's profile dialog.
function CancellationCard({ c }: { c: MissionCancellation }) {
  return (
    <div className="surface-muted p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{c.title}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{c.when}</span>
      </div>
      <p className="mt-0.5 flex items-center gap-1.5 text-danger">
        <Ban className="size-3.5 shrink-0" /> {c.reason}
      </p>
      {c.note && <p className="mt-1 text-muted-foreground">{c.note}</p>}
    </div>
  );
}

export default function OfficerVolunteersPage() {
  const { stats, missions, markCancellationsSeen } = useMissions();
  const { displayName, initials } = useProfile();
  const [selected, setSelected] = useState<VolunteerProfile | null>(null);

  // The signed-in volunteer's cancellations come live from their mission list.
  const youCancellations: MissionCancellation[] = missions
    .filter((m) => m.status === "cancelled" && m.cancelReason)
    .map((m) => ({ title: m.title, reason: m.cancelReason!, note: m.cancelNote, when: whenLabel(m.cancelledAt) }));
  // New (unacknowledged) cancellations drive the red dot + review banner.
  const unseenCount = missions.filter((m) => m.status === "cancelled" && m.cancelSeen === false).length;

  // The signed-in volunteer first (live stats), then the mock roster.
  const roster: VolunteerProfile[] = [
    { id: "you", name: displayName, initials, skills: ["General Volunteer"], stats, you: true, cancellations: youCancellations },
    ...volunteerRoster,
  ];

  // Opening the signed-in volunteer's profile acknowledges their cancellations.
  const openProfile = (v: VolunteerProfile) => {
    setSelected(v);
    if (v.you) markCancellationsSeen();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Volunteers</h1>
        <p className="text-sm text-muted-foreground">
          Browse volunteers and their impact. Click a volunteer to see their full profile and any cancellations.
        </p>
      </div>

      {unseenCount > 0 && (
        <div className="surface flex items-center gap-3 border-warning/40 p-4 text-sm text-warning">
          <Ban className="size-5 shrink-0" />
          <span>
            {unseenCount} new mission {unseenCount === 1 ? "cancellation" : "cancellations"} to review — open the volunteer&apos;s profile to see why.
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roster.map((v) => {
          const cancelCount = v.cancellations?.length ?? 0;
          const showDot = !!v.you && unseenCount > 0;
          return (
            <button
              key={v.id}
              onClick={() => openProfile(v)}
              className="surface relative flex items-center gap-4 p-5 text-left transition-colors hover:border-gold/50"
            >
              {showDot && <span className="absolute right-3 top-3 size-2.5 rounded-full bg-danger ring-2 ring-card" />}
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-white">
                {v.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold">{v.name}</p>
                  {v.you && <span className="pill bg-info/15 text-[10px] text-info">You</span>}
                  {cancelCount > 0 && (
                    <span className="pill gap-1 bg-warning/15 text-[10px] text-warning">
                      <Ban className="size-2.5" /> {cancelCount} cancelled
                    </span>
                  )}
                </div>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                  <HeartPulse className="size-3.5 text-danger" /> {v.stats.livesSupported} lives supported
                </p>
              </div>
            </button>
          );
        })}
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

            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Ban className="size-3.5 text-warning" /> Cancellations
                {selected.cancellations && selected.cancellations.length > 0 && (
                  <span className="pill bg-warning/15 text-[10px] text-warning">
                    {selected.cancellations.length}
                  </span>
                )}
              </p>
              {selected.cancellations && selected.cancellations.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {/* Up to 2 show inline; the rest collapse into a dropdown. */}
                  {selected.cancellations.slice(0, 2).map((c, i) => (
                    <CancellationCard key={i} c={c} />
                  ))}
                  {selected.cancellations.length > 2 && (
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg px-1 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                        <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                        Show {selected.cancellations.length - 2} more
                      </summary>
                      <div className="mt-2 space-y-2">
                        {selected.cancellations.slice(2).map((c, i) => (
                          <CancellationCard key={i} c={c} />
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No cancellations — great reliability.</p>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
