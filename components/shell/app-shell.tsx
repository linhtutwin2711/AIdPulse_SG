"use client";

import { usePathname } from "next/navigation";
import { AILauncher } from "@/components/ai-assistant/ai-launcher";
import { AIPanel } from "@/components/ai-assistant/ai-panel";
import { useAI } from "@/components/ai-assistant/ai-context";
import { cn } from "@/lib/utils";
import { TopNav } from "./top-nav";

/** Shared chrome for every authenticated screen: top nav + global AI assistant. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { open } = useAI();
  const pathname = usePathname();
  // The map is a full-bleed, Google-Maps-style page: it fills the viewport under
  // the nav with no centered padding. Every other page keeps the padded column.
  const isMap = pathname === "/map";

  return (
    <div className="min-h-dvh">
      <TopNav />
      {/* On desktop (lg+) the chat opens as a side drawer (360px + 24px gutter),
          so we pad the content over to keep the map/panels fully visible. Below
          lg the drawer is a full-screen overlay, so no push is needed. */}
      <main
        className={cn(
          "transition-[padding] duration-300",
          isMap
            ? "relative h-[calc(100dvh-4rem)] overflow-hidden"
            : "mx-auto max-w-[1600px] px-6 py-6",
          open && "lg:pr-[396px]"
        )}
      >
        {children}
      </main>
      <AILauncher />
      <AIPanel />
    </div>
  );
}
