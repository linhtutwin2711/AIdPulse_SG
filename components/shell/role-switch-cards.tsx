"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  HeartHandshake,
  Lock,
  LogIn,
  ShieldAlert,
} from "lucide-react";
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

export function RoleSwitchCards() {
  const router = useRouter();
  const { setRole } = useRole();
  const [openRole, setOpenRole] = useState<LockedRole | null>(null);

  const active = CARDS.find((c) => c.role === openRole) ?? null;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((c) => (
          <button
            key={c.role}
            type="button"
            onClick={() => setOpenRole(c.role)}
            className={`surface flex items-center gap-4 p-5 text-left transition-colors ${c.hover}`}
          >
            <span className={`flex size-12 items-center justify-center rounded-xl ${c.accent}`}>
              <c.icon className="size-6" />
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{c.title}</p>
                <span className="pill bg-secondary text-[10px] text-muted-foreground">
                  <Lock className="size-2.5" /> Locked
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{c.cardDesc}</p>
            </div>
            <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>

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
