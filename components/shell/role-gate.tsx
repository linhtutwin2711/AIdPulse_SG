"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { useRole } from "@/components/providers/role-provider";
import { buttonVariants } from "@/components/ui/button";
import { roleLabel } from "@/lib/ui";
import { cn } from "@/lib/utils";
import type { Role } from "@/types";

const roleHome: Record<Role, string> = {
  citizen: "/dashboard",
  volunteer: "/volunteer/dashboard",
  officer: "/officer/dashboard",
};

/**
 * Locks a whole section to a single role. Anyone whose persisted role doesn't
 * match `require` sees a "locked" screen instead of the page — they can head
 * back to their own dashboard or open the section's sign-in / registration
 * page (`gate`), which stays reachable by everyone so they can earn access.
 * This is what keeps an emergency officer out of the volunteer pages (and
 * vice versa), and citizens out of both.
 */
export function RoleGate({
  require,
  gate,
  gateLabel,
  sectionLabel,
  children,
}: {
  require: Role;
  gate: string;
  gateLabel: string;
  sectionLabel: string;
  children: React.ReactNode;
}) {
  const { role, hydrated } = useRole();
  const pathname = usePathname();

  const onGate = pathname === gate || pathname.startsWith(gate + "/");
  const allowed = role === require || onGate;

  // Wait for the persisted role before deciding what to show.
  if (!hydrated) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="surface mx-auto max-w-md p-8 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
            <Lock className="size-7" />
          </span>
          <h1 className="mt-4 text-xl font-bold">{sectionLabel} area locked</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You&apos;re signed in as a{" "}
            <span className="font-medium text-foreground">{roleLabel[role]}</span>.
            These {sectionLabel.toLowerCase()} features are only available to
            verified {roleLabel[require].toLowerCase()}s.
          </p>

          <div className="mt-6 flex flex-col gap-2">
            <Link
              href={roleHome[role]}
              className={cn(buttonVariants({ size: "lg" }), "h-12 w-full text-base")}
            >
              Back to my dashboard
            </Link>
            <Link
              href={gate}
              className={cn(buttonVariants({ variant: "ghost" }), "w-full")}
            >
              {gateLabel}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
