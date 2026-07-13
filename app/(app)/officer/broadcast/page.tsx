"use client";

import { useState } from "react";
import { Radio, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OfficerNav } from "@/components/officer/officer-nav";
import { cn } from "@/lib/utils";
import type { Severity } from "@/types";

const SEVERITIES: Severity[] = ["critical", "high", "moderate", "low"];
const SEV_CLASS: Record<Severity, string> = {
  critical: "border-danger bg-danger/10 text-danger",
  high: "border-warning bg-warning/10 text-warning",
  moderate: "border-info bg-info/10 text-info",
  low: "border-success bg-success/10 text-success",
};

export default function BroadcastPage() {
  const [severity, setSeverity] = useState<Severity>("high");
  const [area, setArea] = useState("Tanjong Pagar");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const [delivered, setDelivered] = useState<number | null>(null);

  const sendBroadcast = async () => {
    setSending(true);
    setSent(false);
    setSendError(false);
    setDelivered(null);
    // The draft is only cleared once the broadcast is accepted — a failed
    // send keeps the message so the officer can retry, not retype.
    try {
      const res = await fetch("/api/broadcast/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area, severity, message }),
      });
      if (res.ok) {
        const data = await res.json();
        setDelivered(data.delivered ?? 0);
        setSent(true);
        setMessage("");
      } else if (res.status === 503) {
        // Push not configured (demo mode) — the in-app broadcast still counts.
        setSent(true);
        setMessage("");
      } else {
        setSendError(true);
      }
    } catch {
      setSendError(true); // offline — draft stays for retry
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex justify-end">
        <OfficerNav />
      </div>

      <section className="surface p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-danger/15 text-danger">
            <Radio className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold">Broadcast Alert</h1>
            <p className="text-sm text-muted-foreground">Notify citizens in affected areas instantly.</p>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); void sendBroadcast(); }} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Target Area</span>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-input bg-input/30 px-3 py-2.5 text-sm outline-none"
            >
              <option>Tanjong Pagar</option>
              <option>Geylang</option>
              <option>Queenstown</option>
              <option>All Singapore</option>
            </select>
          </label>

          <div>
            <span className="text-sm font-medium">Severity</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {SEVERITIES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                    severity === s ? SEV_CLASS[s] : "border-border text-muted-foreground"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-medium">Message</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Compose the alert citizens will receive…"
              className="mt-1.5 w-full rounded-xl border border-input bg-input/30 px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>

          {sent && (
            <p className="rounded-xl bg-success/10 px-4 py-3 text-sm text-success">
              ✓ Broadcast sent. It appears live in every open AidPulse app.
              {delivered !== null &&
                ` ${delivered} device${delivered === 1 ? "" : "s"} also received a push notification on their lock screen.`}
            </p>
          )}
          {sendError && (
            <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
              Broadcast could not be delivered — check your connection and try
              again. Your message has been kept.
            </p>
          )}

          <Button type="submit" size="lg" disabled={!message.trim() || sending} className="h-12 w-full text-base">
            <Send className="size-5" /> {sending ? "Sending…" : "Send Broadcast"}
          </Button>
        </form>
      </section>
    </div>
  );
}
