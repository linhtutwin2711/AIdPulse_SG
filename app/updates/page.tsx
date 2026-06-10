"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Bell, FileText, Map as MapIcon, Menu, Repeat2, Search } from "lucide-react";
import { ProfileMenu } from "@/components/shell/profile-menu";
import { PostCard } from "@/components/updates/post-card";
import { MessagesPanel } from "@/components/updates/messages-panel";
import { FriendsPanel } from "@/components/updates/friends-panel";
import { UpdatesSidebar } from "@/components/updates/updates-sidebar";
import { useUpdates } from "@/components/providers/updates-provider";
import { getNewsUpdates } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { NewsUpdate } from "@/types";

const NAV = [
  { href: "/dashboard", label: "Alerts", icon: Bell },
  { href: "/map", label: "Map", icon: MapIcon },
  { href: "/report", label: "Report", icon: FileText },
];

const TITLES: Record<string, string> = {
  latest: "Latest Updates",
  reposts: "My Reposts",
  public: "Public Health Updates",
  dengue: "Dengue Alerts",
  covid: "COVID-19 Updates",
  flu: "Flu Monitoring",
  search: "Search Updates",
};

function filterFeed(posts: NewsUpdate[], view: string, reposts: string[]) {
  const hay = (p: NewsUpdate) => `${p.title} ${p.description}`.toLowerCase();
  if (view === "reposts") return posts.filter((p) => reposts.includes(p.id));
  if (view === "dengue") return posts.filter((p) => hay(p).includes("dengue"));
  if (view === "covid") return posts.filter((p) => hay(p).includes("covid"));
  if (view === "flu") return posts.filter((p) => hay(p).includes("flu"));
  return posts; // latest, public, search-base
}

export default function UpdatesPage() {
  return (
    <Suspense fallback={null}>
      <UpdatesView />
    </Suspense>
  );
}

function UpdatesView() {
  const params = useSearchParams();
  const focusId = params.get("post");
  const { reposts } = useUpdates();
  const posts = getNewsUpdates();

  const [view, setView] = useState<string>("latest");
  const [chatId, setChatId] = useState<string>("alex");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectView = (v: string) => { setView(v); setMobileOpen(false); };
  const selectChat = (id: string) => { setChatId(id); setView("messages"); setMobileOpen(false); };

  let feed = filterFeed(posts, view, reposts);
  if (view === "search" && query.trim()) {
    const q = query.toLowerCase();
    feed = posts.filter((p) => `${p.title} ${p.description} ${p.source}`.toLowerCase().includes(q));
  }

  return (
    <div className="flex min-h-dvh">
      <UpdatesSidebar
        view={view}
        chatId={chatId}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        onSelectView={selectView}
        onSelectChat={selectChat}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header: Back (left) · Alerts | Map | Report (center) · Logo (right) */}
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMobileOpen(true)}
                className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </button>
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 rounded-full px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <ArrowLeft className="size-5" /> <span className="max-sm:hidden">Back</span>
              </Link>
            </div>

            <nav className="flex items-center gap-1 rounded-full border border-border bg-card/60 p-1">
              {NAV.map((n) => (
                <Link key={n.label} href={n.href} className="nav-tab">
                  <n.icon className="size-4" />
                  <span className="max-sm:hidden">{n.label}</span>
                </Link>
              ))}
            </nav>

            <ProfileMenu />
          </div>
        </header>

        {/* Main content */}
        <main className="mx-auto w-full max-w-3xl px-4 py-6">
          {view === "messages" ? (
            <MessagesPanel activeId={chatId} />
          ) : view === "friends" ? (
            <FriendsPanel onMessage={selectChat} />
          ) : (
            <div className="space-y-4">
              <h1 className="text-xl font-bold">{TITLES[view] ?? "Latest Updates"}</h1>

              {view === "search" && (
                <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
                  <Search className="size-4 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                    placeholder="Search updates by keyword…"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              )}

              {feed.map((p) => (
                <PostCard key={p.id} post={p} defaultOpen={p.id === focusId} />
              ))}

              {feed.length === 0 && (
                <div className="surface flex flex-col items-center gap-2 p-10 text-center">
                  <Repeat2 className="size-8 text-muted-foreground" />
                  <p className="font-medium">
                    {view === "reposts" ? "No reposts yet" : "Nothing to show"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {view === "reposts"
                      ? "Tap the repost icon on any update and it'll appear here."
                      : "Try a different feed or search term."}
                  </p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
