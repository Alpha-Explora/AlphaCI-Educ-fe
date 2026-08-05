"use client";
// ============================================================================
// VIEW LAYER — Schedule: every section this teacher runs, and when.
//
// The one screen that answers "what am I teaching, and when" without opening a
// course at a time. Before this, a section's meeting window lived only on that
// section's own Settings tab, so a teacher with six sections had six pages to
// visit to see their week — and no way at all to see which one was running now.
//
// PHILIPPINE TIME, SAID ONCE AND PROMINENTLY. Every window on this page is
// Asia/Manila regardless of the teacher's laptop clock. Repeating the timezone on
// every row would be noise; omitting it entirely is how a teacher on a
// mis-set laptop misreads their whole timetable. So it is stated once, at the top,
// where it governs everything below it.
//
// Derivation lives in useTeacherSchedule; this file is layout.
// ============================================================================
import Link from "next/link";
import { useSession } from "@/viewmodels/useSession";
import { useTeacherSchedule, type ScheduleRow } from "@/viewmodels/useTeacherSchedule";
import { OutsideHoursToggle } from "@/components/domain/OutsideHoursToggle";
import {
  Card,
  EmptyState,
  GenericPill,
  SkeletonCard,
  Stat,
  StateBoundary,
  cn,
} from "@/components/ui";

export default function TeacherSchedulePage() {
  const { user, selectedOrgId } = useSession();
  const vm = useTeacherSchedule(user?.id ?? null, selectedOrgId);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-strong)]">Schedule</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
            When each of your sections meets, and whether students can work on its
            projects right now. All times are{" "}
            <span className="font-medium text-[var(--text-strong)]">
              Philippine time
            </span>
            .
          </p>
        </div>

        {!vm.isLoading && !vm.error && vm.totals.sections > 0 && (
          <div className="grid grid-cols-3 gap-6 rounded-xl border border-[var(--border-subtle)] bg-white px-5 py-4 shadow-card">
            <Stat label="Sections" value={vm.totals.sections} tone="platform" />
            <Stat label="Meeting now" value={vm.meetingNow.length} tone="success" />
            <Stat
              label="Open after hours"
              value={vm.totals.outsideHoursOpen}
              tone={vm.totals.outsideHoursOpen > 0 ? "warning" : undefined}
            />
          </div>
        )}
      </header>

      <StateBoundary
        isLoading={vm.isLoading}
        error={vm.error}
        onRetry={vm.refetch}
        isEmpty={vm.rows.length === 0}
        emptyFallback={
          <EmptyState
            icon="🗓️"
            title="No sections yet"
            description="Once you create a class section under one of your courses, its meeting hours appear here."
          />
        }
        loadingFallback={
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        }
      >
        <div className="space-y-8">
          {/* What is happening RIGHT NOW, lifted out of the list. A teacher
              checking this page mid-morning is nearly always asking one
              question, and it should not require reading every group. */}
          {vm.meetingNow.length > 0 && (
            <section className="animate-fade-up rounded-xl border border-success/40 bg-success/5 px-5 py-4 ring-1 ring-success/20">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-strong)]">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-success"
                />
                Meeting now
              </h2>
              <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
                {vm.meetingNow.map((row) => (
                  <li key={row.classInfo.id} className="text-sm">
                    <span className="font-medium text-[var(--text-strong)]">
                      {row.classInfo.code} · {row.classInfo.section}
                    </span>
                    {row.nextChange && (
                      <span className="text-[var(--text-muted)]"> — {row.nextChange}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {vm.groups.map((group) => (
            <section key={group.courseId} className="space-y-4 animate-fade-up">
              <div className="border-b border-[var(--border-subtle)] pb-3">
                <h2 className="text-lg font-semibold text-[var(--text-strong)]">
                  {group.label}
                </h2>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {group.rows.map((row) => (
                  <SectionScheduleCard key={row.classInfo.id} row={row} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </StateBoundary>
    </div>
  );
}

/** Copy and colour for each state — kept in one place so they cannot drift. */
const STATE_LABEL: Record<
  ScheduleRow["state"],
  { text: string; tone: "success" | "warning" | "neutral" | "info" }
> = {
  "in-session": { text: "In session", tone: "success" },
  "outside-hours-open": { text: "Open after hours", tone: "warning" },
  closed: { text: "Closed", tone: "neutral" },
  unscheduled: { text: "No hours set", tone: "info" },
};

function SectionScheduleCard({ row }: { readonly row: ScheduleRow }) {
  const { classInfo, state, window: meetingWindow, nextChange } = row;
  const badge = STATE_LABEL[state];
  const sectionLabel = `${classInfo.code} · ${classInfo.section}`;

  return (
    <Card
      className={cn(
        "p-5",
        state === "in-session" && "border-success/40 ring-1 ring-success/20",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-[var(--text-strong)]">
              {sectionLabel}
            </h3>
            <GenericPill tone={badge.tone}>{badge.text}</GenericPill>
          </div>
          <p className="mt-0.5 truncate text-sm text-[var(--text-muted)]">
            {classInfo.name}
          </p>
        </div>

        {/* Straight to the place the window is edited. The schedule is set on the
            section's own Settings tab and stays there — duplicating the editor
            here would be a second form writing the same field. */}
        <Link
          href={`/teacher/classes/${classInfo.id}`}
          className="shrink-0 text-xs font-medium text-platform underline underline-offset-2 hover:text-platform-700"
        >
          Edit hours
        </Link>
      </div>

      <dl className="mt-4 space-y-2 border-t border-[var(--border-subtle)] pt-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--text-muted)]">Meets</dt>
          <dd className="text-right font-medium text-[var(--text-strong)]">
            {meetingWindow ?? (
              <span className="font-normal text-[var(--text-muted)]">
                Any time — no hours set
              </span>
            )}
          </dd>
        </div>
        {nextChange && (
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--text-muted)]">
              {state === "in-session" ? "Ends" : "Next"}
            </dt>
            <dd className="text-right font-medium text-[var(--text-strong)]">
              {nextChange}
            </dd>
          </div>
        )}
      </dl>

      {/* Only meaningful for a section that HAS hours — there is nothing to
          suspend on a section that is already always open, and offering the
          switch there would imply the opposite. */}
      {state !== "unscheduled" && (
        <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
          <OutsideHoursToggle classId={classInfo.id} sectionLabel={sectionLabel} />
        </div>
      )}
    </Card>
  );
}
