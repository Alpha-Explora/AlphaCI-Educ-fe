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
import { CLASS_STATE_COPY } from "@/viewmodels/useClassCode";
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

  /*
    CLOSED ONLY WHEN THE SERVER SAYS SO — never derived from the browser clock.

    `state` is the whole answer ("can this student work on this class right now"),
    computed by the same code AccessPolicy consults when it refuses, so this card
    can never promise something the API will then deny. A class the server sent no
    state for is treated as open, matching the fallback for having no schedule.
  */
  const state = access?.state ?? "open";
  const copy = CLASS_STATE_COPY[state];
  const locked = state !== "open";

  const href = `/student/classes/${classInfo.id}`;

  const card = (
    <article
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-xl border p-5 pt-6 shadow-card",
        "animate-fade-up transition-all duration-200",
        locked
          ? // GREYED, AND MEANT TO LOOK IT. A closed class is background
            // information — desaturating the whole surface is what makes the one
            // class a student can actually work on findable in a grid of six
            // without reading a single word.
            "border-slate-200 bg-slate-50"
          : "border-platform-200 bg-gradient-to-br from-platform-50 via-platform-50 to-white " +
            "group-hover:-translate-y-0.5 group-hover:border-platform-300 group-hover:shadow-card-hover",
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Texture keyed on the class id, so a student learns a subject by its
          pattern as much as by its code. Grey when closed — a blue wash on an
          otherwise grey card reads as a rendering fault rather than a state. */}
      <CardDecor
        pattern={patternFor(classInfo.id)}
        ink={locked ? "rgb(100 116 139 / 0.12)" : "rgb(37 99 235 / 0.16)"}
      />
      {/* Colour bar — reads as the tab on a folder. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 top-0 h-1",
          locked
            ? "bg-slate-300"
            : "bg-gradient-to-r from-platform-600 to-platform-400",
        )}
      />

      {/* Course code left, STATUS RIGHT. The status is the thing being scanned
          for down a column of cards, so it gets the edge the eye returns to and
          a size that survives being read at arm's length. */}
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide text-white shadow-sm",
              locked ? "bg-slate-400" : "bg-platform-600",
            )}
          >
            {classInfo.code}
          </span>
          {active.length > 0 && !locked && (
            <GenericPill tone="warning">{active.length} to do</GenericPill>
          )}
        </div>

        {/* The state, not just "closed". Each of the four has a different thing
            the student should do next, and a lock icon says none of them. */}
        {locked && (
          <GenericPill tone={copy.tone} size="md" dot>
            {copy.label}
          </GenericPill>
        )}
      </div>

      <h2
        className={cn(
          "relative mt-2 text-base font-semibold",
          locked ? "text-slate-600" : "text-[var(--text-strong)]",
        )}
      >
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
          <p
            className={cn(
              "mt-0.5 text-2xl font-semibold tabular-nums",
              locked ? "text-slate-400" : "text-platform-700",
            )}
          >
            {active.length}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Done
          </p>
          <p
            className={cn(
              "mt-0.5 text-2xl font-semibold tabular-nums",
              locked ? "text-slate-400" : "text-[var(--text-strong)]",
            )}
          >
            {past.length}
          </p>
        </div>
      </div>

      {/* WHY it is closed, on the card rather than one level in. A student who
          cannot work right now should learn that — and what to do about it —
          BEFORE opening the class and finding every action refused. */}
      {locked && (
        <p className="relative mt-3 text-xs text-[var(--text-muted)]">
          {copy.hint}
          {state === "outside-hours" && access?.opensAt
            ? ` Opens ${manilaMoment(access.opensAt)}.`
            : ""}
        </p>
      )}

      {/* No arrow when closed: an arrow is a promise that something happens when
          you click, and nothing does. */}
      {!locked && (
        <span className="relative mt-4 inline-flex items-center gap-1 text-sm font-medium text-platform-700">
          {total === 0 ? "No projects yet" : "Open class"}
          <span
            aria-hidden="true"
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          >
            →
          </span>
        </span>
      )}
    </article>
  );

  /*
    A CLOSED CARD IS NOT A LINK AT ALL.

    Not a link with pointer-events disabled, and not a link that navigates to a
    page that then refuses everything: a closed class has nothing to open, so the
    honest markup is not an anchor. Dropping the <Link> also takes it out of the
    tab order and off the screen-reader's list of links, which a CSS-only
    treatment would leave behind — a keyboard user would still land on it and a
    screen reader would still announce a destination.

    `cursor-not-allowed` is the browser's own "you cannot do this" cursor (the
    circle-slash); there is no standard X-shaped cursor to ask for.
  */
  if (locked) {
    return (
      <div aria-disabled="true" className="cursor-not-allowed rounded-xl">
        {card}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="group rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform"
    >
      {card}
    </Link>
  );
}
