"use client";
// ============================================================================
// VIEW LAYER — Student Assignment Hub (multi-class, ADDENDUM D)
// Active + past assignments with status and latest CI score, filtered by the
// selected class. Consumes useStudentDashboard (classes + selection + split).
// "+ Join Class" opens the whiteboard-code modal. Cards link into the active
// workspace at /student/repositories/[id].
// ============================================================================
import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/viewmodels/useSession";
import { useStudentDashboard } from "@/viewmodels/useStudentDashboard";
import type { StudentDashboard } from "@/models/types";
import {
  Button,
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

function AssignmentCard({ row, index }: { row: Row; index: number }) {
  const { assignment, className, repo, latestRun } = row;
  const inner = (
    <CardLink
      className="flex h-full flex-col p-5 animate-fade-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-platform">
            {className}
          </p>
          <h3 className="mt-0.5 text-lg font-semibold text-[var(--text-strong)]">
            {assignment.title}
          </h3>
        </div>
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
          <p className="text-xs text-[var(--text-muted)]">{relativeDue(assignment.dueDate)}</p>
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

      {/* Course selector — filters the assignment list by class */}
      {vm.hasClasses && (
        <div
          role="tablist"
          aria-label="Filter by class"
          className="flex flex-wrap gap-1 rounded-lg border border-[var(--border-subtle)] bg-slate-50 p-1"
        >
          <ClassTab
            label="All classes"
            active={vm.selectedClassId === null}
            onClick={() => vm.setSelectedClassId(null)}
          />
          {vm.classes.map((c) => (
            <ClassTab
              key={c.id}
              label={c.code}
              sublabel={c.term}
              active={vm.selectedClassId === c.id}
              onClick={() => vm.setSelectedClassId(c.id)}
            />
          ))}
        </div>
      )}

      <StateBoundary
        isLoading={vm.isLoading}
        error={vm.error}
        onRetry={vm.refetch}
        isEmpty={!vm.hasClasses || vm.visibleCount === 0}
        emptyFallback={
          !vm.hasClasses ? (
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
          ) : (
            <EmptyState
              icon="🚀"
              title="No assignments yet"
              description="When your teacher publishes an assignment, your repository appears here automatically."
            />
          )
        }
        loadingFallback={
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        }
      >
        <div className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Active ({vm.active.length})
            </h2>
            {vm.active.length === 0 ? (
              <EmptyState
                icon="✅"
                title="All caught up"
                description="No active assignments right now."
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {vm.active.map((row, i) => (
                  <AssignmentCard key={row.assignment.id} row={row} index={i} />
                ))}
              </div>
            )}
          </section>

          {vm.past.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Past ({vm.past.length})
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {vm.past.map((row, i) => (
                  <AssignmentCard key={row.assignment.id} row={row} index={i} />
                ))}
              </div>
            </section>
          )}
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

// Course-selector tab.
function ClassTab({
  label,
  sublabel,
  active,
  onClick,
}: {
  label: string;
  sublabel?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-platform",
        active
          ? "bg-white text-platform-700 shadow-sm"
          : "text-[var(--text-muted)] hover:text-[var(--text-strong)]",
      )}
    >
      {label}
      {sublabel && (
        <span className="ml-1.5 text-xs font-normal opacity-70">{sublabel}</span>
      )}
    </button>
  );
}
