import type { VolunteerProfile } from "@/types";

// Mock volunteer roster the officer can browse. The signed-in volunteer (`you`)
// is injected at runtime with live stats from the MissionsProvider, so this
// list is just the *other* volunteers.
export const volunteerRoster: VolunteerProfile[] = [
  { id: "v-sarah", name: "Sarah Tan", initials: "ST", skills: ["First Aid", "Healthcare Support"], stats: { totalMissions: 24, hours: 91, livesSupported: 310 } },
  { id: "v-marcus", name: "Marcus Lim", initials: "ML", skills: ["Logistics", "General Volunteer"], stats: { totalMissions: 15, hours: 52, livesSupported: 180 } },
  { id: "v-priya", name: "Priya Nair", initials: "PN", skills: ["Healthcare Support", "Teaching"], stats: { totalMissions: 31, hours: 128, livesSupported: 420 } },
  { id: "v-daniel", name: "Daniel Ong", initials: "DO", skills: ["First Aid", "Logistics"], stats: { totalMissions: 9, hours: 33, livesSupported: 95 } },
];
