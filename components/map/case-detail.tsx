"use client";

import { useState } from "react";
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  ImageOff,
  MapPin,
  Navigation,
  PencilLine,
  ShieldAlert,
  User,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { caseTypeColor, caseTypeLabel, reportTypeColor, reportTypeLabel } from "@/lib/data";
import type { ActiveCase, Role } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_CLS: Record<ActiveCase["status"], string> = {
  active: "bg-success/15 text-success",
  pending: "bg-warning/15 text-warning",
  resolved: "bg-info/15 text-info",
  expired: "bg-secondary text-muted-foreground",
};

const RISK_CLS: Record<ActiveCase["riskLevel"], string> = {
  high: "bg-danger/15 text-danger",
  medium: "bg-warning/15 text-warning",
  low: "bg-success/15 text-success",
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function CaseDetail({
  item,
  role,
  onClose,
  onViewNearby,
  onReportUpdate,
  onResolve,
}: {
  item: ActiveCase;
  role: Role;
  onClose: () => void;
  onViewNearby: () => void;
  onReportUpdate: () => void;
  onResolve: () => void;
}) {
  const color = (item.reportType && reportTypeColor[item.reportType]) ?? caseTypeColor[item.caseType];
  const label = (item.reportType && reportTypeLabel[item.reportType]) ?? caseTypeLabel[item.caseType];

  return (
    <div className="surface flex max-h-full flex-col overflow-hidden p-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-border p-4">
        <div className="flex items-center gap-3">
          <span
            className="flex size-10 items-center justify-center rounded-xl"
            style={{ background: `${color}26`, color }}
          >
            <Activity className="size-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Case Details</p>
            <p className="font-semibold leading-tight">{item.title}</p>
            <span className="pill mt-1" style={{ background: `${color}26`, color }}>
              {label}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4 no-scrollbar">
        {/* Location + meta */}
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="size-4 text-muted-foreground" /> {item.locationName}
          </p>
          <p className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Navigation className="size-3" /> {item.distanceKm} km away</span>
            <span className="inline-flex items-center gap-1"><CalendarClock className="size-3" /> Reported {item.reportedAgo}</span>
          </p>
        </div>

        {/* Status + risk grid */}
        <div className="grid grid-cols-2 gap-2">
          <Info icon={Activity} label="Status">
            <span className={cn("pill", STATUS_CLS[item.status])}>{cap(item.status)}</span>
          </Info>
          <Info icon={ShieldAlert} label="Risk Level">
            <span className={cn("pill", RISK_CLS[item.riskLevel])}>{cap(item.riskLevel)}</span>
          </Info>
        </div>

        {/* Description */}
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">What happened</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
        </div>

        {/* Uploaded photos */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Uploaded Photos</p>
          {item.imageUrls.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {item.imageUrls.map((src, i) => (
                <Photo key={i} src={src} />
              ))}
            </div>
          ) : (
            <div className="surface-muted flex items-center gap-2 p-3 text-sm text-muted-foreground">
              <ImageOff className="size-4" /> No photos uploaded yet.
            </div>
          )}
        </div>

        {/* Reported by + nearby */}
        <div className="grid grid-cols-2 gap-2">
          <Info icon={User} label="Reported by">
            <span className="text-sm font-medium">{item.reportedBy}</span>
          </Info>
          <Info icon={Users} label="Nearby cases">
            <span className="text-sm font-medium">{item.nearbyCases}</span>
          </Info>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2 border-t border-border p-4">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onViewNearby}>
            <Navigation className="size-4" /> View Nearby
          </Button>
          <Button onClick={onReportUpdate}>
            <PencilLine className="size-4" /> Report Update
          </Button>
        </div>
        {role === "officer" && (
          <Button
            variant="outline"
            onClick={onResolve}
            className="w-full border-success/40 text-success hover:bg-success/10 hover:text-success"
          >
            <CheckCircle2 className="size-4" /> Mark as Resolved
          </Button>
        )}
      </div>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface-muted p-3">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/** Photo thumbnail with a graceful fallback if the image fails to load. */
function Photo({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground">
        <ImageOff className="size-5" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Uploaded report photo"
      onError={() => setFailed(true)}
      className="aspect-square w-full rounded-lg border border-border object-cover"
    />
  );
}
