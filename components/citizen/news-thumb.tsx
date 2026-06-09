"use client";

import { useState } from "react";
import { Newspaper } from "lucide-react";

/** News thumbnail that falls back to a gradient + icon if the image is missing. */
export function NewsThumb({ src, alt }: { src: string; alt: string }) {
  const [ok, setOk] = useState(true);
  return (
    <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-secondary to-card max-sm:size-14">
      {ok ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setOk(false)}
          className="size-full object-cover"
        />
      ) : (
        <div className="grid size-full place-items-center text-muted-foreground">
          <Newspaper className="size-6" />
        </div>
      )}
    </div>
  );
}
