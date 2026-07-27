"use client";
// ============================================================================
// VIEW LAYER — ADDENDUM M: Live GitHub activity.
// What actually happened on the repository: real commits (the student's push),
// branches, and GitHub Actions workflow runs — including the failing jobs/steps
// of the newest run, so "what broke" is visible without leaving AlphaCI.
// Data/polling live in useRepoActivity; this component is presentational.
// ============================================================================
import { useRepoActivity } from "@/viewmodels/useRepoActivity";
import type { GithubWorkflowRunInfo } from "@/models/types";
import { Banner, Button, Card, GenericPill, Skeleton, Spinner } from "@/components/ui";
import { formatDateTime } from "@/components/ui/format";

type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "running";

function runTone(run: GithubWorkflowRunInfo): Tone {
  if (run.status !== "completed") return "running";
  switch (run.conclusion) {
    case "success":
      return "success";
    case "failure":
    case "timed_out":
      return "danger";
    case "cancelled":
      return "neutral";
    default:
      return "warning";
  }
}

function runLabel(run: GithubWorkflowRunInfo): string {
  if (run.status !== "completed") return run.status.replace(/_/g, " ");
  return run.conclusion ?? "completed";
}

export function GithubActivityPanel({
  repoId,
  branch,
}: {
  readonly repoId: string;
  readonly branch?: string | null;
}) {
  const vm = useRepoActivity(repoId, branch);
  const a = vm.data;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-strong)]">
            Live activity
            {vm.isFetching && <Spinner size="sm" className="text-platform" />}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Your pushes, branches and CI runs, refreshed automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {a && (
            <GenericPill tone={a.live ? "success" : "warning"}>
              {a.live ? "LIVE" : "SIMULATED"}
            </GenericPill>
          )}
          <Button variant="ghost" size="sm" onClick={vm.refetch}>
            ⟳ Refresh
          </Button>
        </div>
      </div>

      {vm.isLoading && (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      )}

      {vm.error && (
        <Banner tone={vm.error.isNetworkError ? "network" : "error"} className="mt-4">
          {vm.error.isNetworkError
            ? "Couldn't reach the backend for live activity."
            : vm.error.message}
        </Banner>
      )}

      {a && !a.live && (
        <Banner tone="info" className="mt-4">
          Live activity is off (simulated mode). Ask your admin to enable it to see real
          commits, branches and CI runs here.
        </Banner>
      )}

      {a?.error && (
        <Banner tone="warning" className="mt-4">
          Activity couldn&rsquo;t be loaded: {a.error}
        </Banner>
      )}

      {a?.live && !a.error && (
        <div className="mt-5 space-y-6">
          {/* --- Workflow runs (CI) --- */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Workflow runs
            </h3>
            {a.workflowRuns.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                No workflow runs yet. Push a commit to trigger CI.
              </p>
            ) : (
              <ul className="mt-2 space-y-3">
                {a.workflowRuns.slice(0, 5).map((run, idx) => (
                  <li
                    key={run.id}
                    className="rounded-lg border border-[var(--border-subtle)] p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <GenericPill tone={runTone(run)}>{runLabel(run)}</GenericPill>
                        <span className="truncate text-sm font-medium text-[var(--text-strong)]">
                          {run.name}
                        </span>
                        <span className="font-mono text-xs text-[var(--text-muted)]">
                          {run.branch} · {run.sha.slice(0, 7)}
                        </span>
                      </div>
                      {/*
                        run.url is a link into the hosting provider's Actions
                        tab — deliberately not rendered. The failing jobs and
                        steps are expanded inline below, which is the detail a
                        student actually needed that link for.
                      */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[var(--text-muted)]">
                          {formatDateTime(run.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Newest run: jobs + failing steps = "what went wrong" */}
                    {idx === 0 && run.jobs.length > 0 && (
                      <ul className="mt-3 space-y-2 border-t border-[var(--border-subtle)] pt-3">
                        {run.jobs.map((job) => {
                          const failedSteps = job.steps.filter(
                            (s) => s.conclusion === "failure",
                          );
                          return (
                            <li key={job.name} className="text-sm">
                              <div className="flex items-center gap-2">
                                <GenericPill
                                  tone={
                                    job.conclusion === "success"
                                      ? "success"
                                      : job.conclusion === "failure"
                                        ? "danger"
                                        : "neutral"
                                  }
                                >
                                  {job.conclusion ?? job.status}
                                </GenericPill>
                                <span className="text-[var(--text-strong)]">{job.name}</span>
                              </div>
                              {failedSteps.length > 0 && (
                                <ul className="ml-4 mt-1 list-disc space-y-0.5 text-xs text-red-700">
                                  {failedSteps.map((s) => (
                                    <li key={s.name}>Failed step: {s.name}</li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* --- Commits --- */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Recent commits
            </h3>
            {a.commits.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--text-muted)]">No commits yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-[var(--border-subtle)]">
                {/* c.url (the commit page on the hosting provider) is
                    deliberately not rendered — the sha, author and message are
                    the whole story a student needed that link for. */}
                {a.commits.slice(0, 8).map((c) => (
                  <li key={c.sha} className="py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-[var(--text-strong)]">{c.message}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        <span className="font-mono">{c.sha.slice(0, 7)}</span> · {c.author}
                        {c.date ? ` · ${formatDateTime(c.date)}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* --- Branches --- */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Branches
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {a.branches.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No branches found.</p>
              ) : (
                a.branches.map((b) => (
                  <GenericPill
                    key={b.name}
                    tone={b.name === a.defaultBranch ? "info" : "neutral"}
                  >
                    {b.name}
                    {b.protected ? " 🔒" : ""}
                  </GenericPill>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </Card>
  );
}
