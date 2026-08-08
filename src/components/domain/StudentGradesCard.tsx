// VIEW LAYER — student's private grades & feedback area.
import type { Assignment, AssignmentRepository } from "@/models/types";
import { EmptyState, PanelSurface, Stat } from "@/components/ui";
import { formatDateTime } from "@/components/ui/format";
import { pointsPerRepo } from "@/models/points";

export function StudentGradesCard({
  repo,
  assignment,
  surface,
}: {
  repo: AssignmentRepository;
  assignment: Assignment;
  /** False when the page already supplies the card — see PanelSurface. */
  surface?: boolean;
}) {
  // Two different situations that used to look identical to a student.
  //
  // The backend redacts `grade` for students until the teacher publishes marks
  // for the assignment, so a withheld grade and an ungraded repository both
  // arrive here as `null`. Showing "not graded yet" for both is misleading:
  // in the first case the work HAS been assessed and the student is waiting on
  // a release, which is worth saying plainly rather than leaving them to wonder
  // whether their submission registered at all.
  if (!assignment.gradesReleasedAt) {
    return (
      <EmptyState
        icon="🔒"
        title="Marks not published yet"
        description="Your teacher publishes marks for the whole class once they have reviewed the runs. Your pipeline results are available now under Results — they show what passed and what to fix."
      />
    );
  }

  if (repo.status !== "GRADED" || repo.grade === null) {
    return (
      <EmptyState
        icon="⏳"
        title="Not graded yet"
        description="Marks are published for this assignment, but this submission has not been graded. If you have submitted, check with your teacher."
      />
    );
  }

  // Out of what THIS REPOSITORY is worth. On a SPLIT project each half carries
  // half the marks, so dividing by the project's total showed a student full
  // marks as 50% and told them they had failed work they had actually aced.
  const outOf = pointsPerRepo(assignment);
  const pct = Math.round((repo.grade / outOf) * 100);
  const isHalf = outOf !== assignment.points;

  return (
    <PanelSurface surface={surface}>
      <div className="flex items-center gap-8">
        <Stat
          label={isHalf ? "This half" : "Your grade"}
          value={`${repo.grade}/${outOf}`}
          tone="success"
        />
        <Stat label="Percentage" value={`${pct}%`} tone="platform" />
        <Stat label="Graded" value={formatDateTime(repo.gradedAt)} />
      </div>

      {/* Said explicitly, because a student looking at "42/50" on a project the
          brief called 100 points would otherwise reasonably think something had
          gone wrong. */}
      {isHalf && (
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          This is one half of a {assignment.points}-point project — the backend and
          frontend are marked separately and are worth {outOf} each.
        </p>
      )}
      {repo.teacherFeedback && (
        <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Teacher feedback
          </p>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-strong)]">
            {repo.teacherFeedback}
          </p>
        </div>
      )}
    </PanelSurface>
  );
}
