// ============================================================================
// VIEW LAYER — Provisioning result summary (shared)
// Renders a SIMULATED/LIVE badge, created/skipped counts, and — when live —
// the CI/CD scaffold summary + links to each real repo and its Actions/CI.
// Reused by ProvisionRepositoriesButton and the Create-Project success view.
// ============================================================================
import type {
  AssignmentRepository,
  RepoComponent,
  RepoOwnerMode,
  RepoScaffold,
  Stack,
} from "@/models/types";
import { GithubMark, GithubModeBadge, cn } from "@/components/ui";

const STACK_LABEL: Record<Stack, string> = {
  nodejs: "Node.js",
  nestjs: "NestJS",
  nextjs: "Next.js",
  react: "React",
};

function ComponentBadge({ component }: { component: RepoComponent }) {
  const isBackend = component === "BACKEND";
  return (
    <span
      className={cn(
        "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        isBackend ? "bg-platform-50 text-platform-700" : "bg-emerald-50 text-emerald-700",
      )}
    >
      {isBackend ? "BE" : "FE"}
    </span>
  );
}

export interface ProvisionSummaryView {
  created: number;
  skipped: number;
  live: boolean;
  repos: AssignmentRepository[];
  defaultBranch: string | null;
  scaffold: RepoScaffold | null;
  // ADDENDUM D — where the repos landed
  ownerLogin?: string | null;
  ownerMode?: RepoOwnerMode | null;
  ownerFallback?: boolean;
}

export function ProvisionResultSummary({
  summary,
}: {
  summary: ProvisionSummaryView;
}) {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-white p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <GithubModeBadge live={summary.live} />
        <span className="text-[var(--text-strong)]">
          Created <strong className="tabular-nums">{summary.created}</strong>, skipped{" "}
          <strong className="tabular-nums">{summary.skipped}</strong>
        </span>
      </div>

      <div className="mt-2 space-y-2">
        {/* ADDENDUM D — where the repos landed (teacher persona vs org) */}
        {summary.ownerLogin && (
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <GithubMark size={12} />
            <span>
              Owned by{" "}
              <strong className="font-mono text-[var(--text-strong)]">
                @{summary.ownerLogin}
              </strong>
            </span>
            {summary.ownerMode && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                {summary.ownerMode === "TEACHER"
                  ? "your GitHub account"
                  : "education org"}
              </span>
            )}
            {summary.ownerFallback && (
              <span className="rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">
                fell back from org
              </span>
            )}
          </p>
        )}
        {summary.scaffold && (
          <p className="text-xs text-[var(--text-muted)]">
            Pushed a{" "}
            <strong className="text-[var(--text-strong)]">{summary.scaffold.stack}</strong>{" "}
            CI/CD scaffold ·{" "}
            <strong className="tabular-nums text-[var(--text-strong)]">
              {summary.scaffold.files.length}
            </strong>{" "}
            files
            {summary.defaultBranch ? ` · default ${summary.defaultBranch}` : ""}
          </p>
        )}
        {summary.repos.length > 0 && (
          <ul className="max-h-48 space-y-1 overflow-y-auto scroll-thin">
            {summary.repos.map((repo) => (
              <li
                key={repo.id}
                className="flex items-center justify-between gap-2 rounded border border-[var(--border-subtle)] px-2 py-1.5"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  {/* ADDENDUM G — BE/FE component badge for SPLIT repos */}
                  {repo.component && repo.component !== "SINGLE" && (
                    <ComponentBadge component={repo.component} />
                  )}
                  <span
                    className="min-w-0 truncate font-mono text-xs text-[var(--text-muted)]"
                    title={repo.repoName}
                  >
                    {repo.repoName}
                  </span>
                  {repo.stack && (
                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                      {STACK_LABEL[repo.stack]}
                    </span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {summary.live ? (
                    <>
                      <a
                        href={repo.githubRepoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-platform hover:underline"
                      >
                        <GithubMark size={12} /> Repo
                      </a>
                      <a
                        href={`${repo.githubRepoUrl}/actions`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-platform hover:underline"
                      >
                        Actions ↗
                      </a>
                    </>
                  ) : (
                    <a
                      href={`/teacher/repositories/${repo.id}`}
                      className="text-xs font-medium text-platform hover:underline"
                    >
                      Workspace ↗
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        {!summary.live && (
          <p className="text-[10px] text-[var(--text-muted)] italic">
            Simulated — repositories created in-memory only. Sign in as a teacher via GitHub
            and configure the backend OAuth app to create real repos.
          </p>
        )}
      </div>
    </div>
  );
}
