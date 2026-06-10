"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, MapPinned, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";

// The three volunteer features. Rendered beside each volunteer page's title so
// a volunteer can jump straight between them without going back to the
// dashboard / Alerts page first.
const LINKS = [
  { href: "/volunteer/missions", label: "Missions", icon: ClipboardList },
  { href: "/volunteer/opportunities", label: "Opportunities", icon: MapPinned },
  { href: "/volunteer/checkin", label: "Check-in", icon: QrCode },
];

export function VolunteerNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex items-center gap-1 rounded-full border border-border bg-card/60 p-1", className)}>
      {LINKS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(l.href + "/");
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn("nav-tab", active && "nav-tab-active")}
          >
            <l.icon className="size-4" />
            <span className="max-sm:hidden">{l.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
