"use client";

import { useState } from "react";
import { Ban, CalendarDays, ClipboardList, Clock, HeartPulse, MapPin } from "lucide-react";
import { statusClass } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { useMissions } from "@/components/providers/missions-provider";
import { VolunteerNav } from "@/components/volunteer/volunteer-nav";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import type { Mission, MissionStatus } from "@/types";

const FILTERS: { id: MissionStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "assigned", label: "Assigned" },
  { id: "ongoing", label: "Ongoing" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

// Quick-pick reasons shown when a volunteer cancels; an optional note follows.
const CANCEL_REASONS = [
  "Schedule conflict",
  "Feeling unwell",
  "Found another mission",
  "Transport or location",
  "Personal emergency",
  "Other",
];

export default function MissionsPage() {
  const { missions: all, stats, cancelMission } = useMissions();
  const [filter, setFilter] = useState<MissionStatus | "all">("all");
  const missions = filter === "all" ? all : all.filter((m) => m.status === filter);

  // Cancellation dialog state. `cancelTarget` is the assigned mission being cancelled.
  const [cancelTarget, setCancelTarget] = useState<Mission | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  const openCancel = (m: Mission) => {
    setCancelTarget(m);
    setReason("");
    setNote("");
  };

  const confirmCancel = () => {
    if (!cancelTarget || !reason) return;
    cancelMission(cancelTarget.id, reason, note);
    setCancelTarget(null);
  };

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
              {m.status === "cancelled" && m.cancelReason && (
                <p className="mt-2 flex items-start gap-1.5 text-sm text-danger">
                  <Ban className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    Cancelled — {m.cancelReason}
                    {m.cancelNote && <span className="text-muted-foreground"> · {m.cancelNote}</span>}
                  </span>
                </p>
              )}
            </div>
            {m.status === "assigned" && (
              <Button
                variant="ghost"
                onClick={() => openCancel(m)}
                className="shrink-0 text-danger hover:bg-danger/10 hover:text-danger"
              >
                <Ban className="size-4" /> Cancel
              </Button>
            )}
          </div>
        ))}
        {missions.length === 0 && (
          <div className="surface p-10 text-center text-sm text-muted-foreground">
            No {filter} missions.
          </div>
        )}
      </div>

      <Dialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        {cancelTarget && (
          <DialogContent>
            <DialogTitle>Cancel this mission?</DialogTitle>
            <DialogDescription>
              Let the organising officer know why you can&apos;t make{" "}
              <span className="font-medium text-foreground">{cancelTarget.title}</span>. They&apos;ll be notified.
            </DialogDescription>

            <div>
              <p className="text-sm font-medium">Reason</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CANCEL_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      reason === r
                        ? "border-transparent bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-sm font-medium">
                Add a note <span className="text-muted-foreground">(optional)</span>
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Anything the officer should know…"
                className="mt-1.5 w-full resize-none rounded-xl border border-input bg-input/30 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring"
              />
            </label>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Keep mission</DialogClose>
              <Button
                onClick={confirmCancel}
                disabled={!reason}
                className="bg-danger text-white hover:bg-danger/90"
              >
                <Ban className="size-4" /> Cancel mission
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
