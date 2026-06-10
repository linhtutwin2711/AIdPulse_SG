"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, HeartPulse, Lock, LogOut, MapPin, QrCode, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CHECKOUT_LOCK_MS, useMissions } from "@/components/providers/missions-provider";
import { statusClass } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { VolunteerNav } from "@/components/volunteer/volunteer-nav";
import { QrScanner } from "@/components/volunteer/qr-scanner";

const fmt = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export default function CheckinPage() {
  const { activeMission, checkInWithCode, checkOut } = useMissions();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [reporting, setReporting] = useState(false);
  const [count, setCount] = useState("");
  // Captured at check-out so the success message survives the mission leaving
  // the active slot.
  const [result, setResult] = useState<{ title: string; count: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Tick once a second while checked in so the countdown / unlock updates live.
  useEffect(() => {
    if (!activeMission?.checkInAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeMission?.checkInAt]);

  const checkInMs = activeMission?.checkInAt ? new Date(activeMission.checkInAt).getTime() : 0;
  const remaining = Math.max(0, CHECKOUT_LOCK_MS - (now - checkInMs));
  const canCheckOut = Boolean(activeMission) && remaining <= 0;

  // Feeds a code (typed manually or decoded from the camera) into check-in.
  const attemptCheckIn = (value: string) => {
    const m = checkInWithCode(value);
    if (!m) {
      setError("Invalid or unknown code. Check the mission QR and try again.");
      return;
    }
    setError("");
    setCode("");
    setResult(null);
  };

  const handleCheckIn = () => attemptCheckIn(code);

  const handleConfirm = () => {
    if (!activeMission) return;
    const n = Math.max(0, parseInt(count || "0", 10));
    checkOut(activeMission.id, n);
    setResult({ title: activeMission.title, count: n });
    setReporting(false);
    setCount("");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Check-in / Check-out</h1>
          <p className="text-sm text-muted-foreground">
            Scan the mission QR code or enter the code manually.
          </p>
        </div>
        <VolunteerNav />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
      {/* Scanner */}
      <section className="surface p-6">
        {activeMission ? (
          /* Already checked in — nothing to scan. */
          <div className="grid aspect-square place-items-center overflow-hidden rounded-2xl border border-dashed border-border bg-secondary/30 text-center text-muted-foreground">
            <div>
              <CheckCircle2 className="mx-auto size-10 text-success" />
              <p className="mt-2 text-sm">You&apos;re checked in</p>
              <p className="text-xs">Complete your mission to scan another</p>
            </div>
          </div>
        ) : (
          <QrScanner onScan={(text) => { setCode(text); attemptCheckIn(text); }} />
        )}

        <div className="mt-5">
          <p className="mb-2 text-sm font-medium">Or enter code manually</p>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => { setCode(e.target.value); setError(""); }}
              placeholder="e.g. AID-4827"
              disabled={!!activeMission}
              className="flex-1 rounded-xl border border-input bg-input/30 px-3 py-2.5 text-sm uppercase outline-none placeholder:text-muted-foreground disabled:opacity-50"
            />
            <Button onClick={handleCheckIn} disabled={!code.trim() || !!activeMission} className="h-auto px-4">
              <QrCode className="size-4" /> Verify
            </Button>
          </div>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          {activeMission && (
            <p className="mt-2 text-sm text-muted-foreground">
              You&apos;re checked in. Complete your current mission before checking into another.
            </p>
          )}
        </div>
      </section>

      {/* Active mission */}
      <section className="surface p-6">
        <p className="font-semibold">Current Mission</p>

        {activeMission ? (
          <>
            <div className="surface-muted mt-3 p-4">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{activeMission.title}</p>
                <span className={cn("pill", statusClass[activeMission.status])}>{activeMission.status}</span>
              </div>
              <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                <p className="flex items-center gap-2"><MapPin className="size-4" /> {activeMission.org} · {activeMission.location}</p>
                <p className="flex items-center gap-2"><Clock className="size-4" /> {activeMission.date}</p>
              </div>
            </div>

            {reporting ? (
              /* Step 2: record how many people were supported */
              <>
                <label className="mt-4 block">
                  <span className="text-sm font-medium">People supported on this mission</span>
                  <input
                    value={count}
                    onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))}
                    inputMode="numeric"
                    placeholder="e.g. 24"
                    autoFocus
                    className="mt-1.5 w-full rounded-xl border border-input bg-input/30 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring"
                  />
                  <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <HeartPulse className="size-3" /> Counts toward your Lives Supported total.
                  </span>
                </label>
                <Button
                  onClick={handleConfirm}
                  disabled={count.trim() === ""}
                  size="lg"
                  className="mt-4 h-12 w-full bg-success text-success-foreground text-base hover:bg-success/90"
                >
                  <CheckCircle2 className="size-5" /> Confirm check-out
                </Button>
              </>
            ) : (
              /* Step 1: on-site, waiting out the minimum time lock */
              <>
                <div className={cn(
                  "mt-4 flex items-center gap-3 rounded-xl p-4 text-sm",
                  canCheckOut ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                )}>
                  {canCheckOut ? <CheckCircle2 className="size-5 shrink-0" /> : <Timer className="size-5 shrink-0" />}
                  {canCheckOut
                    ? "Minimum time complete. You can now check out."
                    : `Check-out unlocks in ${fmt(remaining)} — please stay on-site.`}
                </div>
                <Button
                  onClick={() => setReporting(true)}
                  disabled={!canCheckOut}
                  size="lg"
                  className="mt-4 h-12 w-full bg-secondary text-foreground text-base hover:bg-secondary/80"
                >
                  {canCheckOut ? <><LogOut className="size-5" /> Check Out</> : <><Lock className="size-5" /> Check Out Locked</>}
                </Button>
              </>
            )}
          </>
        ) : result ? (
          /* Just completed a check-out */
          <>
            <div className="mt-3 flex items-center gap-3 rounded-xl bg-info/10 p-4 text-sm text-info">
              <CheckCircle2 className="size-5 shrink-0" />
              Checked out of {result.title} — {result.count} {result.count === 1 ? "life" : "lives"} supported recorded.
            </div>
            <Button onClick={() => setResult(null)} size="lg" variant="secondary" className="mt-4 h-12 w-full text-base">
              <CheckCircle2 className="size-5" /> Done
            </Button>
          </>
        ) : (
          <div className="surface-muted mt-3 p-4 text-sm text-muted-foreground">
            Scan a mission QR or enter its code to check in.
          </div>
        )}
      </section>
      </div>
    </div>
  );
}
