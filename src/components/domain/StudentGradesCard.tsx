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
  if (repo.status !== "GRADED" || repo.grade === null) {
    return (
      <EmptyState
        icon="⏳"
        title="Not graded yet"
        description="Your grade and your teacher's feedback will appear here once grading is complete."
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
