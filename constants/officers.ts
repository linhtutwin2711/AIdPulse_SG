import { hospitals } from "./hospitals";
import type { OfficerContact } from "@/types";

// One duty Emergency Officer per hospital. In Responder Chat, an EO finds a
// counterpart by searching the HOSPITAL name (like finding a friend by phone
// number on the citizen side) — the hospital is the identity, the officer is
// who answers. Mock roster; Supabase later: an `officer_contacts` table keyed
// by hospital_id.
const NAMES = [
  "Marcus Chen", "Aisha Rahman", "Daniel Koh", "Priya Menon", "Wei Lin Tan",
  "Hafiz Ismail", "Grace Liu", "Arjun Nair", "Mei Xin Ong", "Ryan Teo",
  "Nurul Huda", "Jonathan Lee", "Kavitha Raj", "Zhi Hao Lim", "Sarah Goh",
  "Imran Shah", "Clarissa Ng", "Vikram Pillai", "Hui Min Chua", "Aaron Yap",
  "Farah Aziz", "Benjamin Sim", "Deepa Kumar", "Cheng Yi Wong", "Natalie Foo",
  "Syafiq Roslan", "Vanessa Tay", "Karthik Suresh", "Li Ting Seah", "Dominic Phua",
];

const initialsOf = (name: string) =>
  name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

export const officerDirectory: OfficerContact[] = hospitals.map((h, i) => ({
  id: `eo-${h.id}`,
  name: NAMES[i % NAMES.length],
  initials: initialsOf(NAMES[i % NAMES.length]),
  hospitalId: h.id,
  hospitalName: h.name,
  online: i % 3 !== 0, // most duty officers are on shift
}));
