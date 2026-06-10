import { AreaRanking } from "@/components/citizen/area-ranking";
import { CaseTracking } from "@/components/citizen/case-tracking";
import { LiveAlertBanner } from "@/components/citizen/live-alert-banner";
import { UpdatesList } from "@/components/citizen/updates-list";
import { RoleSwitchCards } from "@/components/shell/role-switch-cards";

export default function CitizenDashboard() {
  return (
    <div className="space-y-6">
      <LiveAlertBanner />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <UpdatesList />
        <div className="space-y-6">
          <CaseTracking />
          <AreaRanking />
        </div>
      </div>

      <RoleSwitchCards />
    </div>
  );
}
