"use client";

import { useState } from "react";
import {
  BarChart3,
  Check,
  MessageCircle,
  Newspaper,
  Repeat2,
  Share2,
} from "lucide-react";
import { useUpdates } from "@/components/providers/updates-provider";
import { CommentThread } from "./comment-thread";
import { cn } from "@/lib/utils";
import type { NewsUpdate } from "@/types";

export function PostCard({
  post,
  defaultOpen = false,
}: {
  post: NewsUpdate;
  defaultOpen?: boolean;
}) {
  const { isReposted, toggleRepost, selfCommentCount } = useUpdates();
  const [showComments, setShowComments] = useState(defaultOpen);
  const [imgOk, setImgOk] = useState(true);
  const [copied, setCopied] = useState(false);

  const reposted = isReposted(post.id);
  const commentCount = post.comments + selfCommentCount(post.id);
  const repostCount = post.reposts + (reposted ? 1 : 0);

  const share = () => {
    const url = `${window.location.origin}/updates?post=${post.id}`;
    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };

  return (
    <article className="surface overflow-hidden p-0">
      {/* post image */}
      <div className="relative h-44 w-full bg-gradient-to-br from-secondary to-card max-sm:h-36">
        {imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.image}
            alt={post.title}
            onError={() => setImgOk(false)}
            className="size-full object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <Newspaper className="size-8" />
          </div>
        )}
        {post.live && (
          <span className="pill absolute left-3 top-3 bg-danger px-2 py-0.5 text-[10px] font-semibold text-white">
            LIVE
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{post.source}</span>
          <span aria-hidden>·</span>
          <span>{post.ago}</span>
        </div>
        <h3 className="mt-1 text-lg font-semibold leading-snug">{post.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{post.description}</p>

        {/* interaction row */}
        <div className="mt-4 flex items-center gap-6 border-t border-border pt-3 text-sm text-muted-foreground max-sm:gap-4">
          <button
            onClick={() => setShowComments((v) => !v)}
            className={cn("flex items-center gap-1.5 transition-colors hover:text-info", showComments && "text-info")}
          >
            <MessageCircle className="size-4" /> {commentCount}
          </button>
          <button
            onClick={() => toggleRepost(post.id)}
            className={cn("flex items-center gap-1.5 transition-colors hover:text-success", reposted && "font-medium text-success")}
          >
            <Repeat2 className="size-4" /> {repostCount}
            {reposted && <span className="max-sm:hidden">· Reposted</span>}
          </button>
          <span className="flex items-center gap-1.5">
            <BarChart3 className="size-4" /> {post.views}
          </span>
          <button onClick={share} className="ml-auto flex items-center gap-1.5 transition-colors hover:text-foreground">
            {copied ? (
              <><Check className="size-4 text-success" /> Copied</>
            ) : (
              <><Share2 className="size-4" /> Share</>
            )}
          </button>
        </div>

        {showComments && <CommentThread postId={post.id} />}
      </div>
    </article>
  );
}
