"use client";
// ============================================================================
// VIEW LAYER — one project, on its own page (teacher).
//
// WHY THIS IS A PAGE AND NOT A ROW
//
// This was an accordion on the class's Assignments tab: every project a card,
// and opening one unfolded its whole working surface — the submission list, the
// hidden-tests panel, the marks control and a footer of destructive actions —
// underneath the row, pushing every project below it further down. Collapsing
// the rows had already been tried, and it fixed the wrong half of the problem:
// the page was short again, but the moment a teacher opened the project they
// wanted, they were back to a screen of stacked panels with the next project's
// header wedged beneath them. With a term's worth of projects, "open the one I
// want" and "see all of them" were the same scroll.
//
// A project is a destination. It has a title, a deadline, a roster of
// submissions and four actions that change it — that is a page, and treating it
// as one means the list can go back to being a list.
//
// It also has a URL now, which the accordion could not. A teacher can bookmark
// the project they mark every week, and the browser's Back button returns them
// to the Assignments tab rather than to a collapsed row that has forgotten it
// was ever open.
//
// WHAT STAYED BEHIND
//
// The list keeps everything readable from the assignment record alone — title,
// group/closed state, points, deadline, whether marks are published — because
// that is what answers "is this the one I want" without a request. Everything
// here costs a query, which is precisely why it should not run for twenty
// projects nobody opened.
// ============================================================================
import { useState } from "react";
import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useClassRoster } from "@/viewmodels/useClassRoster";
import { useClassAssignments } from "@/viewmodels/useClassAssignments";
import type { SystemUser } from "@/models/types";
import {
  Banner,
  Button,
  Card,
  GenericPill,
  Skeleton,
  StateBoundary,
} from "@/components/ui";
import { PageHeader } from "@/components/domain/PageHeader";
import { AssignmentSubmissions } from "@/components/domain/AssignmentSubmissions";
import { HiddenTestsPanel } from "@/components/domain/HiddenTestsPanel";
import { GradeReleaseControl } from "@/components/domain/GradeReleaseControl";
import { ProvisionRepositoriesButton } from "@/components/domain/ProvisionRepositoriesButton";
import { formatDate, relativeDue } from "@/components/ui/format";

export default function TeacherProjectPage() {
  const params = useParams<{ id: string; assignmentId: string }>();
  const router = useRouter();
  const classId = params?.id ?? null;
  const assignmentId = params?.assignmentId ?? null;

  // Back to the tab this project was opened from, not to the class's default
  // section. `?tab=` is read by the class page for exactly this.
  const backHref = `/teacher/classes/${classId}?tab=assignments`;

  const roster = useClassRoster(classId);
  // The class's list rather than a single-assignment fetch: arriving from the
  // Assignments tab this is already in cache, and the same VM carries the end /
  // reopen / delete mutations this page needs. A deep link costs one request.
  const vm = useClassAssignments(classId, () => router.replace(backHref));

  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const assignment = useMemo(
    () => vm.assignments.find((a) => a.id === assignmentId) ?? null,
    [vm.assignments, assignmentId],
  );

  // Owner names for the submission rows. The roster is almost always a cache hit
  // — a teacher reaches this page from the class — and the rows degrade to the
  // repository name while it is not, rather than blocking the page on it.
  const usersById = useMemo<Record<string, SystemUser>>(() => {
    const map: Record<string, SystemUser> = {};
    for (const s of roster.data?.students ?? []) map[s.id] = s;
    for (const t of roster.data?.teachers ?? []) map[t.id] = t;
    return map;
  }, [roster.data]);

  const info = roster.data?.classInfo;
  const sectionLabel = info?.section ?? "this section";
  const closing = Boolean(assignment && vm.isSettingClosed && vm.closingId === assignment.id);

  return (
    <div className="space-y-8">
      <StateBoundary
        isLoading={vm.isLoading}
        error={vm.error}
        loadingFallback={
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        }
      >
        {/*
          A loaded class that does not contain this project. Reached by a stale
          bookmark or a link to something a colleague has since deleted — said
          plainly, with the way back, rather than left as an empty page.
        */}
        {!assignment && !vm.isLoading && (
          <Card className="p-8 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              This project is no longer in this class. It may have been deleted.
            </p>
            <Button variant="secondary" className="mt-4" onClick={() => router.push(backHref)}>
              Back to projects
            </Button>
          </Card>
        )}

        {assignment && (
          <>
            <PageHeader
              titleAlign="end"
              backHref={backHref}
              backLabel={info ? `${info.code} — projects` : "Projects"}
              title={assignment.title}
              subtitle={assignment.description || undefined}
              meta={
                <>
                  {assignment.isGroup && <GenericPill tone="info">Group project</GenericPill>}
                  {assignment.closedAt && <GenericPill tone="warning">🔒 Closed</GenericPill>}
                  {assignment.gradesReleasedAt ? (
                    <GenericPill tone="success">Marks published</GenericPill>
                  ) : (
                    <GenericPill>Marks withheld</GenericPill>
                  )}
                  <GenericPill>{assignment.points} pts</GenericPill>
                  {assignment.dueDate && (
                    <GenericPill tone="warning">{relativeDue(assignment.dueDate)}</GenericPill>
                  )}
                </>
              }
            />

            {/*
              Submissions FIRST. Marking is why a teacher opens a project, and on
              the accordion this list sat above three panels that pushed it off
              screen the moment the row expanded.
            */}
            <section className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-lg font-semibold text-[var(--text-strong)]">
                  Submissions
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  {assignment.dueDate
                    ? `Due ${formatDate(assignment.dueDate)}`
                    : "No deadline set"}
                </p>
              </div>
              <Card className="overflow-hidden">
                <AssignmentSubmissions
                  assignmentId={assignment.id}
                  assignment={assignment}
                  usersById={usersById}
                />
              </Card>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-[var(--text-strong)]">
                Marking setup
              </h2>
              <HiddenTestsPanel assignmentId={assignment.id} />
              <GradeReleaseControl
                assignmentId={assignment.id}
                releasedAt={assignment.gradesReleasedAt}
              />
            </section>

            {/*
              The four things that CHANGE this project, at the bottom and in one
              place. Provisioning is the constructive one and keeps its primary
              styling; ending and deleting are grouped with it because a teacher
              looking for "what can I do to this project" should find one answer,
              not three scattered ones.
            */}
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-[var(--text-strong)]">
                Project actions
              </h2>
              <Card className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-[var(--text-muted)]">
                    {assignment.isGroup
                      ? `Creates one shared GitHub repository per group in Section ${sectionLabel}.`
                      : `Creates one GitHub repository per selected student in Section ${sectionLabel}.`}
                  </p>
                  <ProvisionRepositoriesButton assignmentId={assignment.id} />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-strong)]">
                      {assignment.closedAt ? "This project is ended" : "End this project"}
                    </p>
                    <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                      {assignment.closedAt
                        ? "Students cannot push, take a token or submit. Reopening restores all three."
                        : "Students lose the ability to push, take a token or submit. Reversible."}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    loading={closing}
                    onClick={() => vm.setProjectClosed(assignment.id, !assignment.closedAt)}
                    className="shrink-0"
                  >
                    {assignment.closedAt ? "Reopen" : "🔒 End project"}
                  </Button>
                </div>
              </Card>

              {/*
                Its own red card, matching the class page's danger zone. On the
                accordion, Delete was a ghost button in a footer strip beside
                Reopen and Provision — three buttons of near-equal weight, one of
                which destroys every student's work on the project.
              */}
              <Card className="border-red-200 p-5">
                <h3 className="text-base font-semibold text-[var(--text-strong)]">
                  Danger zone
                </h3>
                {vm.deleteError && vm.deletingId === assignment.id && (
                  <Banner tone="error" className="mt-3">
                    {vm.deleteError}
                  </Banner>
                )}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50/60 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-strong)]">
                      Delete this project
                    </p>
                    <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                      Permanently deletes &ldquo;{assignment.title}&rdquo;, every student
                      repository under it, and any submitted or graded work. This cannot
                      be undone.
                    </p>
                  </div>
                  {confirmingDelete ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        variant="danger"
                        loading={vm.isDeleting && vm.deletingId === assignment.id}
                        onClick={() => vm.deleteAssignment(assignment.id)}
                      >
                        Delete permanently
                      </Button>
                      <Button variant="ghost" onClick={() => setConfirmingDelete(false)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="danger"
                      onClick={() => setConfirmingDelete(true)}
                      className="shrink-0"
                    >
                      Delete project
                    </Button>
                  )}
                </div>
              </Card>
            </section>
          </>
        )}
      </StateBoundary>
    </div>
  );
}
