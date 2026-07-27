"use client";
// ============================================================================
// VIEW LAYER — IT Admin org overview
// Laboratory activity, the student-account monitor, lab PC inventory, staff &
// roles, and the Archive-semester action. Consumes useAdminOverview and
// useStudentMonitor (org id from the signed-in admin's session).
//
// Deliberately absent: the SSO / SCIM / source-hosting integration cards and
// the licence-savings figures. They described how the platform is plumbed and
// what it saves in seat licences — neither is something an admin supervising a
// live laboratory acts on. Student presence is.
// ============================================================================
import Link from "next/link";
import { useSession } from "@/viewmodels/useSession";
import { useAdminOverview } from "@/viewmodels/useAdminOverview";
import { useStudentMonitor } from "@/viewmodels/useStudentMonitor";
import { Avatar, Card, EmptyState, Skeleton, Stat, StateBoundary } from "@/components/ui";
import { ArchiveSemesterCard } from "@/components/domain/ArchiveSemesterCard";
import { StaffRoleDirectory } from "@/components/domain/StaffRoleDirectory";
import { StudentAccountMonitor } from "@/components/domain/StudentAccountMonitor";

export default function AdminOverviewPage() {
  const { user, selectedOrgId } = useSession();
  // ADDENDUM K — scope the overview to the lab the admin is currently viewing
  // (falls back to their home org if no lab is selected yet).
  const orgId = selectedOrgId ?? user?.orgId ?? null;
  const vm = useAdminOverview(orgId);
  const studentsVm = useStudentMonitor(orgId);
  const d = vm.data;

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-semibold text-[var(--text-strong)]">
          Laboratory overview
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Student activity, teaching staff, and campus lab inventory.
        </p>
      </div>

      <StateBoundary
        isLoading={vm.isLoading}
        error={vm.error}
        onRetry={vm.refetch}
        loadingFallback={
          <div className="space-y-6">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        }
      >
        {d && (
          <>
            {/*
              Lab identity banner. Was a dark provider-branded header showing
              "github.com/<org>" and the App installation ID; both identified the
              hosting organization, so both are gone. The school's own name is
              the identity that matters here.
            */}
            <Card className="overflow-hidden animate-fade-up">
              <div className="bg-platform-700 px-6 py-5 text-white">
                <p className="text-xs font-medium uppercase tracking-wide text-white/70">
                  Laboratory
                </p>
                <h2 className="mt-0.5 text-xl font-semibold">{d.org.name}</h2>
                <p className="mt-1 text-sm text-white/70">
                  {d.stats.totalClasses} classes · {d.stats.totalTeachers} teachers ·{" "}
                  {d.stats.totalStudents} students
                </p>
              </div>
            </Card>

            {/*
              Laboratory activity — what this lab currently HOLDS. The seat and
              licence figures that used to headline this card are gone; the
              project counts stayed because Archive semester below acts on them.
            */}
            <Card className="overflow-hidden animate-fade-up">
              <div className="border-b border-[var(--border-subtle)] px-6 py-4">
                <h2 className="text-base font-semibold text-[var(--text-strong)]">
                  Laboratory activity
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-5 p-6 sm:grid-cols-5">
                <Stat label="Students" value={d.stats.totalStudents} tone="platform" />
                <Stat label="Teachers" value={d.stats.totalTeachers} />
                <Stat label="Classes" value={d.stats.totalClasses} />
                {/* "Projects", matching the language used everywhere a teacher
                    or student sees these — they are never called repositories
                    in the UI any more. */}
                <Stat label="Active projects" value={d.stats.activeRepositories} />
                <Stat label="Archived" value={d.stats.archivedRepositories} />
              </div>
            </Card>

            {/* Who is actually using the lab, by their sign-in email. */}
            <StudentAccountMonitor vm={studentsVm} />

            {/* Admins + Lab inventory */}
            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="p-5">
                <h2 className="text-base font-semibold text-[var(--text-strong)]">
                  Lab administrators
                </h2>
                <ul className="mt-3 space-y-3">
                  {d.itAdmins.map((a) => (
                    <li key={a.id} className="flex items-center gap-3">
                      <Avatar name={a.fullName} color={a.avatarColor} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--text-strong)]">
                          {a.fullName}
                        </p>
                        <p className="truncate text-xs text-[var(--text-muted)]">{a.email}</p>
                      </div>
                    </li>
                  ))}
                  {d.itAdmins.length === 0 && (
                    <li className="text-sm text-[var(--text-muted)]">No admins listed.</li>
                  )}
                </ul>
              </Card>

              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-[var(--text-strong)]">
                    Lab PC inventory
                  </h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-[var(--text-muted)]">
                    {d.stats.labPcs} machines
                  </span>
                </div>
                {d.labPcs.length === 0 ? (
                  <EmptyState
                    className="mt-3"
                    icon="🖥️"
                    title="No lab PCs registered"
                  />
                ) : (
                  <ul className="mt-3 divide-y divide-[var(--border-subtle)]">
                    {d.labPcs.map((pc) => (
                      <li
                        key={pc.id}
                        className="flex items-center justify-between py-2.5 text-sm"
                      >
                        <span className="flex items-center gap-2 font-medium text-[var(--text-strong)]">
                          <span aria-hidden="true">🖥️</span> {pc.pcName}
                        </span>
                        <span className="text-[var(--text-muted)]">{pc.location}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            {/* Staff & roles — was "GitHub team & role hierarchy" */}
            <section className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-strong)]">
                    Staff &amp; roles
                  </h2>
                  <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                    Who has access to this laboratory and at what level. Students
                    never appear here — they hold no staff access.
                  </p>
                </div>
                <Link
                  href="/admin/teachers"
                  className="shrink-0 rounded-lg border border-platform-200 bg-platform-50 px-3.5 py-2 text-sm font-medium text-platform-700 transition-colors hover:bg-platform-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform"
                >
                  Manage teachers →
                </Link>
              </div>

              {/* Staff headcount. The paired "Student accounts — No licence"
                  card that used to sit beside this is gone; students are now
                  covered properly by the monitor above, where the useful fact is
                  who signed in, not what they cost. */}
              <Card className="bg-[var(--bg-subtle)] p-5">
                <div className="flex items-center gap-2 text-[var(--text-muted)]">
                  <span aria-hidden="true" className="text-lg">
                    🧑‍🏫
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-wide">
                    Staff accounts
                  </p>
                </div>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--text-strong)]">
                  {d.stats.githubSeatsUsed}
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {d.stats.totalTeachers} teachers + {d.itAdmins.length} admins.
                </p>
              </Card>

              {vm.teamsByTier.length === 0 ? (
                <EmptyState
                  icon="🧑‍🏫"
                  title="No staff groups yet"
                  description="Groups appear here once this laboratory has teachers and classes."
                />
              ) : (
                <StaffRoleDirectory teamsByTier={vm.teamsByTier} />
              )}
            </section>

            {/* Archive semester */}
            <ArchiveSemesterCard
              activeRepositories={d.stats.activeRepositories}
              onArchive={vm.archiveSemester}
              isArchiving={vm.isArchiving}
              error={vm.archiveError}
              lastArchivedCount={vm.lastArchivedCount}
            />
          </>
        )}
      </StateBoundary>
    </div>
  );
}
