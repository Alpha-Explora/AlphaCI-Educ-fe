// VIEW LAYER — student's private grades & feedback area.
import type { Assignment, AssignmentRepository } from "@/models/types";
import { Card, EmptyState, Stat } from "@/components/ui";
import { formatDateTime } from "@/components/ui/format";

export function StudentGradesCard({
  repo,
  assignment,
}: {
  repo: AssignmentRepository;
  assignment: Assignment;
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
        description="Marks are published for this assignment, but this repository has not been graded. If you have submitted, check with your teacher."
      />
    );
  }

  const pct = Math.round((repo.grade / assignment.points) * 100);
  return (
    <Card className="p-5">
      <div className="flex items-center gap-8">
        <Stat
          label="Your grade"
          value={`${repo.grade}/${assignment.points}`}
          tone="success"
        />
        <Stat label="Percentage" value={`${pct}%`} tone="platform" />
        <Stat label="Graded" value={formatDateTime(repo.gradedAt)} />
      </div>
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
    </Card>
  );
}
