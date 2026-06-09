"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useProfile } from "./profile-provider";
import { seedComments } from "@/constants";
import type { CommentItem } from "@/types";

interface UpdatesState {
  reposts: string[];
  comments: Record<string, CommentItem[]>;
}

interface UpdatesContextValue {
  reposts: string[];
  isReposted: (postId: string) => boolean;
  toggleRepost: (postId: string) => void;
  getComments: (postId: string) => CommentItem[];
  selfCommentCount: (postId: string) => number;
  addComment: (postId: string, text: string) => void;
  editComment: (postId: string, commentId: string, text: string) => void;
  deleteComment: (postId: string, commentId: string) => void;
  addReply: (postId: string, commentId: string, text: string) => void;
  editReply: (postId: string, commentId: string, replyId: string, text: string) => void;
  deleteReply: (postId: string, commentId: string, replyId: string) => void;
}

const UpdatesContext = createContext<UpdatesContextValue | null>(null);
const STORAGE_KEY = "aidpulse:updates";
const nid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

export function UpdatesProvider({ children }: { children: React.ReactNode }) {
  const { displayName, initials } = useProfile();
  const [state, setState] = useState<UpdatesState>({ reposts: [], comments: seedComments });

  // Hydrate persisted social state after mount.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setState(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (next: UpdatesState) => {
    setState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const value = useMemo<UpdatesContextValue>(() => {
    const mapComments = (
      postId: string,
      fn: (list: CommentItem[]) => CommentItem[],
    ) => persist({ ...state, comments: { ...state.comments, [postId]: fn(state.comments[postId] ?? []) } });

    const mine = { author: displayName, initials, self: true as const, time: "now" };

    return {
      reposts: state.reposts,
      isReposted: (postId) => state.reposts.includes(postId),
      toggleRepost: (postId) =>
        persist({
          ...state,
          reposts: state.reposts.includes(postId)
            ? state.reposts.filter((id) => id !== postId)
            : [...state.reposts, postId],
        }),

      getComments: (postId) => state.comments[postId] ?? [],
      selfCommentCount: (postId) =>
        (state.comments[postId] ?? []).filter((c) => c.self).length,

      addComment: (postId, text) =>
        mapComments(postId, (list) => [...list, { id: nid("c"), text, replies: [], ...mine }]),

      editComment: (postId, commentId, text) =>
        mapComments(postId, (list) =>
          list.map((c) => (c.id === commentId ? { ...c, text, edited: true } : c)),
        ),

      deleteComment: (postId, commentId) =>
        mapComments(postId, (list) => list.filter((c) => c.id !== commentId)),

      addReply: (postId, commentId, text) =>
        mapComments(postId, (list) =>
          list.map((c) =>
            c.id === commentId
              ? { ...c, replies: [...c.replies, { id: nid("r"), text, ...mine }] }
              : c,
          ),
        ),

      editReply: (postId, commentId, replyId, text) =>
        mapComments(postId, (list) =>
          list.map((c) =>
            c.id === commentId
              ? { ...c, replies: c.replies.map((r) => (r.id === replyId ? { ...r, text, edited: true } : r)) }
              : c,
          ),
        ),

      deleteReply: (postId, commentId, replyId) =>
        mapComments(postId, (list) =>
          list.map((c) =>
            c.id === commentId ? { ...c, replies: c.replies.filter((r) => r.id !== replyId) } : c,
          ),
        ),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, displayName, initials]);

  return <UpdatesContext.Provider value={value}>{children}</UpdatesContext.Provider>;
}

export function useUpdates() {
  const ctx = useContext(UpdatesContext);
  if (!ctx) throw new Error("useUpdates must be used within UpdatesProvider");
  return ctx;
}
