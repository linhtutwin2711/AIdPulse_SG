import type { Friend } from "@/types";

// Mock people directory — the pool of users you can connect with on AidPulse.
// `FriendsProvider` reads from here; a teammate swaps this for a Supabase
// `profiles` query (e.g. .from("profiles").select("*")) later.
export const peopleDirectory: Friend[] = [
  { id: "alex", name: "Alex Tan", initials: "AT", phone: "+6581234501", role: "volunteer", area: "Tampines", online: true, mutualFriends: 4 },
  { id: "sarah", name: "Sarah Tan", initials: "ST", phone: "+6581234502", role: "citizen", area: "Bedok", mutualFriends: 2 },
  { id: "marcus", name: "Marcus Lee", initials: "MK", phone: "+6581234503", role: "officer", area: "Jurong East", online: true, mutualFriends: 1 },
  { id: "priya", name: "Priya Nair", initials: "PN", phone: "+6581234504", role: "volunteer", area: "Woodlands", mutualFriends: 6 },
  { id: "daniel", name: "Daniel Ong", initials: "DO", phone: "+6581234505", role: "citizen", area: "Ang Mo Kio", online: true, mutualFriends: 0 },
  { id: "mei", name: "Mei Ling", initials: "ME", phone: "+6581234506", role: "volunteer", area: "Clementi", mutualFriends: 3 },
  { id: "hafiz", name: "Hafiz Rahman", initials: "HR", phone: "+6581234507", role: "citizen", area: "Yishun", mutualFriends: 1 },
  { id: "grace", name: "Grace Wong", initials: "GW", phone: "+6581234508", role: "officer", area: "Punggol", online: true, mutualFriends: 5 },
];

// Friends you already have when you first open AidPulse. These ids must exist
// in `peopleDirectory` above and line up with the seeded DM conversations.
export const initialFriendIds: string[] = ["alex", "sarah"];
