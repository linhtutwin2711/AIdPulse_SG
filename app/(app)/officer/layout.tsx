import { RoleGate } from "@/components/shell/role-gate";

/** Officer features are locked to the officer role; everyone else is sent to
 *  the access / verification page, the one officer route that stays open. */
export default function OfficerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGate
      require="officer"
      gate="/officer/access"
      gateLabel="Verify officer access"
      sectionLabel="Officer"
    >
      {children}
    </RoleGate>
  );
}
