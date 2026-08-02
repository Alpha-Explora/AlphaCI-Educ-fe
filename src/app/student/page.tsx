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
//
// TWO LEVELS OF CONTAINER, AND HOW THEY ARE TOLD APART
// The class is the outer container and wears the SCHOOL'S colour — the same
// light brand wash a teacher's course card wears, for the same reason given
// there: an enrolment list is the school's structure, not the student's own
// working set, so it is not the place for eight competing hues. What varies per
// panel is the TEXTURE (patternFor, keyed on the class id), which is enough to
// find a subject by memory without implying the classes differ in kind.
//
// Colour-per-item is deliberately not offered here. A teacher picks their class
// colours because they own those classes and see them all day; a student is
// handed a list they did not build, and a hub that dealt itself a graphite or
// amber panel would read as a different product on the same login.
//
// The projects are the inner containers and are deliberately NOT washed: they
// sit on white inside the tinted panel. Tinting both levels makes the boundary
// between them vanish, and the boundary is the whole point — a student needs to
// see "three things owed in THIS subject" at a glance. Each project keeps a
// brand hairline down its left edge so it still reads as belonging to the panel
// once the header has scrolled away.
//
// Everything below draws from the `platform` scale, never a literal hex, so a
// school re-skinning via globals.css repaints this page with it.
// ============================================================================
import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/viewmodels/useSession";
import { useStudentDashboard, type ClassSection } from "@/viewmodels/useStudentDashboard";
import type { StudentDashboard } from "@/models/types";
import {
  Button,
  CardDecor,
  EmptyState,
  GenericPill,
  PipelineStatusPill,
  RepoStatusPill,
  SkeletonCard,
  StateBoundary,
  cn,
  patternFor,
} from "@/components/ui";
import { JoinClassModal } from "@/components/domain/JoinClassModal";
import { relativeDue } from "@/components/ui/format";

type Row = StudentDashboard["assignments"][number];

/**
 * Ink for a CI score, on the SEMANTIC scale — never the panel's dealt colour.
 *
 * A flat function rather than the nested ternary this used to be inline: the
 * thresholds are the thing worth reading here, and three of them buried in a
 * className argument is exactly the shape Sonar rejects (S3358) and a marker
 * later needs to check.
 */
function scoreTone(score: number | null | undefined): string {
  if (score == null) return "text-[var(--text-muted)]";
  if (score >= 80) return "text-success";
  if (score >= 50) return "text-platform";
  return "text-amber-600";
}

/**
 * One project, as an inner container.
 *
 * Drawn on white with a brand hairline down its left edge. That edge is the only
 * colour it borrows from the panel: the score below stays on the SEMANTIC scale
 * (green pass / amber fail), because the brand hue must never be what tells a
 * student whether their build passed.
 */
function AssignmentCard({ row, index }: { readonly row: Row; readonly index: number }) {
  const { assignment, repo, latestRun } = row;
  const inner = (
    <article
      className={cn(
        "group/card relative flex h-full flex-col overflow-hidden rounded-xl border border-platform-200 bg-white p-5 shadow-card",
        "transition-all duration-200 hover:-translate-y-0.5 hover:border-platform-300 hover:shadow-card-hover",
        "animate-fade-up",
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* The tie back to the panel. Left edge rather than top, so it does not
          read as a second copy of the panel's own accent bar. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-platform-600 to-platform-400"
      />

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
              scoreTone(latestRun?.score),
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
            <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-platform-700">
              <span>Open workspace</span>
              <span
                aria-hidden="true"
                className="transition-transform duration-200 group-hover/card:translate-x-0.5"
              >
                →
              </span>
            </span>
          )}
        </div>
      </div>
    </article>
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
 * One class, as a container holding that class's projects.
 *
 * Wears the same kit a teacher's course card wears — brand wash, accent bar on
 * top like a tab on a folder, textured corner — so the two sides of the product
 * read as one system. The header carries the class identity so the cards inside
 * no longer have to, and states the outstanding count: the one number a student
 * scans for when deciding what to open next.
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
    <section
      className={cn(
        "relative overflow-hidden rounded-xl border border-platform-200 shadow-card",
        "bg-gradient-to-br from-platform-50 via-platform-50 to-white",
        "animate-fade-up",
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Texture keyed on the class id, so a student learns a subject by its
          pattern. Height-capped, unlike on a teacher's card: a panel grows with
          every assignment in it, and texture running the full length of a tall
          one shows through the gutters between cards as background noise. Held
          to the header band it stays a flourish on the class identity. */}
      <CardDecor
        pattern={patternFor(classInfo.id)}
        ink="rgb(37 99 235 / 0.16)"
        className="h-44"
      />
      {/* Colour bar. Reads as a tab on a folder — the panel is a container. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-platform-600 to-platform-400"
      />

      <header className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 pb-4 pt-6">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="rounded-full bg-platform-600 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-white shadow-sm">
            {classInfo.code}
          </span>
          <h2 className="text-base font-semibold text-[var(--text-strong)]">
            {classInfo.name}
          </h2>
          <span className="text-xs text-[var(--text-muted)]">{classInfo.term}</span>
        </div>
        <p className="text-xs font-medium text-[var(--text-muted)]">{standing}</p>
      </header>

      <div className="relative space-y-6 px-5 pb-5">
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
    </section>
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
