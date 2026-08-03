"use client";
// ============================================================================
// VIEW LAYER — one project on the teacher's Assignments tab, COLLAPSED BY
// DEFAULT.
//
// WHY THIS EXISTS
// Every project used to render its full working surface at once: the submission
// list, the hidden-tests panel, the marks control and the action footer. Three
// projects filled a screen; a term's worth meant scrolling past everything to
// reach anything, and the project a teacher actually wanted was never the one on
// screen.
//
// It was also expensive in a way that is invisible until the list grows. Each
// expanded project mounts TWO queries of its own — useAssignmentRepositories for
// the submissions and useHiddenTests for the suite — so twenty projects opened a
// class page with roughly forty requests in flight before the teacher had done
// anything. Collapsing is therefore not only a scrolling fix: an unopened row
// mounts neither child, so it costs no requests at all. That is the reason the
// body is conditionally RENDERED rather than hidden with CSS, which would keep
// both queries and save nothing.
//
// WHAT THE COLLAPSED ROW HAS TO CARRY
// If the summary cannot answer "is this the project I want", collapsing has only
// moved the work. So the header shows everything already known from the
// assignment record itself — title, group/closed state, points, deadline, and
// whether marks are published — and none of it costs a request.
//
// The counts a teacher might also want (how many submitted, how many marked)
// deliberately are NOT here: they live in the per-project repositories query,
// and fetching them for every row to label the summary would reinstate the exact
// request storm this component removes. They appear on expand.
// ============================================================================
import { useId, useState } from "react";
import type { Assignment, SystemUser } from "@/models/types";
import type { ClassAssignmentsVM } from "@/viewmodels/useClassAssignments";
import { Button, Card, GenericPill, cn } from "@/components/ui";
import { formatDate, relativeDue } from "@/components/ui/format";
import { AssignmentSubmissions } from "./AssignmentSubmissions";
import { HiddenTestsPanel } from "./HiddenTestsPanel";
import { GradeReleaseControl } from "./GradeReleaseControl";
import { ProvisionRepositoriesButton } from "./ProvisionRepositoriesButton";

export function TeacherProjectRow({
  assignment: a,
  sectionLabel,
  usersById,
  vm,
}: Readonly<{
  assignment: Assignment;
  /** The section letter, for the "creates one repo per student in X" note. */
  sectionLabel: string;
  usersById: Record<string, SystemUser>;
  vm: ClassAssignmentsVM;
}>) {
  const [open, setOpen] = useState(false);
  // Local, not lifted to the page as it used to be: a delete confirmation is
  // about THIS row, and holding one id for the whole list meant the page had to
  // remember which row was mid-confirmation. Collapsing a row now also cancels
  // its confirmation, which is the behaviour a teacher would expect anyway.
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const bodyId = useId();

  const closing = vm.isSettingClosed && vm.closingId === a.id;

  return (
    <Card className="overflow-hidden animate-fade-up">
      {/* The whole header is the toggle. A <button> rather than a div with a
          click handler, so Enter/Space and the expanded state are announced
          without any of it being re-implemented. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={bodyId}
        className={cn(
          "flex w-full flex-wrap items-start justify-between gap-3 px-5 py-4 text-left transition-colors",
          "hover:bg-slate-50/80 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-platform",
          open && "border-b border-[var(--border-subtle)]",
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className={cn(
              "mt-1 shrink-0 text-[var(--text-muted)] transition-transform duration-200",
              open && "rotate-90",
            )}
          >
            ▶
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-[var(--text-strong)]">{a.title}</h3>
              {a.isGroup && <GenericPill tone="info">Group</GenericPill>}
              {a.closedAt && <GenericPill tone="warning">🔒 Closed</GenericPill>}
              {/* Published-marks state, on the closed row. A teacher scanning
                  for "what have I not released yet" is the single most common
                  reason to open one of these, so it is answered without doing
                  so. Read from the assignment record — no request. */}
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
        </div>

        <div className="shrink-0 text-right text-xs text-[var(--text-muted)]">
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
      </button>

      {/* Not `hidden`, not `max-h-0` — genuinely unmounted while closed, so the
          two child queries are never issued for a project nobody opened. */}
      {open && (
        <div id={bodyId}>
          <AssignmentSubmissions
            assignmentId={a.id}
            points={a.points}
            usersById={usersById}
          />
          <div className="space-y-4 px-5 pb-4">
            <HiddenTestsPanel assignmentId={a.id} />
            <GradeReleaseControl assignmentId={a.id} releasedAt={a.gradesReleasedAt} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-slate-50/60 px-5 py-3">
            <p className="text-xs text-[var(--text-muted)]">
              {a.isGroup
                ? `Creates one shared GitHub repository per group in Section ${sectionLabel}.`
                : `Creates one GitHub repository per selected student in Section ${sectionLabel}.`}
            </p>
            <div className="flex items-center gap-2">
              {a.closedAt ? (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={closing}
                  onClick={() => vm.setProjectClosed(a.id, false)}
                >
                  Reopen
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  loading={closing}
                  onClick={() => vm.setProjectClosed(a.id, true)}
                >
                  <span aria-hidden="true">🔒</span> End project
                </Button>
              )}

              {confirmingDelete ? (
                <>
                  <span className="text-xs text-red-700">
                    Delete &ldquo;{a.title}&rdquo; + its repos?
                  </span>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={vm.isDeleting && vm.deletingId === a.id}
                    onClick={() => vm.deleteAssignment(a.id)}
                  >
                    Delete
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => setConfirmingDelete(true)}
                >
                  <span aria-hidden="true">🗑</span> Delete
                </Button>
              )}

              <ProvisionRepositoriesButton assignmentId={a.id} />
            </div>
          </div>

          {vm.deleteError && vm.deletingId === a.id && (
            <p className="border-t border-[var(--border-subtle)] bg-red-50 px-5 py-2 text-sm text-red-700">
              {vm.deleteError}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
