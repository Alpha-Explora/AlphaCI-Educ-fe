"use client";
// ============================================================================
// VIEW LAYER — the discussion on a pull request.
//
// A review with no way to say WHY is not a review. Until this existed a teammate
// could approve or not approve and a teacher could merge or not merge, and
// neither could leave a sentence explaining the decision — so every piece of
// feedback in the product had to happen somewhere this product could not see.
//
// SHAPED LIKE GITHUB'S CONVERSATION, on purpose. Avatar, author, relative time,
// body, one level of replies. Students are learning the real tool; a review
// thread that looks like the one they will use at work is part of the lesson,
// and inventing a different shape here would teach them nothing transferable.
//
// WHAT IS NOT HERE: comments anchored to a file and a line. Those belong on the
// diff, which is its own view, and half-building them — a composer with nothing
// to attach to — would be worse than their absence.
// ============================================================================
import { useState } from "react";
import type { PullRequestComment, SystemUser } from "@/models/types";
import {
  usePullRequestComments,
  type CommentThread,
} from "@/viewmodels/usePullRequestComments";
import { relativeTime } from "@/components/ui/format";
import { Avatar, Banner, Button, Spinner, Textarea, cn } from "@/components/ui";

export function PullRequestConversation({
  repoId,
  number,
  viewer,
}: {
  readonly repoId: string;
  readonly number: number;
  readonly viewer: SystemUser | null;
}) {
  const vm = usePullRequestComments(repoId, number, viewer);
  const [draft, setDraft] = useState("");

  const submit = () => {
    const body = draft.trim();
    if (!body || vm.isAdding) return;
    vm.add({ body });
    // Cleared optimistically. The mutation refetches the thread on success, and
    // a composer that kept its text after posting reads as "that failed".
    setDraft("");
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-[var(--text-strong)]">Conversation</h3>
        {vm.count > 0 && (
          <span className="rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--text-muted)]">
            {vm.count}
          </span>
        )}
      </div>

      {vm.error && <Banner tone="error">{vm.error.message}</Banner>}
      {vm.actionError && <Banner tone="error">{vm.actionError.message}</Banner>}

      {vm.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <Spinner /> Loading the conversation…
        </div>
      ) : vm.threads.length === 0 ? (
        <p className="rounded-lg bg-[var(--bg-subtle)] px-4 py-3 text-sm text-[var(--text-muted)]">
          No comments yet. Explain what you changed, or ask your teacher a
          question about this submission.
        </p>
      ) : (
        <ul className="space-y-4">
          {vm.threads.map((thread) => (
            <Thread key={thread.comment.id} thread={thread} vm={vm} />
          ))}
        </ul>
      )}

      {/* The composer is always LAST, like every message thread anyone has used.
          Putting it on top would make the newest comment the furthest from the
          box that answers it. */}
      <div className="rounded-lg border border-[var(--border-subtle)] p-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Leave a comment…"
          rows={3}
          maxLength={5000}
          onKeyDown={(e) => {
            // Ctrl/Cmd+Enter posts — the shortcut every code-review tool has.
            // Plain Enter must stay a newline: a comment about code needs them.
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-[var(--text-muted)]">
            {draft.length > 4500 && `${5000 - draft.length} characters left`}
          </span>
          <Button size="sm" loading={vm.isAdding} disabled={!draft.trim()} onClick={submit}>
            Comment
          </Button>
        </div>
      </div>
    </section>
  );
}

function Thread({
  thread,
  vm,
}: {
  readonly thread: CommentThread;
  readonly vm: ReturnType<typeof usePullRequestComments>;
}) {
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");

  const sendReply = () => {
    const body = reply.trim();
    if (!body) return;
    vm.add({ body, replyToId: thread.comment.id });
    setReply("");
    setReplying(false);
  };

  return (
    <li>
      <CommentCard comment={thread.comment} vm={vm} onReply={() => setReplying((on) => !on)} />

      {thread.replies.length > 0 && (
        // Indented once and only once. The data model refuses deeper nesting, so
        // the view cannot draw a staircase that the server would not store.
        <ul className="ml-6 mt-2 space-y-2 border-l border-[var(--border-subtle)] pl-4">
          {thread.replies.map((reply) => (
            <li key={reply.id}>
              <CommentCard comment={reply} vm={vm} />
            </li>
          ))}
        </ul>
      )}

      {replying && (
        <div className="ml-6 mt-2 border-l border-[var(--border-subtle)] pl-4">
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Reply…"
            rows={2}
            maxLength={5000}
            autoFocus
          />
          <div className="mt-2 flex gap-2">
            <Button size="sm" loading={vm.isAdding} disabled={!reply.trim()} onClick={sendReply}>
              Reply
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setReplying(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

/** Colours the author's role so a teacher's answer is findable in a long thread. */
const ROLE_STYLES: Record<string, string> = {
  TEACHER: "bg-platform-50 text-platform-700 ring-platform-200",
  ADMIN: "bg-amber-50 text-amber-800 ring-amber-200",
  SUPER_ADMIN: "bg-amber-50 text-amber-800 ring-amber-200",
};

const ROLE_LABEL: Record<string, string> = {
  TEACHER: "Teacher",
  ADMIN: "IT Admin",
  SUPER_ADMIN: "Operator",
};

function CommentCard({
  comment,
  vm,
  onReply,
}: {
  readonly comment: PullRequestComment;
  readonly vm: ReturnType<typeof usePullRequestComments>;
  readonly onReply?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);

  const save = () => {
    const body = draft.trim();
    if (!body) return;
    vm.edit({ commentId: comment.id, body });
    setEditing(false);
  };

  return (
    <article className="rounded-lg border border-[var(--border-subtle)]">
      <header className="flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2">
        {/* A deleted account has no colour left to read. Slate keeps the row
            laid out the same rather than collapsing where the avatar was. */}
        <Avatar
          name={comment.authorName}
          color={comment.authorAvatarColor ?? "#94a3b8"}
          size="sm"
        />
        <span className="text-sm font-medium text-[var(--text-strong)]">
          {comment.authorName}
        </span>
        {comment.authorRole && ROLE_LABEL[comment.authorRole] && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
              ROLE_STYLES[comment.authorRole],
            )}
          >
            {ROLE_LABEL[comment.authorRole]}
          </span>
        )}
        <span className="text-xs text-[var(--text-muted)]">
          {relativeTime(comment.createdAt)}
          {/* Said plainly. A thread where messages change silently is one nobody
              can rely on as a record of what was asked and answered. */}
          {comment.editedAt && " · edited"}
        </span>

        <div className="ml-auto flex items-center gap-1">
          {onReply && (
            <button
              type="button"
              onClick={onReply}
              className="rounded px-2 py-0.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-slate-100 hover:text-[var(--text-strong)]"
            >
              Reply
            </button>
          )}
          {vm.canEdit(comment) && !editing && (
            <button
              type="button"
              onClick={() => {
                setDraft(comment.body);
                setEditing(true);
              }}
              className="rounded px-2 py-0.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:bg-slate-100 hover:text-[var(--text-strong)]"
            >
              Edit
            </button>
          )}
          {vm.canDelete(comment) && (
            <button
              type="button"
              onClick={() => vm.remove(comment.id)}
              disabled={vm.isRemoving}
              className="rounded px-2 py-0.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      </header>

      <div className="px-3 py-2.5">
        {editing ? (
          <>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              maxLength={5000}
              autoFocus
            />
            <div className="mt-2 flex gap-2">
              <Button size="sm" loading={vm.isEditing} disabled={!draft.trim()} onClick={save}>
                Save
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          // `whitespace-pre-wrap`: a comment about code carries newlines and
          // indentation, and collapsing them would mangle every snippet anyone
          // pastes in. `break-words` keeps a pasted URL from widening the card.
          <p className="whitespace-pre-wrap break-words text-sm text-[var(--text-strong)]">
            {comment.body}
          </p>
        )}
      </div>
    </article>
  );
}
