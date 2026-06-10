"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, ChevronRight, MessageCircle, Repeat2 } from "lucide-react";
import { fetchNewsUpdates } from "@/lib/data";
import { NewsThumb } from "./news-thumb";
import type { NewsUpdate } from "@/types";

export function UpdatesList() {
  // Homepage shows only a brief preview; the full feed lives at /updates.
  const [updates, setUpdates] = useState<NewsUpdate[]>([]);

  useEffect(() => {
    let active = true;
    fetchNewsUpdates()
      .then((data) => active && setUpdates(data.slice(0, 4)))
      .catch((err) => console.error("UpdatesList fetchNewsUpdates failed:", err));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Latest Updates</h3>
        <Link href="/updates" className="text-sm font-medium text-info hover:underline">
          View All
        </Link>
      </div>

      <ul className="mt-2 divide-y divide-border">
        {updates.map((u) => (
          <li key={u.id}>
            <article className="group flex gap-3 rounded-xl p-3 transition-colors hover:bg-secondary/40 max-sm:gap-2.5">
              <Link href={`/updates?post=${u.id}`} aria-label={u.title}>
                <NewsThumb src={u.image} alt={u.title} />
              </Link>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{u.source}</span>
                  <span aria-hidden>·</span>
                  <span>{u.ago}</span>
                  {u.live && (
                    <span className="pill ml-1 bg-danger/15 px-1.5 py-0 text-[10px] text-danger">LIVE</span>
                  )}
                </div>

                <Link href={`/updates?post=${u.id}`} className="mt-0.5 block font-medium leading-snug hover:underline">
                  {u.title}
                </Link>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{u.description}</p>

                {/* X-style interaction row — comment links to the full post */}
                <div className="mt-2 flex items-center gap-5 text-xs text-muted-foreground max-sm:gap-4">
                  <Link
                    href={`/updates?post=${u.id}`}
                    className="flex items-center gap-1.5 transition-colors hover:text-info"
                  >
                    <MessageCircle className="size-4" /> {u.comments}
                  </Link>
                  <span className="flex items-center gap-1.5">
                    <Repeat2 className="size-4" /> {u.reposts}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BarChart3 className="size-4" /> {u.views}
                  </span>
                  <Link
                    href={`/updates?post=${u.id}`}
                    className="ml-auto flex items-center gap-0.5 font-medium text-info opacity-0 transition-opacity hover:underline group-hover:opacity-100 max-sm:opacity-100"
                  >
                    Read more <ChevronRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
