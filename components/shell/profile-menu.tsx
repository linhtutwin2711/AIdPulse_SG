"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { useProfile } from "@/components/providers/profile-provider";
import { cn } from "@/lib/utils";

export function ProfileMenu({
  subtitle,
  subtitleClass,
}: {
  subtitle?: string;
  subtitleClass?: string;
}) {
  const router = useRouter();
  const { displayName, initials } = useProfile();
  const [open, setOpen] = useState(false);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const logout = () => {
    setOpen(false);
    try {
      window.localStorage.removeItem("aidpulse:profile");
      window.localStorage.removeItem("aidpulse:role");
    } catch {
      /* ignore */
    }
    router.push("/");
  };

  return (
    <div className="relative">
      {open && (
        <button aria-hidden tabIndex={-1} onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" />
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-2.5 transition-colors hover:bg-secondary"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-white">
          {initials}
        </span>
        <span className="leading-tight max-md:hidden">
          <span className="block text-sm font-medium">{displayName}</span>
          {subtitle && <span className={cn("block text-xs", subtitleClass)}>{subtitle}</span>}
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-2xl">
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-white">{initials}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">{subtitle ?? "Citizen"}</p>
            </div>
          </div>
          <div className="my-1 border-t border-border" />
          <MenuItem icon={User} label="My Profile" onClick={() => go("/settings?tab=account")} />
          <MenuItem icon={Settings} label="Settings" onClick={() => go("/settings")} />
          <MenuItem icon={LogOut} label="Logout" danger onClick={logout} />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: typeof User;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
        danger ? "text-danger hover:bg-danger/10" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      <Icon className="size-4" /> {label}
    </button>
  );
}
