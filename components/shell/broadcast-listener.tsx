"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Radio, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Surfaces officer broadcasts inside the app. Polls /api/broadcast/latest and,
 * when a NEW broadcast appears (one sent after this tab loaded), shows a
 * notification-style alert at the top of the screen.
 *
 * This is the reliable delivery path: OS/Web Push still fires for lock-screen
 * notifications where supported, but this guarantees the alert is always
 * visible in any open app tab, regardless of notification permission or OS
 * settings. Mounted once in AppShell, so it runs on every authenticated screen.
 */

interface Broadcast {
  id: string;
  severity: string;
  area: string;
  message: string;
  ts: number;
}

const SEV_STYLE: Record<string, string> = {
  CRITICAL: "border-danger/60 bg-danger/15 text-danger",
  HIGH: "border-warning/60 bg-warning/15 text-warning",
  MODERATE: "border-info/60 bg-info/15 text-info",
  LOW: "border-success/60 bg-success/15 text-success",
};

const POLL_MS = 4000;

export function BroadcastListener() {
  const [alert, setAlert] = useState<Broadcast | null>(null);
  const lastSeenId = useRef<string | null>(null);
  const primed = useRef(false);

  useEffect(() => {
    let active = true;

    const poll = async () => {
      try {
        const res = await fetch("/api/broadcast/latest", { cache: "no-store" });
        if (!res.ok) return;
        const { broadcast } = (await res.json()) as { broadcast: Broadcast | null };
        if (!broadcast || !active) return;
        // First successful poll only records the baseline, so an alert sent
        // before this tab opened isn't shown as if it were brand new.
        if (!primed.current) {
          primed.current = true;
          lastSeenId.current = broadcast.id;
          return;
        }
        if (broadcast.id !== lastSeenId.current) {
          lastSeenId.current = broadcast.id;
          setAlert(broadcast);
        }
      } catch {
        /* offline / transient — try again next tick */
      }
    };

    poll();
    const iv = setInterval(poll, POLL_MS);
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, []);

  // Auto-dismiss after 12s (the alert also stays reachable on the dashboard).
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 12000);
    return () => clearTimeout(t);
  }, [alert]);

  if (!alert) return null;
  const sev = (alert.severity || "HIGH").toUpperCase();
  const style = SEV_STYLE[sev] ?? SEV_STYLE.HIGH;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4">
      <div
        role="alert"
        className={cn(
          "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur-md",
          "animate-in fade-in slide-in-from-top-4 duration-300",
          "bg-card/95",
          style,
        )}
      >
        <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl", style)}>
          <AlertTriangle className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
            <Radio className="size-3.5" />
            {sev} ALERT · {alert.area}
          </div>
          <p className="mt-1 text-sm leading-snug text-foreground">{alert.message}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">Emergency broadcast · AidPulse SG</p>
        </div>
        <button
          type="button"
          onClick={() => setAlert(null)}
          aria-label="Dismiss alert"
          className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
