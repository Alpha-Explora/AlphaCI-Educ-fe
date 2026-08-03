// ============================================================================
// VIEW LAYER — one project on the student's side.
//
// Lifted out of the student's landing page when that became a list of COURSES. The
// projects now live one level down, on /student/classes/[id], and this is the
// card that page is built from — so it had to stop being a private function in a
// page file.
// ============================================================================
import Link from "next/link";
import type { StudentDashboard } from "@/models/types";
import { GenericPill, PipelineStatusPill, RepoStatusPill, cn } from "@/components/ui";
import { relativeDue } from "@/components/ui/format";

type Row = StudentDashboard["assignments"][number];

/**
 * Ink for a CI score, on the SEMANTIC scale — never a decorative colour.
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
 * cannot itself be a link — a second target inside an <a> is invalid HTML and
 * unreachable by keyboard. The card is a plain <article> and each row here is the
 * anchor.
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
        <span className={cn("text-sm font-semibold tabular-nums", scoreTone(latestRun?.score))}>
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
 * ONE CARD PER PROJECT, however many repositories it has.
 *
 * A SPLIT project is one piece of homework with one title and one deadline;
 * listing its halves as two cards would turn a class of five projects into ten,
 * and imply two due dates where the teacher set one.
 */
export function StudentAssignmentCard({
  row,
  index = 0,
}: {
  readonly row: Row;
  readonly index?: number;
}) {
  const { assignment, repos } = row;

  return (
    <article
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-xl border border-platform-200 bg-white p-5 shadow-card",
        "animate-fade-up",
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Brand hairline down the left edge. The only colour the card borrows —
          the scores inside stay on the semantic scale, because the brand hue must
          never be what tells a student whether their build passed. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-platform-600 to-platform-400"
      />

      <div className="flex items-start justify-between gap-2">
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
          sit beside the single repo's score; on a SPLIT card that position made it
          look like the deadline of whichever half it landed next to. */}
      <p className="mt-auto pt-4 text-xs text-[var(--text-muted)]">
        {assignment.dueDate ? relativeDue(assignment.dueDate) : "No due date"}
      </p>
    </article>
  );
}
