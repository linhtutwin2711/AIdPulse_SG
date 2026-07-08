"use client";

import Link from "next/link";
import { ArrowRight, Lock, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The Emergency Officer entry on the volunteer dashboard, shown in a locked
 * state that mirrors the citizen dashboard's role-switch cards: gold officer
 * accent, a neutral "Locked" pill next to the title, and a trailing arrow.
 * Clicking it opens a short "this is locked" dialog instead of navigating
 * straight into the officer flow.
 */
export function OfficerLockedCard() {
  return (
    <Dialog>
      <DialogTrigger
        className={cn(
          "surface flex w-full items-center gap-4 p-5 text-left transition-colors",
          "hover:border-gold/50",
        )}
        aria-label="Emergency Officer (locked)"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
          <ShieldAlert className="size-6" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold">Emergency Officer</p>
            <span className="pill bg-gold/15 text-[10px] text-gold">
              <Lock className="size-2.5" /> Restricted
            </span>
          </div>
          <p className="truncate text-sm text-muted-foreground">
            For authorized agency personnel only
          </p>
        </div>

        <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <span className="flex size-11 items-center justify-center rounded-xl bg-gold/15 text-gold">
            <ShieldAlert className="size-5" />
          </span>
          <DialogTitle>Higher clearance required</DialogTitle>
          <DialogDescription>
            Emergency Officer is a restricted role for authorized personnel of
            response agencies (MOH, SCDF, NEA, hospital emergency departments).
            Unlocking it requires verification: upload your official
            appointment/authorization letter for AI review, then confirm a
            one-time code.
          </DialogDescription>
        </DialogHeader>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="size-3 shrink-0" />
          All access attempts are logged and monitored for security.
        </p>
        <DialogFooter showCloseButton>
          <DialogClose
            nativeButton={false}
            render={
              <Link
                href="/officer/access"
                className={cn(buttonVariants(), "bg-gold text-black hover:bg-gold/90")}
              />
            }
          >
            Proceed to Verification
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
