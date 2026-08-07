"use client";
// ============================================================================
// VIEW LAYER — one project in the teacher's list. A LINK, not an accordion.
//
// WHAT THIS USED TO BE, AND WHY IT CHANGED TWICE
//
// First it rendered every project's full working surface at once — submissions,
// hidden tests, the marks control, a footer of actions — so three projects
// filled a screen and a term's worth was unusable.
//
// Then it collapsed, which fixed the list and not the problem. Opening the
// project you wanted still unfolded four panels in place, pushing the rest of the
// list down and leaving the next project's header wedged underneath them. The
// list was short until you used it.
//
// Now the project has its own page, and this is what a list entry should have
// been throughout: a summary you can scan, and a way in. Everything shown here
// is readable from the assignment record the class page already holds, so a
// hundred rows still cost zero requests — the property the collapse was
// protecting, kept, without the collapse.
//
// The counts a teacher might also want (how many submitted, how many marked)
// remain deliberately absent for the same reason as before: they live in a
// per-project query, and fetching one per row to label the list would reinstate
// the request storm. They are the first thing on the page this links to.
// ============================================================================
import Link from "next/link";
import type { Assignment } from "@/models/types";
import { Card, GenericPill } from "@/components/ui";
import { formatDate, relativeDue } from "@/components/ui/format";

export function TeacherProjectRow({
  assignment: a,
  classId,
}: Readonly<{
  assignment: Assignment;
  /** The class this project belongs to — the link's first segment. */
  classId: string;
}>) {
  return (
    <Card className="overflow-hidden animate-fade-up">
      {/*
        The whole row is one link. It was a <button> toggling an expansion; a
        real anchor is what makes middle-click, Cmd-click and "open in new tab"
        work — a teacher marking a class often wants three projects open at once,
        which an accordion could not offer at all.
      */}
      <Link
        href={`/teacher/classes/${classId}/projects/${a.id}`}
        className="flex w-full flex-wrap items-start justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50/80 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-platform"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-[var(--text-strong)]">{a.title}</h3>
            {a.isGroup && <GenericPill tone="info">Group</GenericPill>}
            {a.closedAt && <GenericPill tone="warning">🔒 Closed</GenericPill>}
            {/* Published-marks state, on the row. Scanning for "what have I not
                released yet" is the single most common reason to look down this
                list, so it is answered without opening anything. */}
            {a.gradesReleasedAt ? (
              <GenericPill tone="success">Marks published</GenericPill>
            ) : (
              <GenericPill>Marks withheld</GenericPill>
            )}
          </div>
          <p className="mt-0.5 line-clamp-1 text-sm text-[var(--text-muted)]">
            {a.description}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <div className="text-right text-xs text-[var(--text-muted)]">
            <p className="font-medium text-[var(--text-strong)]">{a.points} pts</p>
            {a.dueDate ? (
              <>
                <p>{relativeDue(a.dueDate)}</p>
                <p>Due {formatDate(a.dueDate)}</p>
              </>
            ) : (
              <p>No due date</p>
            )}
          </div>
          {/* Replaces the disclosure triangle. A chevron that rotated said "this
              opens here"; an arrow says "this goes somewhere", which is now true. */}
          <span aria-hidden="true" className="text-[var(--text-muted)]">
            →
          </span>
        </div>
      </Link>
    </Card>
  );
}
