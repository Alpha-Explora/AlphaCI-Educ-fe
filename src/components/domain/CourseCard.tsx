// ============================================================================
// VIEW LAYER — one course on the teacher's dashboard.
//
// Courses are the school's structure, so they all wear the SCHOOL's colour: a
// light wash of the brand tint rather than eight competing hues. What varies
// per card is the texture (see CardDecor) — enough to tell two cards apart
// from across the screen, not enough to imply the courses differ in kind.
// Classes are the opposite case: they are the teacher's own working set, so
// they get a colour each — see ClassCard.
//
// Every string on the wash is `--text-strong` or `--text-muted`, both of which
// clear WCAG AA on this tint; nothing here is drawn in the tint's own hue,
// which is how a coloured card ends up with text that fades into it.
// ============================================================================
import Link from "next/link";
import { CardDecor, GenericPill, Stat, cn, patternFor } from "@/components/ui";
import type { CourseBoardEntry } from "@/viewmodels/useTeacherCourseBoard";

export function CourseCard({
  entry,
  index = 0,
}: Readonly<{
  entry: CourseBoardEntry;
  /** Position in the grid — used only for the entrance stagger. */
  index?: number;
}>) {
  const { course, classes, studentCount, pendingGrading } = entry;

  // Sections counted above that belong to another lab's copy of this course.
  const shared = classes.filter((c) => c.sharedFromLabName);
  const sharedLabs = [...new Set(shared.map((c) => c.sharedFromLabName as string))];

  return (
    <Link
      href={`/teacher/courses/${course.id}`}
      className="group rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform"
    >
      <article
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-xl border border-platform-200",
          "bg-gradient-to-br from-platform-50 via-platform-50 to-white p-5 pt-6 shadow-card",
          "transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-platform-300 group-hover:shadow-card-hover",
          "animate-fade-up",
        )}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <CardDecor pattern={patternFor(course.code)} ink="rgb(37 99 235 / 0.16)" />
        {/* Colour bar. Reads as a tab on a folder — the card is a container. */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-platform-600 to-platform-400"
        />

        <div className="relative flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-platform-600 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-white shadow-sm">
            {course.code}
          </span>
          {pendingGrading > 0 && (
            <GenericPill tone="warning">{pendingGrading} to grade</GenericPill>
          )}
        </div>

        <h2 className="relative mt-2 text-base font-semibold text-[var(--text-strong)]">
          {course.title}
        </h2>
        {course.description && (
          <p className="relative mt-1 line-clamp-2 text-sm text-[var(--text-muted)]">
            {course.description}
          </p>
        )}

        <div className="relative mt-auto flex gap-6 pt-5">
          <Stat label="Classes" value={classes.length} tone="platform" />
          <Stat label="Students" value={studentCount} />
        </div>

        {sharedLabs.length > 0 && (
          <p className="relative mt-2 text-xs text-[var(--text-muted)]">
            Includes {shared.length} {shared.length === 1 ? "section" : "sections"} from{" "}
            {sharedLabs.join(", ")}
          </p>
        )}

        <span className="relative mt-4 inline-flex items-center gap-1 text-sm font-medium text-platform-700">
          {classes.length === 0 ? "Create first class" : "Open course"}
          <span
            aria-hidden="true"
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          >
            →
          </span>
        </span>
      </article>
    </Link>
  );
}
