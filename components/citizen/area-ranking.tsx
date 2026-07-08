"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Map as MapIcon } from "lucide-react";
import { fetchAreaRanks } from "@/lib/data";
import { severityDot } from "@/lib/ui";
import type { AreaRank } from "@/types";

// Keep the card compact: top 5 by default, the rest behind "View All".
const TOP_N = 5;

export function AreaRanking() {
  const [ranks, setRanks] = useState<AreaRank[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let active = true;
    fetchAreaRanks()
      .then((data) => active && setRanks(data))
      .catch((err) => console.error("AreaRanking fetchAreaRanks failed:", err));
    return () => {
      active = false;
    };
  }, []);

  const max = Math.max(1, ...ranks.map((r) => r.cases));
  const visible = showAll ? ranks : ranks.slice(0, TOP_N);
  const hidden = ranks.length - TOP_N;
  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Areas by Active Cases</h3>
        <Link
          href="/map"
          className="flex items-center gap-1 text-sm font-medium text-info hover:underline"
        >
          <MapIcon className="size-4" /> View in Map
        </Link>
      </div>

      <ul className={`mt-4 space-y-3 ${showAll ? "max-h-72 overflow-y-auto pr-1 no-scrollbar" : ""}`}>
        {visible.map((r) => (
          <li key={r.area} className="flex items-center gap-3">
            <span className="w-4 text-sm font-semibold text-muted-foreground">{r.rank}</span>
            <span className="w-28 truncate text-sm">{r.area}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full ${severityDot[r.severity]}`}
                style={{ width: `${(r.cases / max) * 100}%` }}
              />
            </div>
            <span className="w-10 text-right text-sm font-medium">{r.cases}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Ranking updated 5 min ago</p>
        {hidden > 0 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-xs font-medium text-info hover:underline"
          >
            {showAll ? "Show Top 5" : `View All (${ranks.length})`}
          </button>
        )}
      </div>
    </div>
  );
}
