"use client";
// ============================================================================
// VIEW LAYER — IT Admin student monitor
//
// Who is actually in this laboratory, identified by the email address the
// school issued them. Replaces the old licence-savings framing on /admin: a
// student account is now something you supervise, not something you count for
// billing.
//
// Presentation only — presence classification, the counts, and the search all
// come from useStudentMonitor.
// ============================================================================
import {
  Avatar,
  Card,
  EmptyState,
  Input,
  PresencePill,
  Skeleton,
  StateBoundary,
  cn,
} from "@/components/ui";
import { formatDateTime } from "@/components/ui/format";
import type {
  StudentMonitorRow,
  StudentMonitorVM,
} from "@/viewmodels/useStudentMonitor";

/** One-line summary of when this account was last used. */
function activityLine(student: StudentMonitorRow): string {
  if (student.presence === "NEVER") return "Account issued, never used";
  if (student.presence === "ONLINE") return "Active now";
  if (student.lastSeenAt) return `Last active ${formatDateTime(student.lastSeenAt)}`;
  return `Last signed in ${formatDateTime(student.lastSignInAt)}`;
}

function CountTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "online" | "muted";
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          tone === "online" && "text-emerald-600",
          tone === "muted" && "text-[var(--text-muted)]",
          tone === "default" && "text-[var(--text-strong)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function StudentAccountMonitor({ vm }: { vm: StudentMonitorVM }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-strong)]">
            Student accounts
          </h2>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            Every student in this laboratory, by the email address they sign in
            with. Presence refreshes automatically while this page is open.
          </p>
        </div>
        {vm.isRefreshing && (
          <span className="text-xs text-[var(--text-muted)]" role="status">
            Refreshing…
          </span>
        )}
      </div>

      <StateBoundary
        isLoading={vm.isLoading}
        error={vm.error}
        onRetry={vm.refetch}
        loadingFallback={
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        }
      >
        <Card className="overflow-hidden animate-fade-up">
          <div className="grid grid-cols-3 gap-5 border-b border-[var(--border-subtle)] p-6">
            <CountTile label="Students" value={vm.totalCount} />
            <CountTile label="Online now" value={vm.onlineCount} tone="online" />
            <CountTile
              label="Never signed in"
              value={vm.neverSignedInCount}
              tone="muted"
            />
          </div>

          {vm.totalCount === 0 ? (
            <EmptyState
              className="m-6"
              icon="🎒"
              title="No student accounts yet"
              description="Students appear here once a teacher enrolls them into a class in this laboratory."
            />
          ) : (
            <>
              <div className="border-b border-[var(--border-subtle)] px-5 py-3">
                <label htmlFor="student-search" className="sr-only">
                  Search students by email or name
                </label>
                <Input
                  id="student-search"
                  type="search"
                  value={vm.query}
                  onChange={(event) => vm.setQuery(event.target.value)}
                  placeholder="Search by email or name…"
                  className="sm:max-w-sm"
                />
              </div>

              {vm.isFilteredEmpty ? (
                <EmptyState
                  className="m-6"
                  icon="🔍"
                  title="No matching students"
                  description={`Nothing in this laboratory matches “${vm.query.trim()}”.`}
                />
              ) : (
                <ul className="divide-y divide-[var(--border-subtle)]">
                  {vm.students.map((student) => (
                    <li
                      key={student.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar
                          name={student.fullName}
                          color={student.avatarColor}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[var(--text-strong)]">
                            {student.fullName}
                          </p>
                          {/* The email is the identifier the admin monitors by,
                              so it is never truncated away on wide screens. */}
                          <p className="truncate font-mono text-xs text-[var(--text-muted)]">
                            {student.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                        <span className="hidden sm:inline">
                          {student.classNames.length > 0
                            ? student.classNames.join(", ")
                            : "No class yet"}
                        </span>
                        <span className="hidden md:inline">
                          {student.activeProjects} active{" "}
                          {student.activeProjects === 1 ? "project" : "projects"}
                        </span>
                        <span className="whitespace-nowrap">
                          {activityLine(student)}
                        </span>
                        <PresencePill presence={student.presence} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Card>
      </StateBoundary>
    </section>
  );
}
