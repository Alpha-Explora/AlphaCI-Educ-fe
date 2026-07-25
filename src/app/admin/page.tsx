"use client";
// ============================================================================
// VIEW LAYER — IT Admin org overview
// GitHub App / SSO / SCIM status, zero-footprint seat-savings, lab PC
// inventory, IT admins, and the Archive-semester action. Consumes
// useAdminOverview (org id from the signed-in admin's session).
// ============================================================================
import { useSession } from "@/viewmodels/useSession";
import { useAdminOverview } from "@/viewmodels/useAdminOverview";
import {
  Avatar,
  Card,
  EmptyState,
  Skeleton,
  Stat,
  StateBoundary,
  cn,
} from "@/components/ui";
import { ArchiveSemesterCard } from "@/components/domain/ArchiveSemesterCard";
import { GithubTeamHierarchy } from "@/components/domain/GithubTeamHierarchy";
import { formatUsd } from "@/components/ui/format";

function StatusChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        ok
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-red-50 text-red-700 ring-red-200",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", ok ? "bg-success" : "bg-danger")} />
      {ok ? label : `${label} — inactive`}
    </span>
  );
}

function IntegrationCard({
  icon,
  title,
  value,
  children,
}: {
  icon: string;
  title: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5 animate-fade-up">
      <div className="flex items-center gap-2 text-[var(--text-muted)]">
        <span aria-hidden="true" className="text-lg">
          {icon}
        </span>
        <p className="text-xs font-semibold uppercase tracking-wide">{title}</p>
      </div>
      <p className="mt-2 text-lg font-semibold text-[var(--text-strong)]">{value}</p>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

export default function AdminOverviewPage() {
  const { user, selectedOrgId } = useSession();
  // ADDENDUM K — scope the overview to the lab the admin is currently viewing
  // (falls back to their home org if no lab is selected yet).
  const vm = useAdminOverview(selectedOrgId ?? user?.orgId ?? null);
  const d = vm.data;

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-semibold text-[var(--text-strong)]">
          Organization overview
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Enterprise integration status, zero-footprint seat savings, and campus lab inventory.
        </p>
      </div>

      <StateBoundary
        isLoading={vm.isLoading}
        error={vm.error}
        onRetry={vm.refetch}
        loadingFallback={
          <div className="space-y-6">
            <Skeleton className="h-28 w-full rounded-xl" />
            <div className="grid gap-5 sm:grid-cols-3">
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          </div>
        }
      >
        {d && (
          <>
            {/* Org identity banner */}
            <Card className="overflow-hidden animate-fade-up">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-github px-6 py-5 text-white">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-white/60">
                    University organization
                  </p>
                  <h2 className="mt-0.5 text-xl font-semibold">{d.org.name}</h2>
                  <p className="mt-1 font-mono text-sm text-white/70">
                    github.com/{d.org.githubOrgName}
                  </p>
                </div>
                <div className="text-right text-sm text-white/70">
                  <p>Installation ID</p>
                  <p className="font-mono text-white">{d.org.githubInstallationId}</p>
                </div>
              </div>
            </Card>

            {/* Integration status */}
            <div className="grid gap-5 sm:grid-cols-3">
              <IntegrationCard icon="🐙" title="GitHub App" value="Platform integration">
                <StatusChip ok={d.githubAppInstalled} label="Installed" />
              </IntegrationCard>
              <IntegrationCard icon="🔐" title="SSO Provider" value={d.ssoProvider}>
                <StatusChip ok label="SAML/OIDC active" />
              </IntegrationCard>
              <IntegrationCard icon="🔄" title="SCIM Provisioning" value="Auto de-provisioning">
                <StatusChip ok={d.scimEnabled} label="Enabled" />
              </IntegrationCard>
            </div>

            {/* Zero-footprint seat savings — the headline sales metric */}
            <Card className="overflow-hidden animate-fade-up">
              <div className="border-b border-[var(--border-subtle)] px-6 py-4">
                <h2 className="text-base font-semibold text-[var(--text-strong)]">
                  Zero-footprint savings
                </h2>
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                  Students interact via App Tokens and sit entirely outside GitHub billing.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-5 p-6 sm:grid-cols-4">
                <Stat
                  label="Students (seats saved)"
                  value={d.stats.seatsSaved}
                  tone="platform"
                  hint="Outside GitHub billing"
                />
                <Stat
                  label="Est. annual savings"
                  value={formatUsd(d.stats.estimatedSeatSavingsUsd)}
                  tone="success"
                  hint={`${d.stats.totalStudents} × $21/seat`}
                />
                <Stat label="Teachers" value={d.stats.totalTeachers} />
                <Stat label="Classes" value={d.stats.totalClasses} />
              </div>
              <div className="grid grid-cols-3 gap-5 border-t border-[var(--border-subtle)] bg-slate-50/60 p-6">
                <Stat label="Total repositories" value={d.stats.totalRepositories} />
                <Stat
                  label="Active"
                  value={d.stats.activeRepositories}
                  tone="platform"
                />
                <Stat label="Archived" value={d.stats.archivedRepositories} />
              </div>
            </Card>

            {/* Admins + Lab inventory */}
            <div className="grid gap-5 lg:grid-cols-2">
              <Card className="p-5">
                <h2 className="text-base font-semibold text-[var(--text-strong)]">
                  Organization owners (IT admins)
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

            {/* GitHub Team & Role Hierarchy (plan §2) */}
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-strong)]">
                  GitHub team &amp; role hierarchy
                </h2>
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                  Where faculty and admins sit inside the single university GitHub org.
                  Students are <strong>never</strong> team members — they interact via App
                  Tokens and Outside Collaborator invites only.
                </p>
              </div>

              {/* Seat economics callout */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="border-github/20 bg-slate-50 p-5">
                  <div className="flex items-center gap-2 text-[var(--text-muted)]">
                    <span aria-hidden="true" className="text-lg">
                      🪑
                    </span>
                    <p className="text-xs font-semibold uppercase tracking-wide">
                      GitHub seats used
                    </p>
                  </div>
                  <p className="mt-2 text-3xl font-semibold tabular-nums text-[var(--text-strong)]">
                    {d.stats.githubSeatsUsed}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    Faculty + admins ({d.stats.totalTeachers} teachers +{" "}
                    {d.itAdmins.length} admins) — the only identities that consume paid
                    org seats.
                  </p>
                </Card>

                <Card className="border-emerald-200 bg-emerald-50/50 p-5">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <span aria-hidden="true" className="text-lg">
                      🎒
                    </span>
                    <p className="text-xs font-semibold uppercase tracking-wide">
                      Students in the hierarchy
                    </p>
                  </div>
                  <p className="mt-2 text-3xl font-semibold tabular-nums text-emerald-700">
                    0 seats
                  </p>
                  <p className="mt-1 text-sm text-emerald-800/80">
                    Zero-footprint — all {d.stats.seatsSaved} students sit outside billing as
                    Outside Collaborators, saving{" "}
                    <strong>{formatUsd(d.stats.estimatedSeatSavingsUsd)}</strong>/yr.
                  </p>
                </Card>
              </div>

              {vm.teamsByTier.length === 0 ? (
                <EmptyState
                  icon="🐙"
                  title="No GitHub teams configured"
                  description="Teams appear here once the org's tier structure is provisioned."
                />
              ) : (
                <GithubTeamHierarchy
                  teamsByTier={vm.teamsByTier}
                  orgHandle={d.org.githubOrgName}
                />
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
