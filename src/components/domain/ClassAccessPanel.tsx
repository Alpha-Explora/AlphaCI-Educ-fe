"use client";
// ============================================================================
// VIEW LAYER — starting and ending THIS section, on its own Settings tab.
//
// The teacher's Home card is the fast path: it detects the section meeting now
// and offers one button. This is the deliberate path — any section, any time,
// with the section in question being the page you are standing on rather than a
// choice in a dropdown. It is what a make-up class, a room swap or an evening of
// take-home work goes through.
//
// Both read the same useClassAccess, so neither can show a code the other would
// contradict. Nothing is duplicated but the layout.
// ============================================================================
import { useClassAccess } from "@/viewmodels/useClassAccess";
import { Banner, Button, Card, GenericPill, Spinner, cn } from "@/components/ui";
import { JoinCodeDisplay } from "./JoinCodeDisplay";
import { OutsideHoursToggle } from "./OutsideHoursToggle";

export function ClassAccessPanel({
  classId,
  sectionLabel,
  hasSchedule,
}: {
  readonly classId: string | null;
  /** "AT-1234 · A" — named so the buttons say what they will act on. */
  readonly sectionLabel: string;
  /** Whether a timetable is set; decides if outside-hours is meaningful. */
  readonly hasSchedule: boolean;
}) {
  const access = useClassAccess(classId);

  return (
    <Card
      className={cn(
        // No max-width of its own: the Settings tab lays this out in a grid
        // whose column already bounds it, and a second cap inside meant the card
        // stopped short of its own cell on a wide screen.
        "p-5 animate-fade-up",
        access.isOpen && "border-emerald-300 ring-1 ring-emerald-100",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-strong)]">
            <span
              aria-hidden="true"
              className={cn(
                "inline-block h-2.5 w-2.5 rounded-full",
                access.isOpen ? "animate-pulse bg-success" : "bg-slate-300",
              )}
            />
            <span>Class access</span>
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Students can sign in and read their work at any time. They cannot{" "}
            <span className="font-medium text-[var(--text-strong)]">work on</span>{" "}
            this section&apos;s projects until you start the class and they type
            the code.
          </p>
        </div>
        <GenericPill tone={access.isOpen ? "success" : "neutral"} size="md" dot>
          {access.isOpen ? "Open" : "Closed"}
        </GenericPill>
      </div>

      {access.error && (
        <Banner tone="error" className="mt-4" title="Could not load the class code">
          {access.error.message}
        </Banner>
      )}
      {access.actionError && (
        <Banner tone="error" className="mt-4">
          {access.actionError.message}
        </Banner>
      )}

      {access.isLoading ? (
        <div className="mt-4 flex items-center gap-3 text-sm text-[var(--text-muted)]">
          <Spinner size="sm" /> Checking…
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {!access.isOpen && (
            <Button onClick={access.open} loading={access.isOpening}>
              Start {sectionLabel}
            </Button>
          )}

          {access.isOpen && access.code && (
            <>
              <JoinCodeDisplay code={access.code} label="Class access code" />

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
                <p className="text-sm text-[var(--text-muted)]">
                  <span className="font-semibold text-[var(--text-strong)]">
                    {access.admittedCount}
                  </span>{" "}
                  {access.admittedCount === 1 ? "student has" : "students have"}{" "}
                  joined
                </p>
                <div className="flex flex-wrap gap-2">
                  {/* Rotate before End, and quieter: it is the recoverable one. */}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={access.rotate}
                    loading={access.isRotating}
                  >
                    New code
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={access.end}
                    loading={access.isEnding}
                  >
                    End class
                  </Button>
                </div>
              </div>

              <p className="text-xs text-[var(--text-muted)]">
                <span className="font-medium">New code</span> stops the current one
                working without disturbing students already working — use it if the
                code has spread outside the room.{" "}
                <span className="font-medium">End class</span> signs everyone out
                {access.outsideHoursAllowed
                  ? " and turns off outside-hours access."
                  : "."}
              </p>
            </>
          )}

          {/* Only meaningful for a section that HAS hours: there is nothing to
              suspend on one that is already always open, and offering the switch
              there would imply the opposite. */}
          {hasSchedule && classId && (
            <div className="border-t border-[var(--border-subtle)] pt-4">
              {/* showCode={false}: this card already shows the access code at
                  full size above, from the same useClassAccess. The toggle's own
                  chip made the one code appear twice in a single card, which
                  reads as two codes until you compare them character by
                  character — and if the pair ever disagreed, it would be because
                  of a render bug, not because the teacher has a choice. */}
              <OutsideHoursToggle
                classId={classId}
                sectionLabel={sectionLabel}
                showCode={false}
              />
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Lets students work on this section at any hour, not only during
                its class hours. They still need the code above — switching this
                on starts the class so there is one to give them.
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
