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
import { manilaMoment } from "@/models/manila";

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

/** What a student calls each half of a SPLIT project. */
const COMPONENT_LABEL: Record<string, string> = {
  BACKEND: "Backend",
  FRONTEND: "Frontend",
};

/**
 * One openable repository, inside a project card.
 *
 * ITS OWN LINK, and that is the structural point of this whole card. A SPLIT
 * project has two repositories and each needs its own destination, so the card
 * can no longer BE a link the way it used to — a second target inside an <a> is
 * invalid HTML and unreachable by keyboard. The card is a plain <article> now
 * and each row here is the anchor.
 *
 * Every row carries its own status and score rather than rolling the two halves
 * into one figure. A backend at 92% next to an untouched frontend does not
 * average to anything a student can act on; what they need to know is which half
 * to open.
 */
function RepoRow({ entry }: { readonly entry: Row["repos"][number] }) {
  const { repo, latestRun } = entry;
  const label = COMPONENT_LABEL[repo.component ?? "SINGLE"];

  return (
    <Link
      href={`/student/repositories/${repo.id}`}
      className="group/row block rounded-lg border border-[var(--border-subtle)] bg-slate-50/70 p-3 transition-colors hover:border-platform-300 hover:bg-platform-50/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform"
    >
      <div className="flex items-center justify-between gap-2">
        {/* Only a SPLIT half is named. A SINGLE repo would be labelled "Single",
            which is a word about the data model, not about the student's work. */}
        {label ? (
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            {label}
          </span>
        ) : (
          <span className="text-xs font-medium text-[var(--text-muted)]">Workspace</span>
        )}
        <span
          className={cn("text-sm font-semibold tabular-nums", scoreTone(latestRun?.score))}
        >
          {latestRun?.score != null ? `${latestRun.score}%` : "—"}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <RepoStatusPill status={repo.status} />
        {latestRun && <PipelineStatusPill status={latestRun.status} />}
      </div>

      <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-platform-700">
        <span>Open</span>
        <span
          aria-hidden="true"
          className="transition-transform duration-200 group-hover/row:translate-x-0.5"
        >
          →
        </span>
      </span>
    </Link>
  );
}

/**
 * One project, as an inner container.
 *
 * Drawn on white with a brand hairline down its left edge. That edge is the only
 * colour it borrows from the panel: the scores inside stay on the SEMANTIC scale
 * (green pass / amber fail), because the brand hue must never be what tells a
 * student whether their build passed.
 *
 * ONE CARD PER PROJECT, however many repositories it has. A SPLIT project is one
 * piece of homework with one title and one deadline; listing its halves as two
 * cards would turn a class of five projects into ten, and imply two due dates
 * where the teacher set one.
 */
function AssignmentCard({ row, index }: { readonly row: Row; readonly index: number }) {
  const { assignment, repos } = row;

  return (
    <article
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-xl border border-platform-200 bg-white p-5 shadow-card",
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

      {repos.length === 0 ? (
        <div className="mt-4">
          <GenericPill>Not started</GenericPill>
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {repos.map((entry) => (
            <RepoRow key={entry.repo.id} entry={entry} />
          ))}
        </div>
      )}

      {/* ONE deadline for the project, at the foot, below every half. It used to
          sit beside the single repo's score; on a SPLIT card that position would
          make it look like the deadline of whichever half it landed next to. */}
      <p className="mt-auto pt-4 text-xs text-[var(--text-muted)]">
        {assignment.dueDate ? relativeDue(assignment.dueDate) : "No due date"}
      </p>
    </article>
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
  const { classInfo, access, active, past, total } = section;

  // Closed only when the server says so. Never derived from the browser's clock —
  // a lab PC with a wrong date would otherwise unlock a class the API refuses.
  const locked = access ? !access.inSession : false;

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
          {locked && <GenericPill tone="warning">🔒 Outside class hours</GenericPill>}
        </div>
        <p className="text-xs font-medium text-[var(--text-muted)]">{standing}</p>
      </header>

      {/* WHY THE PROJECTS STILL RENDER BELOW THIS. A closed class could have been
          hidden outright, which enforces harder — and tells a student checking
          their work at home nothing at all. They cannot distinguish "it is
          Tuesday" from "I was unenrolled" or "my teacher deleted it", so the
          panel stays and says which it is. Reading the brief and last week's
          results was never the thing worth restricting; starting work is, and
          that is refused by the server. */}
      {locked && access && (
        <div className="relative mx-5 mb-1 rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">
            This class is closed right now.
          </p>
          <p className="mt-0.5 text-sm text-amber-800">
            {access.window ?? "Outside scheduled hours"}
            {access.opensAt && <> · Opens {manilaMoment(access.opensAt)}</>}
          </p>
          <p className="mt-1 text-xs text-amber-700">
            You can still read your projects and past results. Starting work,
            getting a token and submitting resume when the class opens.
          </p>
        </div>
      )}

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
