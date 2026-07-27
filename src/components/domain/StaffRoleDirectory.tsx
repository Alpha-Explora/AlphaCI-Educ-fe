// ============================================================================
// VIEW LAYER — Staff & roles directory (admin)
//
// Replaces the former GithubTeamHierarchy. Same underlying data (the tiered
// team structure from useAdminOverview), but presented as what an IT admin
// actually needs — who has access, at what level — with every trace of the
// hosting provider removed:
//
//   • no "@org/team-slug" subtitle          (exposed the organization)
//   • no "@github-username" per member      (exposed personal handles)
//   • no provider role badge (OWNER/MEMBER) (exposed provider vocabulary)
//
// The tier grouping is kept because it carries real meaning — who administers
// the lab vs. who teaches in it — just labelled in system terms.
// Students never appear here; they hold no staff access at all.
// ============================================================================
import type { GithubTeamType, GithubTeamWithMembers } from "@/models/types";
import type { TeamTierGroup } from "@/viewmodels/useAdminOverview";
import { Avatar, Card, GenericPill, cn } from "@/components/ui";

/** Provider team types, relabelled as access groups. */
const GROUP_LABEL: Record<GithubTeamType, string> = {
  ORG_OWNERS: "Lab administrators",
  FACULTY: "Faculty",
  CLASS: "Class group",
};

/**
 * Access level, described by what the person can do rather than by the
 * provider's role name. Derived from the team type, not from githubRole, so no
 * provider vocabulary reaches the screen.
 */
function accessLabel(type: GithubTeamType): string {
  switch (type) {
    case "ORG_OWNERS":
      return "Full lab access";
    case "FACULTY":
      return "Can create classes";
    case "CLASS":
      return "Teaches this class";
  }
}

function GroupCard({ team }: { team: GithubTeamWithMembers }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden animate-fade-up">
      <div className="border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold text-[var(--text-strong)]">
              {team.name}
            </h4>
            <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
              {accessLabel(team.type)}
            </p>
          </div>
          <GenericPill tone={team.type === "CLASS" ? "info" : "neutral"}>
            {GROUP_LABEL[team.type]}
          </GenericPill>
        </div>
        {team.type === "CLASS" && team.classId && (
          <p className="mt-2 inline-flex items-center gap-1 rounded bg-platform-50 px-2 py-0.5 text-[11px] font-medium text-platform-700">
            <span aria-hidden="true">🔗</span> Linked to a class cohort
          </p>
        )}
      </div>

      <ul className="flex-1 divide-y divide-[var(--border-subtle)]">
        {team.members.length === 0 ? (
          <li className="px-4 py-3 text-sm text-[var(--text-muted)]">No members yet.</li>
        ) : (
          team.members.map(({ user }) => (
            <li key={user.id} className="flex items-center gap-2.5 px-4 py-2.5">
              <Avatar name={user.fullName} color={user.avatarColor} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--text-strong)]">
                  {user.fullName}
                </p>
                {/* Email, not a provider handle — it's how the school already
                    identifies staff, and it's what the admin typed to invite
                    them in the first place. */}
                <p className="truncate text-xs text-[var(--text-muted)]">{user.email}</p>
              </div>
            </li>
          ))
        )}
      </ul>
    </Card>
  );
}

export function StaffRoleDirectory({ teamsByTier }: { teamsByTier: TeamTierGroup[] }) {
  return (
    <div className="space-y-6">
      {teamsByTier.map((group) => (
        <div key={group.tier}>
          <div className="flex items-baseline gap-3">
            <h3 className="text-sm font-semibold text-[var(--text-strong)]">
              {group.label}
            </h3>
            <span className="text-xs text-[var(--text-muted)]">{group.description}</span>
          </div>
          <div
            className={cn(
              "mt-3 grid gap-4",
              group.teams.length > 1 ? "sm:grid-cols-2" : "sm:grid-cols-1",
            )}
          >
            {group.teams.map((team) => (
              <GroupCard key={team.id} team={team} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
