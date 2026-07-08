"use client";

import { QRCodeSVG } from "qrcode.react";
import { CalendarDays, MapPin, QrCode } from "lucide-react";
import { OfficerNav } from "@/components/officer/officer-nav";
import { useMissions } from "@/components/providers/missions-provider";
import { statusClass } from "@/lib/ui";
import { cn } from "@/lib/utils";

export default function OfficerQrPage() {
  const { missions, generateCode } = useMissions();

  // Missions awaiting a volunteer on-site: assigned (need a code) or already
  // checked in (code issued).
  const list = missions.filter((m) => m.status === "assigned" || m.status === "ongoing");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mission QR Codes</h1>
          <p className="text-sm text-muted-foreground">
            Generate a check-in QR for a mission. Volunteers scan it (or enter the code) to check in on-site.
          </p>
        </div>
        <OfficerNav />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((m) => (
          <div key={m.id} className="surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{m.title}</p>
                <span className={cn("pill", statusClass[m.status])}>{m.status}</span>
              </div>
              <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                <p className="flex items-center gap-1.5"><MapPin className="size-3.5" /> {m.org} · {m.location}</p>
                <p className="flex items-center gap-1.5"><CalendarDays className="size-3.5" /> {m.date}</p>
              </div>

              {m.checkInCode ? (
                <p className="mt-3 text-sm">
                  Check-in code:{" "}
                  <span className="font-mono text-base font-semibold tracking-wider text-gold">{m.checkInCode}</span>
                </p>
              ) : (
                <button
                  onClick={() => generateCode(m.id)}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-gold/90"
                >
                  <QrCode className="size-4" /> Generate QR
                </button>
              )}
            </div>

            {m.checkInCode && (
              <div className="shrink-0 self-center rounded-xl bg-white p-3">
                <QRCodeSVG value={m.checkInCode} size={120} level="M" />
              </div>
            )}
          </div>
        ))}

        {list.length === 0 && (
          <div className="surface p-10 text-center text-sm text-muted-foreground md:col-span-2">
            No missions awaiting check-in. Volunteers can accept opportunities to create one.
          </div>
        )}
      </div>
    </div>
  );
}
