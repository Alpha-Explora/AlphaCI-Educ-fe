"use client";
// ============================================================================
// VIEW LAYER — Platform operator console (/super)
//
// The vendor's view of every customer at once: which labs are healthy, which
// have failing pipelines or plagiarism flags, and who is signed in right now
// across the whole platform.
//
// Pure presentation. Every number, filter, ordering and verdict on this page is
// produced by useSuperAdminConsole; this file contains no fetching and no
// business rules.
// ============================================================================
import {
  Avatar,
  Banner,
  Card,
  EmptyState,
  Input,
  PresencePill,
  Select,
  Skeleton,
  StateBoundary,
  cn,
} from "@/components/ui";
import { formatDateTime } from "@/components/ui/format";
import { PlatformLabTable } from "@/components/domain/PlatformLabTable";
import {
  useSuperAdminConsole,
  type RoleFilter,
} from "@/viewmodels/useSuperAdminConsole";
import { useAddLabAdmin } from "@/viewmodels/useAddLabAdmin";
import { AddLabAdminModal } from "@/components/domain/AddLabAdminModal";
import { Button } from "@/components/ui";
import { useEffect, useState } from "react";

const ROLE_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: "ALL", label: "All roles" },
  { value: "STUDENT", label: "Students" },
  { value: "TEACHER", label: "Teachers" },
  { value: "ADMIN", label: "IT Admins" },
  { value: "SUPER_ADMIN", label: "Platform operators" },
];

const ROLE_LABEL: Record<string, string> = {
  STUDENT: "Student",
  TEACHER: "Teacher",
  ADMIN: "IT Admin",
  SUPER_ADMIN: "Operator",
};

function HeadlineTile({
  label,
  value,
  tone = "default",
}: {
  readonly label: string;
  readonly value: number | string;
  readonly tone?: "default" | "online" | "alarm" | "muted";
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
          tone === "alarm" && "text-danger",
          tone === "muted" && "text-[var(--text-muted)]",
          tone === "default" && "text-[var(--text-strong)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default function SuperAdminConsolePage() {
  const vm = useSuperAdminConsole();
  const addAdminVm = useAddLabAdmin();
  const [addAdminOpen, setAddAdminOpen] = useState(false);

  // Close the dialog once the appointment lands. Deliberately does NOT reset the
  // VM: the outcome banner lives on the page behind the dialog, and resetting
  // would clear it — which matters most when the invite only partly succeeded.
  useEffect(() => {
    if (addAdminVm.outcome) setAddAdminOpen(false);
  }, [addAdminVm.outcome]);

  function closeAddAdmin() {
    setAddAdminOpen(false);
    addAdminVm.reset();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3 animate-fade-up">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-strong)]">
            Platform console
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Every laboratory, every account, and every failing pipeline across
            all customers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {vm.generatedAt && (
            <span className="text-xs text-[var(--text-muted)]" role="status">
              {vm.isRefreshing ? "Refreshing…" : `Updated ${formatDateTime(vm.generatedAt)}`}
            </span>
          )}
          <Button onClick={() => setAddAdminOpen(true)} disabled={vm.labs.length === 0}>
            + Appoint IT admin
          </Button>
        </div>
      </div>

      {addAdminVm.outcome && (
        <Banner tone={addAdminVm.outcome.tone} title={addAdminVm.outcome.title}>
          {addAdminVm.outcome.detail}
        </Banner>
      )}

      {vm.openLabError && <Banner tone="error" title="Couldn't open laboratory">{vm.openLabError}</Banner>}

      <StateBoundary
        isLoading={vm.isLoading}
        error={vm.error}
        onRetry={vm.refetch}
        loadingFallback={
          <div className="space-y-6">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        }
      >
        {vm.totals && (
          <>
            <Card className="animate-fade-up">
              <div className="grid grid-cols-2 gap-5 p-6 sm:grid-cols-4 lg:grid-cols-7">
                <HeadlineTile label="Laboratories" value={vm.totals.labs} />
                <HeadlineTile label="Online now" value={vm.onlineNow} tone="online" />
                <HeadlineTile label="Students" value={vm.totals.students} />
                <HeadlineTile label="Teachers" value={vm.totals.teachers} />
                <HeadlineTile label="IT Admins" value={vm.totals.admins} />
                <HeadlineTile
                  label="Failed runs"
                  value={vm.totals.failedRuns}
                  tone={vm.totals.failedRuns > 0 ? "alarm" : "default"}
                />
                <HeadlineTile
                  label="Needs attention"
                  value={vm.labsNeedingAttention}
                  tone={vm.labsNeedingAttention > 0 ? "alarm" : "default"}
                />
              </div>
            </Card>

            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-strong)]">
                  Laboratories
                </h2>
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                  Labs needing attention are listed first. Opening one switches
                  your active laboratory and takes you to its admin surface.
                </p>
              </div>
              <PlatformLabTable
                labs={vm.labs}
                onOpenLab={vm.openLab}
                openingLabId={vm.openingLabId}
              />
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-strong)]">
                  People
                </h2>
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                  Every account on the platform, by the email address they sign
                  in with. {vm.neverSignedIn} have never signed in.
                </p>
              </div>

              <Card className="overflow-hidden animate-fade-up">
                <div className="flex flex-wrap gap-3 border-b border-[var(--border-subtle)] px-5 py-3">
                  <label htmlFor="people-search" className="sr-only">
                    Search people by email, name or laboratory
                  </label>
                  <Input
                    id="people-search"
                    type="search"
                    value={vm.query}
                    onChange={(event) => vm.setQuery(event.target.value)}
                    placeholder="Search by email, name or laboratory…"
                    className="sm:max-w-sm"
                  />
                  <label htmlFor="people-role" className="sr-only">
                    Filter by role
                  </label>
                  <Select
                    id="people-role"
                    value={vm.roleFilter}
                    onChange={(event) =>
                      vm.setRoleFilter(event.target.value as RoleFilter)
                    }
                    className="sm:max-w-[12rem]"
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>

                {vm.isFilteredEmpty ? (
                  <EmptyState
                    className="m-6"
                    icon="🔍"
                    title="No matching people"
                    description="Try a different email, name or laboratory."
                  />
                ) : (
                  <ul className="divide-y divide-[var(--border-subtle)]">
                    {vm.people.map((person) => (
                      <li
                        key={person.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar
                            name={person.fullName}
                            color={person.avatarColor}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-[var(--text-strong)]">
                              {person.fullName}
                            </p>
                            <p className="truncate font-mono text-xs text-[var(--text-muted)]">
                              {person.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium">
                            {ROLE_LABEL[person.role] ?? person.role}
                          </span>
                          <span className="hidden sm:inline">{person.orgName}</span>
                          <span className="whitespace-nowrap">
                            {person.lastSeenAt
                              ? `Last active ${formatDateTime(person.lastSeenAt)}`
                              : `Last signed in ${formatDateTime(person.lastSignInAt)}`}
                          </span>
                          <PresencePill presence={person.presence} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </section>
          </>
        )}
      </StateBoundary>
      {/* No lab list any more — an IT admin gets every laboratory, so the
          dialog only needs to say how many that currently is. */}
      <AddLabAdminModal
        open={addAdminOpen}
        onClose={closeAddAdmin}
        vm={addAdminVm}
        labCount={vm.labs.length}
      />
    </div>
  );
}
