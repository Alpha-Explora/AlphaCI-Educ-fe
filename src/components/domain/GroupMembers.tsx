"use client";
// ============================================================================
// VIEW LAYER — who a student shares a group repository with.
//
// WHY THIS EXISTS. The teacher's repository page has listed collaborators since
// group projects were built. The student's never did — so the person actually IN
// the group was the one person the app never told who they were working with.
// They got a "Group project" pill and, on the submit panel, "a teammate reviews
// it": a requirement naming nobody.
//
// The data was already on the wire. `GET /repositories/:id` returns
// `collaborators` and the student page was simply not rendering it, which is why
// this is a view component and not a fetch.
//
// PLACED OUTSIDE THE TABS, deliberately, next to the project-closed banner and
// for the same reason given there: who your group is applies to every panel, and
// putting it inside one tab hides it from a student reading a different one. It
// is also the answer to "who do I ask to approve this?", a question raised on the
// Work tab and answered nowhere.
//
// SELF IS SHOWN, NOT FILTERED OUT. A list of "the others" reads as the whole
// group to someone skim-reading, and a pair project would show one name — which
// looks like a solo project with a stray person attached. Marking yourself keeps
// the group's real size visible.
// ============================================================================
import type { SystemUser } from "@/models/types";
import { Avatar } from "@/components/ui";

export function GroupMembers({
  members,
  currentUserId,
  className,
}: {
  readonly members: readonly SystemUser[];
  readonly currentUserId: string | null;
  readonly className?: string;
}) {
  // A group repository with nobody on it is a provisioning fault, not an empty
  // state to decorate. Saying so plainly beats an empty strip that reads as
  // "you have no teammates" — which would be a lie about a group project.
  if (members.length === 0) {
    return (
      <p className={className}>
        <span className="text-xs text-[var(--text-muted)]">
          This is a group project, but no members are recorded on this
          repository. Tell your teacher — it usually means provisioning did not
          finish.
        </span>
      </p>
    );
  }

  return (
    <div className={className}>
      <p className="text-xs font-medium text-[var(--text-muted)]">
        Your group · {members.length}{" "}
        {members.length === 1 ? "member" : "members"}
      </p>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
        {members.map((member) => {
          const isYou = member.id === currentUserId;
          return (
            <li key={member.id} className="flex items-center gap-2">
              <Avatar name={member.fullName} color={member.avatarColor} size="sm" />
              <span className="text-sm text-[var(--text-strong)]">
                {member.fullName}
                {isYou && (
                  <span className="ml-1 text-xs text-[var(--text-muted)]">(you)</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {members.length === 1 && (
        // Worth saying rather than leaving them to infer it. A one-person group
        // cannot satisfy the peer-review gate, so the merge button will refuse
        // and the reason would otherwise look like a bug.
        <p className="mt-2 text-xs text-amber-700">
          You are the only member recorded, so nobody can review your pull
          request — a teammate&rsquo;s approval is required before a group
          project can be merged. Ask your teacher to check the group.
        </p>
      )}
    </div>
  );
}
