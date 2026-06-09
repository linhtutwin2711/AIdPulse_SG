"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, FileText, Map as MapIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ProfileMenu } from "@/components/shell/profile-menu";
import { roleAccent, roleLabel } from "@/lib/ui";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

const TABS = [
  { href: "/dashboard", label: "Alerts", icon: Bell },
  { href: "/map", label: "Map", icon: MapIcon },
  { href: "/report", label: "Report", icon: FileText },
];

export function TopNav() {
  const pathname = usePathname();

  // The displayed role reflects the section you're actually in — not a sticky
  // flag. On the shared/citizen pages you're a normal user with no role title.
  const section: Role = pathname.startsWith("/volunteer")
    ? "volunteer"
    : pathname.startsWith("/officer")
      ? "officer"
      : "citizen";

  const homeHref =
    section === "volunteer"
      ? "/volunteer/dashboard"
      : section === "officer"
        ? "/officer/dashboard"
        : "/dashboard";

  const tabs = [{ ...TABS[0], href: homeHref }, TABS[1], TABS[2]];

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-6">
        <Logo href={homeHref} />

        <nav className="flex items-center gap-1 rounded-full border border-border bg-card/60 p-1">
          {tabs.map((t) => {
            const active = pathname === t.href || pathname.startsWith(t.href + "/");
            return (
              <Link
                key={t.label}
                href={t.href}
                className={cn("nav-tab", active && "nav-tab-active")}
              >
                <t.icon className="size-4" />
                {t.label}
              </Link>
            );
          })}
        </nav>

        {/* A normal user has no role title — it appears only in a role section. */}
        <ProfileMenu
          subtitle={section !== "citizen" ? roleLabel[section] : undefined}
          subtitleClass={roleAccent[section]}
        />
      </div>
    </header>
  );
}
