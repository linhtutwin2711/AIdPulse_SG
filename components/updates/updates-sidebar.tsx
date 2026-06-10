"use client";

import {
  Activity,
  Bug,
  Newspaper,
  PanelLeft,
  Repeat2,
  Search,
  ShieldPlus,
  Thermometer,
  Users,
} from "lucide-react";
import { useMessages } from "@/components/providers/messages-provider";
import { cn } from "@/lib/utils";

const FEEDS = [
  { key: "latest", label: "Latest", icon: Newspaper },
  { key: "reposts", label: "My Reposts", icon: Repeat2 },
  { key: "public", label: "Public Health Updates", icon: ShieldPlus },
  { key: "dengue", label: "Dengue Alerts", icon: Bug },
  { key: "covid", label: "COVID-19 Updates", icon: Activity },
  { key: "flu", label: "Flu Monitoring", icon: Thermometer },
] as const;

function SideItem({
  icon: Icon,
  label,
  active,
  collapsed,
  onClick,
}: {
  icon: typeof Newspaper;
  label: string;
  active?: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "bg-sidebar-accent font-medium text-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

export function UpdatesSidebar({
  view,
  chatId,
  collapsed,
  onToggleCollapse,
  onSelectView,
  onSelectChat,
  mobileOpen,
  onCloseMobile,
}: {
  view: string;
  chatId: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelectView: (v: string) => void;
  onSelectChat: (id: string) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const { conversations } = useMessages();

  return (
    <>
      {/* mobile scrim */}
      <div
        onClick={onCloseMobile}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <aside
        className={cn(
          "z-50 flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
          collapsed ? "w-16" : "w-64",
          "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:w-64",
          mobileOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full",
          "lg:sticky lg:top-0 lg:h-dvh"
        )}
      >
        {/* Top: logo + collapse toggle */}
        <div className={cn("flex items-center gap-2 p-3", collapsed ? "justify-center" : "justify-between")}>
          {!collapsed && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/images/aidpulse_logo.svg" alt="AidPulse SG" className="h-7 w-auto" />
          )}
          <button
            onClick={onToggleCollapse}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground max-lg:hidden"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PanelLeft className="size-5" />
          </button>
        </div>

        {/* Main actions */}
        <div className="space-y-1 px-2">
          <SideItem icon={Search} label="Search Updates" collapsed={collapsed} active={view === "search"} onClick={() => onSelectView("search")} />
          <SideItem icon={Users} label="Friends" collapsed={collapsed} active={view === "friends"} onClick={() => onSelectView("friends")} />
        </div>

        <div className="mt-3 flex-1 space-y-1 overflow-y-auto px-2 no-scrollbar">
          {/* Feeds */}
          {!collapsed ? (
            <p className="px-2.5 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Feeds</p>
          ) : (
            <div className="mx-2 my-2 border-t border-sidebar-border" />
          )}
          {FEEDS.map((f) => (
            <SideItem
              key={f.key}
              icon={f.icon}
              label={f.label}
              collapsed={collapsed}
              active={view === f.key}
              onClick={() => onSelectView(f.key)}
            />
          ))}

          {/* Chats */}
          {!collapsed ? (
            <p className="px-2.5 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Chats</p>
          ) : (
            <div className="mx-2 my-2 border-t border-sidebar-border" />
          )}
          {conversations.map((c) => {
            const active = view === "messages" && chatId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => onSelectChat(c.id)}
                title={collapsed ? c.name : undefined}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                  collapsed && "justify-center px-0",
                  active
                    ? "bg-sidebar-accent font-medium text-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                )}
              >
                <span className="relative flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold text-foreground">
                  {c.initials}
                  {c.online && <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-sidebar bg-success" />}
                </span>
                {!collapsed && <span className="truncate">{c.name}</span>}
              </button>
            );
          })}
        </div>
      </aside>
    </>
  );
}
