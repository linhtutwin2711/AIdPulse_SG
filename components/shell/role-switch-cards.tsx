"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  HeartHandshake,
  Lock,
  LogIn,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/components/providers/role-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Role } from "@/types";

type LockedRole = Extract<Role, "volunteer" | "officer">;

const CARDS: {
  role: LockedRole;
  icon: typeof HeartHandshake;
  accent: string;
  hover: string;
  title: string;
  cardDesc: string;
  dialogTitle: string;
  dialogDesc: string;
  primaryLabel: string;
  primaryHref: string;
  note?: string;
}[] = [
  {
    role: "volunteer",
    icon: HeartHandshake,
    accent: "text-success bg-success/15",
    hover: "hover:border-success/50",
    title: "Volunteer",
    cardDesc: "Register to access volunteer features",
    dialogTitle: "Unlock Volunteer Access",
    dialogDesc:
      "Volunteer features are locked. Register to find nearby opportunities, manage missions, and check in to tasks.",
    primaryLabel: "Register as Volunteer",
    primaryHref: "/volunteer/register",
  },
  {
    role: "officer",
    icon: ShieldAlert,
    accent: "text-gold bg-gold/15",
    hover: "hover:border-gold/50",
    title: "Emergency Officer",
    cardDesc: "Register to access officer features",
    dialogTitle: "Emergency Officer Access",
    dialogDesc:
      "Officer tools are restricted to authorized responders. Continue to secure, multi-step verification to unlock them.",
    primaryLabel: "Continue to Verification",
    primaryHref: "/officer/access",
    note: "Authorized responders only. All access is logged.",
  },
];

type CardDef = (typeof CARDS)[number];

/** Shared inner content for a role card (icon, title, locked badge, subtitle, arrow). */
function CardBody({ c }: { c: CardDef }) {
  return (
    <>
      <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", c.accent)}>
        <c.icon className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold">{c.title}</p>
          <span className="pill bg-secondary text-[10px] text-muted-foreground">
            <Lock className="size-2.5" /> Locked
          </span>
        </div>
        <p className="truncate text-sm text-muted-foreground">{c.cardDesc}</p>
      </div>
      <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
    </>
  );
}

export function RoleSwitchCards({ variant = "grid" }: { variant?: "grid" | "map" }) {
  const router = useRouter();
  const { setRole } = useRole();
  const [openRole, setOpenRole] = useState<LockedRole | null>(null);
  const [expanded, setExpanded] = useState(false);

  const active = CARDS.find((c) => c.role === openRole) ?? null;

  return (
    <>
      {variant === "map" ? (
        /* Map: space is tight, so collapse to a compact anchor button; the two
           cards slide/fade out to its right (staggered) when expanded. */
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="surface z-10 flex shrink-0 items-center gap-3 p-4 text-left transition-colors hover:border-border"
          >
            <span className="flex -space-x-2.5">
              {CARDS.map((c) => (
                <span
                  key={c.role}
                  className={cn("flex size-10 items-center justify-center rounded-xl border-2 border-card", c.accent)}
                >
                  <c.icon className="size-5" />
                </span>
              ))}
            </span>
            <span className="hidden xl:block">
              <span className="block font-semibold leading-tight">Access Roles</span>
              <span className="block text-xs text-muted-foreground">Volunteer · Officer</span>
            </span>
            <ChevronRight
              className={cn(
                "size-5 shrink-0 text-muted-foreground transition-transform duration-300",
                expanded && "rotate-180"
              )}
            />
          </button>

          {CARDS.map((c, i) => (
            <button
              key={c.role}
              type="button"
              onClick={() => setOpenRole(c.role)}
              tabIndex={expanded ? 0 : -1}
              aria-hidden={!expanded}
              style={{ transitionDelay: expanded ? `${i * 70}ms` : "0ms" }}
              className={cn(
                "surface flex shrink-0 items-center gap-4 overflow-hidden whitespace-nowrap text-left transition-all duration-300 ease-out",
                c.hover,
                expanded
                  ? "ml-3 w-[15rem] translate-x-0 p-5 opacity-100"
                  : "pointer-events-none ml-0 w-0 -translate-x-3 border-0 p-0 opacity-0"
              )}
            >
              <CardBody c={c} />
            </button>
          ))}
        </div>
      ) : (
        /* Default (dashboard): two cards always shown side by side. */
        <div className="grid gap-4 sm:grid-cols-2">
          {CARDS.map((c) => (
            <button
              key={c.role}
              type="button"
              onClick={() => setOpenRole(c.role)}
              className={cn("surface flex items-center gap-4 p-5 text-left transition-colors", c.hover)}
            >
              <CardBody c={c} />
            </button>
          ))}
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setOpenRole(null)}>
        {active && (
          <DialogContent className="sm:max-w-md">
            <div className="flex flex-col items-center gap-3 pt-2 text-center">
              <span className={`flex size-14 items-center justify-center rounded-2xl ${active.accent}`}>
                <active.icon className="size-7" />
              </span>
              <DialogTitle className="text-xl">{active.dialogTitle}</DialogTitle>
              <DialogDescription className="text-sm">{active.dialogDesc}</DialogDescription>
            </div>

            <div className="mt-2 space-y-2">
              <Button
                size="lg"
                onClick={() => { setOpenRole(null); router.push(active.primaryHref); }}
                className="h-12 w-full text-base"
              >
                {active.primaryLabel} <ArrowRight className="size-5" />
              </Button>

              {active.role === "volunteer" && (
                <Button
                  variant="ghost"
                  className="h-10 w-full"
                  onClick={() => { setRole("volunteer"); setOpenRole(null); router.push("/volunteer/dashboard"); }}
                >
                  <LogIn className="size-4" /> I&apos;m already a volunteer
                </Button>
              )}
            </div>

            {active.note && (
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="size-3" /> {active.note}
              </p>
            )}
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
