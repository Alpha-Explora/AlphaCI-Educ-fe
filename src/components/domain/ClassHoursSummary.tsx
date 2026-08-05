"use client";
// ============================================================================
// VIEW LAYER — a section's meeting hours, for the teacher who cannot change them.
//
// Replaced ClassScheduleCard on the teacher's Settings tab. The timetable moved
// to the IT admin: a section's window books a PERSON and a ROOM, so it is not
// one teacher's setting, and with teachers editing their own nothing could see
// the whole timetable at the moment of the decision.
//
// A READ-ONLY CARD, not a disabled form. A form whose Save always 403s teaches a
// teacher that the product is broken; a card that states the hours and says who
// owns them teaches them who to ask. The editor still exists — for the admin,
// where conflict checking lives with it.
// ============================================================================
import { Card, GenericPill } from "@/components/ui";
import { DAY_SHORT, WEEK_ORDER, formatTime12, isEnforceable, scheduleBlocks } from "@/models/schedule";
import type { ClassSchedule } from "@/models/types";

export function ClassHoursSummary({
  schedule,
}: {
  readonly schedule: ClassSchedule[] | ClassSchedule | undefined;
}) {
  const scheduled = isEnforceable(schedule);
  // One row per window. A section meeting Mon 8–10 and Wed 1–3 has no single
  // "Days" and "Time" to state, and collapsing it to one row would have to drop
  // one of the two meetings — the teacher would plan around a class that is not
  // when the card says it is.
  const blocks = scheduleBlocks(schedule);

  return (
    <Card className="p-5 animate-fade-up sm:max-w-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-strong)]">Class hours</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            When this section meets, in{" "}
            <span className="font-medium text-[var(--text-strong)]">Philippine time</span>.
            Students can read their work at any hour; they can only{" "}
            <span className="font-medium text-[var(--text-strong)]">work on</span> projects
            during these hours, unless you switch on outside-hours above.
          </p>
        </div>
        <GenericPill tone={scheduled ? "info" : "neutral"}>
          {scheduled ? "Scheduled" : "No hours set"}
        </GenericPill>
      </div>

      <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
        {scheduled ? (
          <dl className="space-y-2 text-sm">
            {blocks.map((block) => (
              <div
                key={`${block.days.join()}-${block.startTime}`}
                className="flex justify-between gap-4"
              >
                <dt className="text-[var(--text-muted)]">
                  {WEEK_ORDER.filter((d) => block.days.includes(d))
                    .map((d) => DAY_SHORT[d])
                    .join(", ")}
                </dt>
                <dd className="font-medium tabular-nums text-[var(--text-strong)]">
                  {formatTime12(block.startTime)} – {formatTime12(block.endTime)}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            This section has no hours yet, so students can work on its projects at any
            time once you start the class.
          </p>
        )}

        {/* Who to ask. The one thing a read-only card owes the reader. */}
        <p className="mt-4 text-xs text-[var(--text-muted)]">
          Class hours are set by your IT admin, who checks them against the rest of the
          timetable so two sections never share a teacher or a laboratory. Ask them to
          change these.
        </p>
      </div>
    </Card>
  );
}
