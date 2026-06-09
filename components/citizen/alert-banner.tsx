"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FileWarning,
  MapPin,
  Map as MapIcon,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Alert } from "@/types";

export function AlertBanner({ alert }: { alert: Alert }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Clickable card */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="surface glow-danger relative w-full overflow-hidden border-danger/40 p-5 text-left transition-colors hover:border-danger/70"
      >
        <div className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-danger/15 text-danger">
            <AlertTriangle className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <span className="pill bg-danger/15 text-danger">
              <Activity className="size-3" /> HIGH RISK AREA
            </span>
            <h2 className="mt-1.5 truncate text-xl font-bold">{alert.title}</h2>
            <p className="text-sm text-muted-foreground">{alert.message}</p>
            {alert.distanceKm != null && (
              <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-danger">
                <MapPin className="size-3.5" /> {alert.distanceKm} km from your location
              </p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 self-start max-md:hidden">
            <span className="text-xs text-muted-foreground">Updated {alert.updatedAgo}</span>
            <span className="flex items-center gap-1 text-xs font-medium text-danger">
              View details <ChevronRight className="size-3.5" />
            </span>
          </div>
        </div>
      </button>

      {/* Detail modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
          {/* Header */}
          <div className="glow-danger border-b border-border p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-danger/15 text-danger">
                <AlertTriangle className="size-6" />
              </span>
              <div className="min-w-0 pr-8">
                <span className="pill bg-danger/15 text-danger">
                  <Activity className="size-3" /> HIGH RISK · {alert.riskLevel ?? "High"}
                </span>
                <h2 className="mt-1.5 text-lg font-bold leading-snug">{alert.title}</h2>
                {alert.distanceKm != null && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-danger">
                    <MapPin className="size-3.5" /> {alert.distanceKm} km from your location
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5 p-5">
            {/* What happened */}
            {alert.details && (
              <p className="text-sm leading-relaxed text-muted-foreground">{alert.details}</p>
            )}

            {/* Information grid */}
            <div className="grid grid-cols-2 gap-2">
              <Info icon={MapPin} label="Distance from you" value={alert.distanceKm != null ? `${alert.distanceKm} km` : "—"} />
              <Info icon={Activity} label="Active cases" value={alert.activeCases?.toLocaleString() ?? "—"} accent="text-danger" />
              <Info icon={AlertTriangle} label="Risk level" value={alert.riskLevel ?? "High"} accent="text-danger" />
              <Info icon={CalendarClock} label="Updated" value={alert.updatedAgo} />
              <div className="col-span-2">
                <Info icon={MapPin} label="Affected area" value={`${alert.area} and nearby blocks`} />
              </div>
            </div>

            {/* Precautions */}
            {alert.precautions && alert.precautions.length > 0 && (
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="size-4 text-success" /> Safety Precautions
                </h3>
                <ul className="mt-2 space-y-2">
                  {alert.precautions.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Nearby affected areas */}
            {alert.nearbyAreas && alert.nearbyAreas.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold">Nearby Affected Areas</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {alert.nearbyAreas.map((a) => (
                    <span key={a} className="pill bg-secondary text-xs text-muted-foreground">
                      <MapPin className="size-3" /> {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Emergency contact */}
            <div className="surface-muted flex items-center gap-3 p-3 text-sm">
              <Phone className="size-4 shrink-0 text-danger" />
              <span className="text-muted-foreground">
                Medical emergency? Call <span className="font-semibold text-foreground">995</span> immediately.
              </span>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                className="flex-1"
                onClick={() => { setOpen(false); router.push("/map"); }}
              >
                <MapIcon className="size-4" /> View on Map
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setOpen(false); router.push("/report"); }}
              >
                <FileWarning className="size-4" /> Report Issue
              </Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Info({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="surface-muted p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </p>
      <p className={`mt-0.5 text-sm font-semibold ${accent ?? ""}`}>{value}</p>
    </div>
  );
}
