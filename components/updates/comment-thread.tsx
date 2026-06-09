"use client";

import { useState } from "react";
import { useProfile } from "@/components/providers/profile-provider";
import { useUpdates } from "@/components/providers/updates-provider";
import { cn } from "@/lib/utils";

function Avatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold", className)}>
      {initials}
    </span>
  );
}

/** Inline composer used for new comments and replies. */
function Composer({
  initials,
  placeholder,
  onSubmit,
  onCancel,
  autoFocus,
}: {
  initials: string;
  placeholder: string;
  onSubmit: (text: string) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const submit = () => {
    if (!text.trim()) return;
    onSubmit(text.trim());
    setText("");
  };
  return (
    <div className="flex gap-2">
      <Avatar initials={initials} />
      <div className="flex-1">
        <textarea
          value={text}
          autoFocus={autoFocus}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full resize-none rounded-xl border border-input bg-input/30 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring"
        />
        <div className="mt-1.5 flex justify-end gap-2">
          {onCancel && (
            <button onClick={onCancel} className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          )}
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
          >
            Post
          </button>
        </div>
      </div>
    </div>
  );
}

function OwnerActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex gap-3 text-xs">
      <button onClick={onEdit} className="text-muted-foreground hover:text-info">Edit</button>
      <button onClick={onDelete} className="text-muted-foreground hover:text-danger">Delete</button>
    </div>
  );
}

export function CommentThread({ postId }: { postId: string }) {
  const { initials } = useProfile();
  const {
    getComments,
    addComment,
    editComment,
    deleteComment,
    addReply,
    editReply,
    deleteReply,
  } = useUpdates();

  const comments = getComments(postId);
  const [replyOn, setReplyOn] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // commentId or replyId

  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4">
      <Composer initials={initials} placeholder="Post your reply…" onSubmit={(t) => addComment(postId, t)} />

      {comments.length === 0 && (
        <p className="py-2 text-center text-sm text-muted-foreground">No comments yet. Be the first.</p>
      )}

      {comments.map((c) => (
        <div key={c.id} className="space-y-3">
          {/* Comment */}
          <div className="flex gap-2">
            <Avatar initials={c.initials} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold">{c.author}</span>
                <span className="text-muted-foreground">· {c.time}</span>
                {c.edited && <span className="text-muted-foreground">(edited)</span>}
              </div>

              {editing === c.id ? (
                <div className="mt-1">
                  <Composer
                    initials={c.initials}
                    autoFocus
                    placeholder="Edit your comment…"
                    onSubmit={(t) => { editComment(postId, c.id, t); setEditing(null); }}
                    onCancel={() => setEditing(null)}
                  />
                </div>
              ) : (
                <p className="mt-0.5 text-sm">{c.text}</p>
              )}

              <div className="mt-1 flex items-center gap-3">
                <button
                  onClick={() => setReplyOn(replyOn === c.id ? null : c.id)}
                  className="text-xs text-muted-foreground hover:text-info"
                >
                  Reply
                </button>
                {c.self && editing !== c.id && (
                  <OwnerActions onEdit={() => setEditing(c.id)} onDelete={() => deleteComment(postId, c.id)} />
                )}
              </div>

              {replyOn === c.id && (
                <div className="mt-2">
                  <Composer
                    initials={initials}
                    autoFocus
                    placeholder={`Reply to ${c.author}…`}
                    onSubmit={(t) => { addReply(postId, c.id, t); setReplyOn(null); }}
                    onCancel={() => setReplyOn(null)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Replies */}
          {c.replies.length > 0 && (
            <div className="ml-10 space-y-3 border-l border-border pl-3">
              {c.replies.map((r) => (
                <div key={r.id} className="flex gap-2">
                  <Avatar initials={r.initials} className="size-7" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold">{r.author}</span>
                      <span className="text-muted-foreground">· {r.time}</span>
                      {r.edited && <span className="text-muted-foreground">(edited)</span>}
                    </div>

                    {editing === r.id ? (
                      <div className="mt-1">
                        <Composer
                          initials={r.initials}
                          autoFocus
                          placeholder="Edit your reply…"
                          onSubmit={(t) => { editReply(postId, c.id, r.id, t); setEditing(null); }}
                          onCancel={() => setEditing(null)}
                        />
                      </div>
                    ) : (
                      <p className="mt-0.5 text-sm">{r.text}</p>
                    )}

                    {r.self && editing !== r.id && (
                      <div className="mt-1">
                        <OwnerActions onEdit={() => setEditing(r.id)} onDelete={() => deleteReply(postId, c.id, r.id)} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
