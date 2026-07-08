"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AILauncher } from "@/components/ai-assistant/ai-launcher";
import { AIPanel } from "@/components/ai-assistant/ai-panel";
import { enableBroadcastPush, pushSupported } from "@/lib/push";
import { cn } from "@/lib/utils";
import { TopNav } from "./top-nav";

/** Shared chrome for every authenticated screen: top nav + global AI assistant. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The map is a full-bleed, Google-Maps-style page: it fills the viewport under
  // the nav with no centered padding. Every other page keeps the padded column.
  const isMap = pathname === "/map";

  // Keep this device subscribed to emergency broadcast push. Covers users who
  // granted notification permission before push existed, and re-registers the
  // subscription after dev-server restarts. No-op when permission isn't granted.
  useEffect(() => {
    if (pushSupported() && Notification.permission === "granted") {
      void enableBroadcastPush();
    }
  }, []);

  return (
    <div className="min-h-dvh">
      <TopNav />
      {/* The chat opens as a modal overlay on every screen: the content keeps
          its full size and is simply blurred behind the drawer (handled in
          AIPanel's scrim), so panels never narrow when the chat is open. */}
      <main
        className={cn(
          isMap
            ? "relative h-[calc(100dvh-4rem)] overflow-hidden"
            : "mx-auto max-w-[1600px] px-6 py-6"
        )}
      >
        {children}
      </main>
      <AILauncher />
      <AIPanel />
    </div>
  );
}
