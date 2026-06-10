import { Suspense } from "react";
import { AreaRanking } from "@/components/citizen/area-ranking";
import { CaseTracking } from "@/components/citizen/case-tracking";
import { LiveAlertBanner } from "@/components/citizen/live-alert-banner";
import { UpdatesList } from "@/components/citizen/updates-list";
import { UpdatesListSkeleton } from "@/components/citizen/updates-list-skeleton";
import { RoleSwitchCards } from "@/components/shell/role-switch-cards";

// Latest Updates is fetched per request (server-side) so the feed stays fresh
// rather than being statically cached at build time.
export const dynamic = "force-dynamic";

export default function CitizenDashboard() {
  return (
    <div className="space-y-6">
      <LiveAlertBanner />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Suspense fallback={<UpdatesListSkeleton />}>
          <UpdatesList />
        </Suspense>
        <div className="space-y-6">
          <CaseTracking />
          <AreaRanking />
        </div>
      </div>

      <RoleSwitchCards />
    </div>
  );
}
