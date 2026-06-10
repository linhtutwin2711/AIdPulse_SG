import { RoleGate } from "@/components/shell/role-gate";

/** Volunteer features are locked to the volunteer role; everyone else is sent
 *  to the registration page, the one volunteer route that stays open. */
export default function VolunteerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGate
      require="volunteer"
      gate="/volunteer/register"
      gateLabel="Register as a volunteer"
      sectionLabel="Volunteer"
    >
      {children}
    </RoleGate>
  );
}
