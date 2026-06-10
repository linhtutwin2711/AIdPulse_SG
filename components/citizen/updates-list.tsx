import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getLatestUpdates, newsImage, timeAgo } from "@/lib/data";
import { NewsThumb } from "./news-thumb";
import type { LatestUpdate } from "@/types";

// Latest Updates (citizen dashboard). Server Component: reads the latest 5 rows
// from `latest_updates` (populated by the n8n ingest) at request time, newest
// first. Each row links into the full feed at /updates. Wrapped in <Suspense>
// by the dashboard page, which supplies the loading skeleton.

// Card header + chrome shared by the loaded / empty / error states.
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Latest Updates</h3>
        <Link
          href="/updates"
          className="flex items-center gap-0.5 text-sm font-medium text-info hover:underline"
        >
          View All <ChevronRight className="size-4" />
        </Link>
      </div>
      {children}
    </div>
  );
}

export async function UpdatesList() {
  let updates: LatestUpdate[];
  try {
    updates = await getLatestUpdates(5);
  } catch (err) {
    console.error("UpdatesList getLatestUpdates failed:", err);
    return (
      <Shell>
        <p className="mt-4 text-sm text-muted-foreground">
          Couldn&apos;t load the latest updates. Please try again shortly.
        </p>
      </Shell>
    );
  }

  if (updates.length === 0) {
    return (
      <Shell>
        <p className="mt-4 text-sm text-muted-foreground">No updates yet — check back soon.</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <ul className="mt-2 divide-y divide-border">
        {updates.map((u) => {
          const live = u.severity === "high" || u.severity === "critical";
          return (
            <li key={u.id}>
              <Link
                href={`/updates?post=${u.id}`}
                className="group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-secondary/40 max-sm:gap-2.5"
              >
                <div className="relative shrink-0">
                  <NewsThumb src={newsImage(u.imageUrl, `${u.title} ${u.category ?? ""}`)} alt={u.title} />
                  {live && (
                    <span className="pill absolute left-1 top-1 bg-danger px-1.5 py-0 text-[9px] font-semibold text-white">
                      LIVE
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-snug line-clamp-1 group-hover:underline">
                    {u.title}
                  </p>
                  {u.summary && (
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{u.summary}</p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1 self-start whitespace-nowrap text-xs text-muted-foreground">
                  {timeAgo(u.publishedAt)}
                  <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}
