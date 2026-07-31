"use client";
// ============================================================================
// VIEW LAYER — Student Assignment Hub (multi-class, ADDENDUM D)
//
// ONE CONTAINER PER CLASS. Every class the student is in gets its own panel,
// stacked down the page, holding that class's assignments. There is no class
// filter: the tab strip that used to sit here defaulted to "All", so it did
// nothing until pressed and then HID the other classes — which is the opposite
// of what a student opening this page wants, namely everything they owe, at
// once. Sections answer that by scrolling instead of by clicking.
//
// A student holds exactly one class per course, so each panel IS the course.
// That is why the header reads "IS-1234 · Programming 1" with no section
// letter: the split between a course and a section is a staff concept, and
// showing it here would imply a choice the student does not have.
//
// Consumes useStudentDashboard, which owns the grouping and the active/past
// split. "+ Join Class" opens the whiteboard-code modal; cards link into the
// workspace at /student/repositories/[id].
// ============================================================================
import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/viewmodels/useSession";
import { useStudentDashboard, type ClassSection } from "@/viewmodels/useStudentDashboard";
import type { StudentDashboard } from "@/models/types";
import {
  Button,
  Card,
  CardLink,
  EmptyState,
  GenericPill,
  PipelineStatusPill,
  RepoStatusPill,
  SkeletonCard,
  StateBoundary,
  cn,
} from "@/components/ui";
import { JoinClassModal } from "@/components/domain/JoinClassModal";
import { relativeDue } from "@/components/ui/format";

type Row = StudentDashboard["assignments"][number];

function AssignmentCard({ row, index }: { readonly row: Row; readonly index: number }) {
  const { assignment, repo, latestRun } = row;
  const inner = (
    <CardLink
      className="flex h-full flex-col p-5 animate-fade-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        {/* The class name used to be printed here as an eyebrow. Inside a panel
            headed with that same class it was the same words on every card. */}
        <h3 className="min-w-0 text-lg font-semibold text-[var(--text-strong)]">
          {assignment.title}
        </h3>
        {assignment.isGroup && <GenericPill tone="info">Group</GenericPill>}
      </div>

      <p className="mt-1 line-clamp-2 text-sm text-[var(--text-muted)]">
        {assignment.description}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {repo ? (
          <RepoStatusPill status={repo.status} />
        ) : (
          <GenericPill>Not started</GenericPill>
        )}
        {latestRun && <PipelineStatusPill status={latestRun.status} />}
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
        <div>
          <p className="text-xs text-[var(--text-muted)]">Latest CI score</p>
          <p
            className={cn(
              "text-2xl font-semibold tabular-nums",
              latestRun?.score != null
                ? latestRun.score >= 80
                  ? "text-success"
                  : latestRun.score >= 50
                    ? "text-platform"
                    : "text-amber-600"
                : "text-[var(--text-muted)]",
            )}
          >
            {latestRun?.score != null ? `${latestRun.score}%` : "—"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[var(--text-muted)]">
            {assignment.dueDate ? relativeDue(assignment.dueDate) : "No due date"}
          </p>
          {repo && (
            <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-platform">
              Open workspace <span aria-hidden="true">→</span>
            </span>
          )}
        </div>
      </div>
    </CardLink>
  );

  if (!repo) return inner;
  return (
    <Link
      href={`/student/repositories/${repo.id}`}
      className="rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform"
    >
      {inner}
    </Link>
  );
}

/**
 * One class, as a container.
 *
 * The header carries the class identity so the cards inside no longer have to,
 * and states the outstanding count — the one number a student scans for when
 * deciding what to open next.
 */
function ClassPanel({
  section,
  index,
}: {
  readonly section: ClassSection;
  readonly index: number;
}) {
  const { classInfo, active, past, total } = section;

  let standing = "Nothing yet";
  if (active.length > 0) standing = `${active.length} to do`;
  else if (total > 0) standing = "All caught up";

  return (
    <Card
      className="overflow-hidden animate-fade-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-[var(--border-subtle)] bg-slate-50/60 px-5 py-4">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <h2 className="text-base font-semibold text-[var(--text-strong)]">
            {classInfo.code}
          </h2>
          <span aria-hidden="true" className="text-[var(--text-muted)]">
            ·
          </span>
          <p className="text-base text-[var(--text-strong)]">{classInfo.name}</p>
          <span className="text-xs text-[var(--text-muted)]">{classInfo.term}</span>
        </div>
        <p className="text-xs font-medium text-[var(--text-muted)]">{standing}</p>
      </header>

      <div className="space-y-6 p-5">
        {total === 0 ? (
          // Per class, not per page: with several classes, one of them having no
          // work is normal and should not read as the whole hub being empty.
          <p className="py-2 text-sm text-[var(--text-muted)]">
            No assignments in this class yet. When your teacher publishes one, your
            repository appears here automatically.
          </p>
        ) : (
          <>
            {active.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {active.map((row, i) => (
                  <AssignmentCard key={row.assignment.id} row={row} index={i} />
                ))}
              </div>
            )}

            {/* Past work stays reachable but visually demoted — it is reference,
                not something to act on. */}
            {past.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Past ({past.length})
                </h3>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {past.map((row, i) => (
                    <AssignmentCard key={row.assignment.id} row={row} index={i} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

export default function StudentHubPage() {
  const { user } = useSession();
  const vm = useStudentDashboard(user?.id ?? null);
  const [joinOpen, setJoinOpen] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3 animate-fade-up">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-strong)]">
            Assignment Hub
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Your saved progress across every class — pick up exactly where you left off.
          </p>
        </div>
        <Button onClick={() => setJoinOpen(true)}>
          <span aria-hidden="true">＋</span> Join Class
        </Button>
      </div>

      <StateBoundary
        isLoading={vm.isLoading}
        error={vm.error}
        onRetry={vm.refetch}
        // Only the no-classes case is empty at PAGE level now. A student who is
        // enrolled but has no work sees their class panels saying so, which is
        // more informative than one blank page standing in for all of them.
        isEmpty={!vm.hasClasses}
        emptyFallback={
          <EmptyState
            icon="🎓"
            title="You're not in any classes yet"
            description="Ask your teacher for the class code from the whiteboard, then join to see your assignments."
            action={
              <Button onClick={() => setJoinOpen(true)}>
                <span aria-hidden="true">＋</span> Join Class
              </Button>
            }
          />
        }
        loadingFallback={
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        }
      >
        <div className="space-y-6">
          {vm.sections.map((section, i) => (
            <ClassPanel key={section.classInfo.id} section={section} index={i} />
          ))}
        </div>
      </StateBoundary>

      {/* + Join Class (whiteboard code flow) */}
      {joinOpen && (
        <JoinClassModal
          open
          onClose={() => setJoinOpen(false)}
          studentId={user?.id ?? null}
        />
      )}
    </div>
  );
}
