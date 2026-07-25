// ============================================================================
// VIEW LAYER — GitHub Team & Role Hierarchy (read-only, plan §2 / ADDENDUM A)
// Renders the 4-tier org structure grouped by tier. Presentational only:
// receives the already-sorted/grouped tiers from useAdminOverview.
// Students never appear here (zero-footprint) — reinforced visually.
// ============================================================================
import type { GithubTeamType, GithubTeamWithMembers } from "@/models/types";
import type { TeamTierGroup } from "@/viewmodels/useAdminOverview";
import { Avatar, Card, GenericPill, GithubRoleBadge, cn } from "@/components/ui";

const TYPE_LABEL: Record<GithubTeamType, string> = {
  ORG_OWNERS: "Org Owners",
  FACULTY: "Faculty",
  CLASS: "Class Team",
};

function TeamCard({
  team,
  orgHandle,
}: {
  team: GithubTeamWithMembers;
  orgHandle: string;
}) {
  return (
    <Card className="flex h-full flex-col overflow-hidden animate-fade-up">
      <div className="border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold text-[var(--text-strong)]">
              {team.name}
            </h4>
            <p className="truncate font-mono text-xs text-[var(--text-muted)]">
              @{orgHandle}/{team.slug}
            </p>
          </div>
          <GenericPill tone={team.type === "CLASS" ? "info" : "neutral"}>
            {TYPE_LABEL[team.type]}
          </GenericPill>
        </div>
        {team.type === "CLASS" && team.classId && (
          <p className="mt-2 inline-flex items-center gap-1 rounded bg-platform-50 px-2 py-0.5 text-[11px] font-medium text-platform-700">
            <span aria-hidden="true">🔗</span> Linked to class cohort
          </p>
        )}
      </div>

      <ul className="flex-1 divide-y divide-[var(--border-subtle)]">
        {team.members.length === 0 ? (
          <li className="px-4 py-3 text-sm text-[var(--text-muted)]">
            No members.
          </li>
        ) : (
          team.members.map(({ user, githubRole }) => (
            <li
              key={user.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar name={user.fullName} color={user.avatarColor} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--text-strong)]">
                    {user.fullName}
                  </p>
                  <p className="truncate font-mono text-xs text-[var(--text-muted)]">
                    {user.githubUsername ? `@${user.githubUsername}` : "—"}
                  </p>
                </div>
              </div>
              <GithubRoleBadge role={githubRole} />
            </li>
          ))
        )}
      </ul>
    </Card>
  );
}

export function GithubTeamHierarchy({
  teamsByTier,
  orgHandle,
}: {
  teamsByTier: TeamTierGroup[];
  orgHandle: string;
}) {
  return (
    <div className="space-y-6">
      {teamsByTier.map((group) => (
        <div key={group.tier}>
          <div className="flex items-baseline gap-3">
            <h3 className="text-sm font-semibold text-[var(--text-strong)]">
              {group.label}
            </h3>
            <span className="text-xs text-[var(--text-muted)]">
              {group.description}
            </span>
          </div>
          <div
            className={cn(
              "mt-3 grid gap-4",
              group.teams.length > 1 ? "sm:grid-cols-2" : "sm:grid-cols-1",
            )}
          >
            {group.teams.map((team) => (
              <TeamCard key={team.id} team={team} orgHandle={orgHandle} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
