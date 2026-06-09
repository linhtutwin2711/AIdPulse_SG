import type { Alert, CommentItem, NewsUpdate } from "@/types";

export const highRiskAlert: Alert = {
  id: "a1",
  area: "Tanjong Pagar",
  title: "Dengue Cluster Detected in Tanjong Pagar",
  message: "Stay vigilant and take necessary precautions.",
  severity: "critical",
  updatedAgo: "5 min ago",
  riskLevel: "High",
  distanceKm: 1.2,
  activeCases: 342,
  details:
    "A high-risk dengue cluster has been reported in Tanjong Pagar, with increasing active cases in the area. Residents nearby should take extra precautions and avoid mosquito breeding areas.",
  precautions: [
    "Remove stagnant water from pots, trays, and containers",
    "Use mosquito repellent when going outdoors",
    "Wear long sleeves if visiting high-risk areas",
    "Seek medical attention if you have fever, rash, or body aches",
    "Report mosquito breeding sites if found",
  ],
  nearbyAreas: ["Outram", "Chinatown", "Everton Park", "Cantonment"],
};

export const newsUpdates: NewsUpdate[] = [
  {
    id: "n1",
    source: "NEA Alert",
    title: "Dengue cluster cleanup intensified in Tanjong Pagar",
    description:
      "NEA teams are increasing inspections and removing mosquito breeding spots in nearby residential areas.",
    ago: "6 min ago",
    image: "/images/news/dengue-cleanup.jpg",
    live: true,
    comments: 48,
    reposts: 126,
    views: "12.4K",
  },
  {
    id: "n2",
    source: "AidPulse Update",
    title: "NEA intensifies COVID-19 monitoring in crowded areas",
    description:
      "Enhanced checks are being conducted at malls and transport hubs as reported cases rise.",
    ago: "18 min ago",
    image: "/images/news/covid-monitoring.jpg",
    comments: 31,
    reposts: 74,
    views: "9.1K",
  },
  {
    id: "n3",
    source: "MOH Update",
    title: "Updated vaccination guidance for at-risk groups",
    description:
      "Booster recommendations have been updated for seniors and vulnerable residents.",
    ago: "1 hr ago",
    image: "/images/news/vaccine-update.jpg",
    comments: 22,
    reposts: 58,
    views: "7.8K",
  },
  {
    id: "n4",
    source: "Health Advisory",
    title: "Flu cases increase amid changing weather",
    description:
      "Doctors advise early treatment, hydration, and precaution for residents with symptoms.",
    ago: "2 hrs ago",
    image: "/images/news/flu-warning.jpg",
    comments: 17,
    reposts: 33,
    views: "5.2K",
  },
  {
    id: "n5",
    source: "AidPulse Update",
    title: "Wastewater surveillance detects rise in virus fragments",
    description:
      "Early signals have prompted proactive public health monitoring in selected areas.",
    ago: "3 hrs ago",
    image: "/images/news/wastewater-surveillance.jpg",
    comments: 12,
    reposts: 26,
    views: "4.0K",
  },
];

// Pre-existing comments (from other users) so threads aren't empty on first open.
export const seedComments: Record<string, CommentItem[]> = {
  n1: [
    {
      id: "seed-n1-1",
      author: "Sarah Tan",
      initials: "ST",
      text: "Saw the NEA team near Block 5 this morning — quick response!",
      time: "4 min ago",
      replies: [
        { id: "seed-n1-1-r1", author: "Daniel Lee", initials: "DL", text: "Same here, good to see.", time: "2 min ago" },
      ],
    },
    {
      id: "seed-n1-2",
      author: "Rachel Ng",
      initials: "RN",
      text: "Please remember to clear balcony pots and trays too.",
      time: "3 min ago",
      replies: [],
    },
  ],
  n2: [
    {
      id: "seed-n2-1",
      author: "John Lim",
      initials: "JL",
      text: "Are masks recommended again in crowded MRTs?",
      time: "10 min ago",
      replies: [],
    },
  ],
};
