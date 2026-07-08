import type { TempFacility } from "@/types";

// Temporary emergency facilities — spaces offered by institutions during a
// health crisis (the COVID-era pattern: campuses becoming quarantine or
// treatment sites). Mock for now; an officer flow / Supabase table
// (`temp_facilities`) can replace this later without touching the map.
export const tempFacilities: TempFacility[] = [
  {
    id: "tf-nus-utown",
    name: "NUS UTown Community Care Facility",
    kind: "quarantine",
    host: "National University of Singapore",
    purpose:
      "University Town residences offered as a community care & quarantine facility for mild and recovering cases.",
    lat: 1.3036,
    lng: 103.7735,
    capacity: 400,
    occupied: 212,
    status: "active",
    since: "Activated 28 Jun 2026",
  },
  {
    id: "tf-rp-woodlands",
    name: "Republic Polytechnic Treatment Clinic",
    kind: "treatment",
    host: "Republic Polytechnic",
    purpose:
      "Sports hall converted into a temporary clinic for outpatient treatment and vaccinations, easing nearby hospital load.",
    lat: 1.4433,
    lng: 103.7852,
    capacity: 120,
    occupied: 58,
    status: "active",
    since: "Activated 2 Jul 2026",
  },
];
