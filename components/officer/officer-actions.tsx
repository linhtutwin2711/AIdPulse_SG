"use client";

import Link from "next/link";
import { BedDouble, ClipboardPlus, MessagesSquare, QrCode, Radio, Users } from "lucide-react";
import { useMissions } from "@/components/providers/missions-provider";

const ACTIONS = [
  { href: "/officer/broadcast", icon: Radio, title: "Broadcast Alert", desc: "Send emergency alerts to citizens in affected areas." },
  { href: "/officer/beds", icon: BedDouble, title: "Hospital Beds", desc: "Update your hospital's real-time bed availability." },
  { href: "/officer/chat", icon: MessagesSquare, title: "Responder Chat", desc: "Coordinate securely with hospitals and response teams." },
  { href: "/officer/qr", icon: QrCode, title: "Mission QR", desc: "Generate check-in QR codes for volunteer missions." },
  { href: "/officer/opportunities", icon: ClipboardPlus, title: "Post Opportunity", desc: "Create volunteer opportunities for your hospital." },
  { href: "/officer/volunteers", icon: Users, title: "Volunteers", desc: "Browse volunteers, impact stats and cancellations." },
];

export function OfficerActions() {
  const { missions } = useMissions();
  // New volunteer cancellations awaiting review — badged on the Volunteers tile.
  const unseenCancellations = missions.filter((m) => m.status === "cancelled" && m.cancelSeen === false).length;

  return (
    <div className="surface p-5">
      <p className="flex items-center gap-2 font-semibold">
        Command Center
        <span className="pill bg-gold/15 text-gold">Authorized Officer</span>
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {ACTIONS.map((a) => {
          const badge = a.title === "Volunteers" ? unseenCancellations : 0;
          return (
            <Link key={a.title} href={a.href} className="surface-muted relative p-4 transition-colors hover:border-gold/50">
              {badge > 0 && (
                <span className="absolute right-3 top-3 flex min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-semibold text-white">
                  {badge}
                </span>
              )}
              <span className="flex size-10 items-center justify-center rounded-xl bg-gold/15 text-gold">
                <a.icon className="size-5" />
              </span>
              <p className="mt-3 font-medium">{a.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{a.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
