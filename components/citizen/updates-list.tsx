import Link from "next/link";
import { BarChart3, ChevronRight, MessageCircle, Repeat2 } from "lucide-react";
import { getLatestUpdates, timeAgo } from "@/lib/data";
import { NewsThumb } from "./news-thumb";
import type { LatestUpdate } from "@/types";

// Latest Updates (citizen dashboard). Server Component: reads the latest 5 rows
// from `latest_updates` (populated by the n8n ingest) at request time, newest
// first. The full feed lives at /updates. Wrapped in <Suspense> by the
// dashboard page, which supplies the loading skeleton.

// Card header + chrome shared by the loaded / empty / error states.
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Latest Updates</h3>
        <Link href="/updates" className="text-sm font-medium text-info hover:underline">
          View All
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
          // Real gov articles link out to the source; fall back to the in-app feed.
          const href = u.sourceUrl ?? "/updates";
          const external = Boolean(u.sourceUrl);
          const linkProps = external
            ? { href, target: "_blank" as const, rel: "noopener noreferrer" }
            : { href };
          const showSeverity = u.severity === "high" || u.severity === "critical";

          return (
            <li key={u.id}>
              <article className="group flex gap-3 rounded-xl p-3 transition-colors hover:bg-secondary/40 max-sm:gap-2.5">
                <Link {...linkProps} aria-label={u.title}>
                  <NewsThumb src={u.imageUrl ?? ""} alt={u.title} />
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{u.sourceName ?? "Gov.sg"}</span>
                    <span aria-hidden>·</span>
                    <span>{timeAgo(u.publishedAt)}</span>
                    {showSeverity && (
                      <span className="pill ml-1 bg-danger/15 px-1.5 py-0 text-[10px] uppercase text-danger">
                        {u.severity}
                      </span>
                    )}
                  </div>

                  <Link {...linkProps} className="mt-0.5 block font-medium leading-snug hover:underline">
                    {u.title}
                  </Link>
                  {u.summary && (
                    <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{u.summary}</p>
                  )}

                  {/* X-style interaction row — counts aren't tracked for ingested
                      updates, so they stay at 0; Read more opens the source. */}
                  <div className="mt-2 flex items-center gap-5 text-xs text-muted-foreground max-sm:gap-4">
                    <span className="flex items-center gap-1.5">
                      <MessageCircle className="size-4" /> 0
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Repeat2 className="size-4" /> 0
                    </span>
                    <span className="flex items-center gap-1.5">
                      <BarChart3 className="size-4" /> 0
                    </span>
                    <Link
                      {...linkProps}
                      className="ml-auto flex items-center gap-0.5 font-medium text-info opacity-0 transition-opacity hover:underline group-hover:opacity-100 max-sm:opacity-100"
                    >
                      Read more <ChevronRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}
