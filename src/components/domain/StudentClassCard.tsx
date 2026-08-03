// ============================================================================
// VIEW LAYER — one enrolled class, on the student's Courses page.
//
// WHY THE HUB IS A LIST OF CLASSES AND NOT A LIST OF PROJECTS
//
// It used to render every class as a panel with all of that class's project cards
// laid out inside it. With one class and two projects that reads fine. With the
// five or six classes a real student carries it is a single page holding twenty
// or more cards — and none of them is the one they came for, because the hub had
// no way to say "start here". The page got longer with every project a teacher
// published, which is the wrong direction for a page whose job is orientation.
//
// So the hub answers one question — "which class?" — and the projects live one
// level down at /student/classes/[id]. Same two-level shape the teacher side has
// (My Courses -> a course -> its classes), which is deliberate: a student and a
// teacher talking about "the AT1234 page" should mean the same kind of thing.
//
// The card carries the numbers that decide which class to open, and nothing else.
// Everything on it comes from data the hub already holds, so a class costs no
// extra request to summarise.
// ============================================================================
import Link from "next/link";
import { CardDecor, GenericPill, cn, patternFor } from "@/components/ui";
import { manilaMoment } from "@/models/manila";
import type { ClassSection } from "@/viewmodels/useStudentDashboard";

export function StudentClassCard({
  section,
  index = 0,
}: {
  readonly section: ClassSection;
  /** Position in the grid — used only for the entrance stagger. */
  readonly index?: number;
}) {
  const { classInfo, access, active, past, total } = section;

  // Closed only when the SERVER says so — never derived from the browser clock.
  const locked = access ? !access.inSession : false;

  return (
    <Link
      href={`/student/classes/${classInfo.id}`}
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
        {/* Texture keyed on the class id, so a student learns a subject by its
            pattern as much as by its code. */}
        <CardDecor pattern={patternFor(classInfo.id)} ink="rgb(37 99 235 / 0.16)" />
        {/* Colour bar — reads as the tab on a folder. */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-platform-600 to-platform-400"
        />

        <div className="relative flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-platform-600 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-white shadow-sm">
            {classInfo.code}
          </span>
          {active.length > 0 && (
            <GenericPill tone="warning">{active.length} to do</GenericPill>
          )}
          {locked && <GenericPill>🔒 Closed</GenericPill>}
        </div>

        <h2 className="relative mt-2 text-base font-semibold text-[var(--text-strong)]">
          {classInfo.name}
        </h2>
        <p className="relative mt-0.5 text-xs text-[var(--text-muted)]">{classInfo.term}</p>

        {/* The two numbers that decide which class to open. Not a stat block per
            repository — a student picking a class does not care how many git
            repositories are behind it. */}
        <div className="relative mt-auto flex gap-6 pt-5">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
              To do
            </p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums text-platform-700">
              {active.length}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
              Done
            </p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums text-[var(--text-strong)]">
              {past.length}
            </p>
          </div>
        </div>

        {/* Class hours, on the card rather than one level in. A student who cannot
            work right now should learn that BEFORE opening the class and finding
            every action refused. */}
        {locked && access?.opensAt && (
          <p className="relative mt-3 text-xs text-[var(--text-muted)]">
            Opens {manilaMoment(access.opensAt)}
          </p>
        )}

        <span className="relative mt-4 inline-flex items-center gap-1 text-sm font-medium text-platform-700">
          {total === 0 ? "No projects yet" : "Open class"}
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
