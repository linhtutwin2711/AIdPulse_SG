"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  BedDouble,
  ClipboardPlus,
  MessagesSquare,
  QrCode,
  Radio,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

// The officer features, rendered beside each officer page's title so an
// officer can jump between tools without going back to the Command Center.
const LINKS = [
  { href: "/officer/broadcast", label: "Broadcast", icon: Radio },
  { href: "/officer/beds", label: "Beds", icon: BedDouble },
  { href: "/officer/chat", label: "Chat", icon: MessagesSquare },
  { href: "/officer/qr", label: "Mission QR", icon: QrCode },
  { href: "/officer/opportunities", label: "Opportunities", icon: ClipboardPlus },
  { href: "/officer/volunteers", label: "Volunteers", icon: Users },
];

export function OfficerNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Back to the officer dashboard (Command Center). */}
      <Link
        href="/officer/dashboard"
        aria-label="Back to officer dashboard"
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-card/60 text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
      </Link>
      <nav className="flex items-center gap-1 rounded-full border border-border bg-card/60 p-1">
        {LINKS.map((l) => {
          const active = pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn("nav-tab", active && "nav-tab-active")}
            >
              <l.icon className="size-4" />
              <span className="max-lg:hidden">{l.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
