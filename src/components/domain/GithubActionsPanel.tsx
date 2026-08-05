"use client";
// ============================================================================
// VIEW LAYER — Actions: real GitHub Actions workflow runs for this repository.
//
// Modelled on GitHub's own Actions tab, because this IS that tab for people who
// cannot open it: students hold no GitHub account, so if a run is not legible
// here it is not legible anywhere. Learning to read a CI run is part of the
// subject being taught, and the vocabulary should be the one they will meet
// again in industry — run, job, step, conclusion.
//
// ONE CONTAINER PER COMMIT, with that commit's runs inside it. GitHub lists
// runs flat and repeats the commit on every row, which works when you already
// know that a run comes FROM a push. That is exactly the causal link a beginner
// has not made yet — "I pushed, therefore this ran" — so the commit is the
// container and the runs sit inside it, where the relationship is structural
// rather than something you have to infer from a repeated sha.
//
// A commit with no run gets a container too. "Nothing happened" is a result a
// student needs to see: it means the push landed but no workflow matched it,
// which is otherwise an invisible failure that looks like CI being slow.
//
// Data/polling live in useRepoActivity; per-run jobs load on expand via
// useWorkflowRunJobs, so a page showing ten runs still costs one request.
// ============================================================================
import { useEffect, useState } from "react";
import { useRepoActivity } from "@/viewmodels/useRepoActivity";
import { useWorkflowRunJobs } from "@/viewmodels/useWorkflowRunJobs";
import { useJobLog } from "@/viewmodels/useJobLog";
import { JobLogConsole } from "./JobLogConsole";
import type {
  GithubCommitInfo,
  GithubWorkflowJob,
  GithubWorkflowRunInfo,
} from "@/models/types";
import {
  Banner,
  Button,
  Card,
  GenericPill,
  Select,
  Skeleton,
  Spinner,
  cn,
} from "@/components/ui";
import { formatDateTime, formatDuration, relativeTime } from "@/components/ui/format";

type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "running";

/** A run is "live" until GitHub says completed — queued and in_progress both. */
function isRunning(run: GithubWorkflowRunInfo): boolean {
  return run.status !== "completed";
}

function runTone(run: GithubWorkflowRunInfo): Tone {
  if (isRunning(run)) return "running";
  switch (run.conclusion) {
    case "success":
      return "success";
    case "failure":
    case "timed_out":
      return "danger";
    case "cancelled":
    case "skipped":
      return "neutral";
    default:
      return "warning";
  }
}

/** GitHub's own words, de-snake-cased: "in progress", "success", "failure". */
/**
 * GitHub's second-line phrasing: "Commit 4f8b3d7 pushed by alphaci[bot]",
 * "Pull request #2 opened by LloydLim1", "Manually run by …".
 *
 * Reconstructed rather than read from the API, because GitHub does not send this
 * sentence — it composes it from `event` + `actor` + the head sha in its own UI.
 * Matching the wording matters more than it looks: a student who learns to read
 * this row here can read the real Actions tab unaided, which is the entire reason
 * this panel exists.
 */
function describeTrigger(run: GithubWorkflowRunInfo): string {
  const who = run.actor || run.commitAuthor;
  const by = who ? ` by ${who}` : "";

  if (run.event === "pull_request") return `Pull request${by}`;
  if (run.event === "workflow_dispatch") return `Manually run${by}`;
  if (run.event === "schedule") return "Scheduled";
  if (run.event === "push") {
    const sha = run.sha ? ` ${run.sha.slice(0, 7)}` : "";
    return `Commit${sha} pushed${by}`;
  }
  // An event this build has not met yet still reads sensibly rather than blank.
  return `${run.event || "Run"}${by}`;
}

function runLabel(run: GithubWorkflowRunInfo): string {
  const raw = isRunning(run) ? run.status : run.conclusion ?? "completed";
  return raw.replace(/_/g, " ");
}

function jobTone(job: GithubWorkflowJob): Tone {
  if (job.status !== "completed") return "running";
  switch (job.conclusion) {
    case "success":
      return "success";
    case "failure":
      return "danger";
    case "skipped":
    case "cancelled":
      return "neutral";
    default:
      return "warning";
  }
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

interface CommitGroup {
  sha: string;
  message: string;
  author: string;
  /** Commit timestamp when known, else when its first run was created. */
  date: string | null;
  /** Only the runs know this — the commits API does not say which branch. */
  branch: string | null;
  runs: GithubWorkflowRunInfo[];
  /** Sort key: newest activity on this commit, run or push. */
  sortAt: number;
}

function time(iso: string | null | undefined): number {
  if (!iso) return 0;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

/**
 * Fold the two lists — commits and runs — into one commit-keyed list.
 *
 * They are separate GitHub calls with separate paging and separate filters:
 * commits come from one branch, runs come from all of them. So neither list is
 * a superset, and a run whose commit is missing from `commits` still has to
 * produce a readable container. That is what the run's own commitMessage and
 * commitAuthor are carried for.
 */
function groupByCommit(
  commits: GithubCommitInfo[],
  runs: GithubWorkflowRunInfo[],
): CommitGroup[] {
  const groups = new Map<string, CommitGroup>();

  for (const c of commits) {
    groups.set(c.sha, {
      sha: c.sha,
      message: c.message,
      author: c.author,
      date: c.date,
      branch: null,
      runs: [],
      sortAt: time(c.date),
    });
  }

  for (const run of runs) {
    let group = groups.get(run.sha);
    if (!group) {
      group = {
        sha: run.sha,
        message: run.commitMessage || "(no commit message)",
        author: run.commitAuthor,
        date: run.createdAt,
        branch: run.branch || null,
        runs: [],
        sortAt: 0,
      };
      groups.set(run.sha, group);
    }
    group.runs.push(run);
    group.branch ??= run.branch || null;
    group.sortAt = Math.max(group.sortAt, time(run.createdAt));
  }

  return [...groups.values()]
    .map((g) => ({ ...g, runs: [...g.runs].sort((a, b) => b.runNumber - a.runNumber) }))
    .sort((a, b) => b.sortAt - a.sortAt);
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function GithubActionsPanel({
  repoId,
  branch,
}: {
  readonly repoId: string;
  /** Which branch to open on. Defaults to the repository's default branch. */
  readonly branch?: string | null;
}) {
  // Owned here, not by the page: this filter only ever narrows this list, and
  // GitHub puts it in the same place for the same reason.
  const [branchFilter, setBranchFilter] = useState<string>(branch ?? "");
  const vm = useRepoActivity(repoId, branchFilter || null);
  const a = vm.data;

  // MASTER → DETAIL, not an accordion.
  //
  // Rows used to expand in place. That is a reasonable pattern and the wrong one
  // here: GitHub opens a run on its own page, and this panel exists so a student
  // who cannot open GitHub still learns to read the real thing. An expander also
  // put a run's jobs and steps inside a list row, so the deeper you looked the
  // narrower the column got.
  //
  // The id, not the run object: `useRepoActivity` polls, so holding the object
  // would pin a stale copy — a run that finished while open would keep rendering
  // as running. Looked up fresh from the current payload on every render instead.
  const [openRunId, setOpenRunId] = useState<number | null>(null);
  const openRun = a?.workflowRuns.find((r) => r.id === openRunId) ?? null;

  // ALL BRANCHES BY DEFAULT — `""` means unfiltered, and the API omits the
  // branch parameter for it.
  //
  // This panel used to force a single branch and auto-select the default one on
  // first load. The reasoning was that a branch is the unit a pipeline runs on,
  // so interleaving main/uat/feature runs made "did THIS branch pass?" hard to
  // read. In practice it did something worse: a student who had just pushed a
  // feature branch opened Actions, saw the runs for `main`, and concluded their
  // push had not run. GitHub shows every run and offers branch as a FILTER, and
  // the reason it gets away with that is the reason this now does too — each row
  // names its own branch, so the interleaving is legible rather than ambiguous.
  //
  // `branch` prop still honoured: a caller that opens this on a specific branch
  // gets that branch pre-filtered.

  const groups = a ? groupByCommit(a.commits, a.workflowRuns) : [];
  const hasRuns = (a?.workflowRuns.length ?? 0) > 0;

  // Newest first, by run number then by creation. `runNumber` alone is not enough:
  // a re-run keeps its number and only `runAttempt`/`createdAt` move, so two
  // attempts of one run would sort arbitrarily against each other.
  const allRuns = [...(a?.workflowRuns ?? [])].sort(
    (x, y) => y.runNumber - x.runNumber || time(y.createdAt) - time(x.createdAt),
  );

  // Pushes that triggered nothing. Derived from the commit grouping, which is now
  // used ONLY for this — the visible list is flat, like GitHub's.
  const commitsWithoutRuns = groups.filter((g) => g.runs.length === 0);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--text-strong)]">
            Actions
            {vm.isFetching && <Spinner size="sm" className="text-platform" />}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Every push runs the pipeline. Open a run to see its jobs and steps.
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

      {/* Branch filter. The branches list is deliberately rendered as a control
          rather than a row of pills: on a CI page "which branch" is a question
          you ask OF the runs, not a fact you read beside them. */}
      {a?.live && a.branches.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-4">
          <label
            htmlFor="actions-branch-filter"
            className="text-xs font-medium text-[var(--text-muted)]"
          >
            Branch
          </label>
          {/* Sized by a wrapper, not by a class on the control: Select's own
              base style is w-full, and `cn` concatenates rather than resolving
              Tailwind conflicts, so a w-auto passed in here loses and the
              picker stretched across the card for three short branch names. */}
          <div className="w-64 max-w-full">
            <Select
              id="actions-branch-filter"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              {/* First, and the default. A filter whose neutral position is
                  "everything" is the one a student can use without first knowing
                  which branch they are looking for. */}
              <option value="">All branches</option>
              {a.branches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name}
                  {b.name === a.defaultBranch ? " (default)" : ""}
                  {b.protected ? " · protected" : ""}
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}

      {vm.isLoading && (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
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
          commits and workflow runs here.
        </Banner>
      )}

      {a?.error && (
        <Banner tone="warning" className="mt-4">
          Activity couldn&rsquo;t be loaded: {a.error}
        </Banner>
      )}

      {/* An opened run REPLACES the list, the way GitHub's run page replaces its
          Actions list. Rendered before the list block so the two can never be on
          screen together, and the branch filter above stays visible so returning
          lands on the same filtered list you left. */}
      {a?.live && !a.error && openRun && (
        <div className="mt-5">
          <RunDetail repoId={repoId} run={openRun} onBack={() => setOpenRunId(null)} />
        </div>
      )}

      {/* An id that is set but no longer in the payload: the run aged out of the
          most recent 10 while it was open. Say so rather than silently showing
          the list again, which reads as the click having been ignored. */}
      {a?.live && !a.error && openRunId !== null && !openRun && (
        <Banner tone="info" className="mt-4">
          That run is no longer in this repository&rsquo;s recent activity.{" "}
          <button
            type="button"
            onClick={() => setOpenRunId(null)}
            className="font-medium underline underline-offset-2"
          >
            Back to all runs
          </button>
        </Banner>
      )}

      {a?.live && !a.error && !openRun && openRunId === null && (
        <div className="mt-5">
          {groups.length === 0 ? (
            <Banner tone="info">
              Nothing has been pushed to this repository yet. Your first push starts
              the pipeline.
            </Banner>
          ) : (
            <>
              {/* Commits but no runs at all: the push worked and CI did not
                  start, which looks identical to "CI is slow" unless said. */}
              {!hasRuns && (
                <Banner tone="warning" className="mb-4">
                  Your commits arrived, but no workflow has run on them. The
                  pipeline file may be missing, or Actions may be turned off for
                  this repository — tell your teacher.
                </Banner>
              )}
              {/* FLAT, NEWEST FIRST — GitHub's own shape.
                  This replaced a commit-grouped list (one container per commit,
                  its runs nested inside). That grouping was built to make the
                  causal link explicit for a beginner — "I pushed, therefore this
                  ran" — but it cost the thing a run list is for: scanning. Every
                  provisioning commit got a container, so six scaffold commits
                  pushed the run that mattered off the screen, and the same commit
                  message was then printed twice, once as the container and once on
                  the run inside it.
                  The causal link survives on the row: the commit message is the
                  headline and "Commit <sha> pushed by <actor>" is the subtitle. */}
              <div className="flex items-baseline justify-between gap-3 border-b border-[var(--border-subtle)] pb-2">
                <p className="text-sm font-semibold text-[var(--text-strong)]">
                  {allRuns.length} workflow {allRuns.length === 1 ? "run" : "runs"}
                </p>
              </div>
              <ul className="divide-y divide-[var(--border-subtle)]">
                {allRuns.map((run) => (
                  <RunRow
                    key={`${run.id}-${run.runAttempt}`}
                    run={run}
                    onOpen={() => setOpenRunId(run.id)}
                  />
                ))}
              </ul>

              {/* Kept, deliberately, and demoted. GitHub never shows a commit that
                  triggered nothing — it lists runs, so a push with no run is simply
                  absent. For a student that absence is indistinguishable from CI
                  being slow, and it is a real failure: the workflow file is missing
                  from the branch, or Actions is off. So it stays, as a footnote
                  under the runs instead of as containers among them. */}
              {commitsWithoutRuns.length > 0 && (
                <details className="mt-4 rounded-lg border border-[var(--border-subtle)] px-4 py-3">
                  <summary className="cursor-pointer text-xs text-[var(--text-muted)]">
                    {commitsWithoutRuns.length}{" "}
                    {commitsWithoutRuns.length === 1 ? "push" : "pushes"} ran no
                    workflow
                  </summary>
                  <ul className="mt-2 space-y-1.5">
                    {commitsWithoutRuns.map((c) => (
                      <li key={c.sha} className="text-xs text-[var(--text-muted)]">
                        <span className="font-mono">{c.sha.slice(0, 7)}</span>
                        {" · "}
                        <span className="text-[var(--text-strong)]">
                          {c.message || "(no commit message)"}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    A push with no run usually means the pipeline file is missing
                    from that branch, or Actions is turned off for this repository.
                  </p>
                </details>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// One run — collapsed to a status line, expandable to jobs and steps
// ---------------------------------------------------------------------------

function RunRow({
  run,
  onOpen,
}: {
  run: GithubWorkflowRunInfo;
  onOpen: () => void;
}) {
  const running = isRunning(run);

  // Only for a finished run. `updatedAt` moves while a run is still going, so
  // computing it live would print "took 0s" against a queued run and a shrinking
  // half-truth against a running one.
  const duration = running
    ? null
    : formatDuration(run.startedAt ?? run.createdAt, run.updatedAt);

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left transition-colors hover:bg-[var(--bg-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-platform"
      >
        <RunStatusIcon run={run} />

        {/* GitHub's two-line row. The COMMIT MESSAGE leads, because that is what
            a student recognises as "the thing I did"; the workflow identity moves
            to the second line as `AlphaCI #4: <event> by <actor>`, which is
            exactly GitHub's own phrasing and the vocabulary they will meet again. */}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-[var(--text-strong)]">
            {run.commitMessage || run.name}
          </span>
          <span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">
            {run.name}
            {run.runNumber > 0 && ` #${run.runNumber}`}
            {": "}
            {describeTrigger(run)}
            {run.runAttempt > 1 && ` (attempt ${run.runAttempt})`}
          </span>
        </span>

        {/* Branch, then time and duration — GitHub's right-hand column. Hidden
            below sm: on a phone this is four competing pieces of metadata beside
            a message that has already been truncated to make room for them. */}
        <span className="hidden shrink-0 items-center gap-3 text-xs text-[var(--text-muted)] sm:flex">
          {run.branch && (
            <span className="max-w-[10rem] truncate rounded-md bg-[var(--bg-subtle)] px-2 py-0.5 font-mono text-[11px] text-[var(--text-strong)]">
              {run.branch}
            </span>
          )}
          <time
            dateTime={run.createdAt}
            title={formatDateTime(run.createdAt)}
            className="whitespace-nowrap"
          >
            {relativeTime(run.createdAt)}
          </time>
          {duration && <span className="whitespace-nowrap">{duration}</span>}
        </span>

        {/* Points right, and stays right. It used to rotate to mark an expanded
            row; the row no longer expands, so it means "opens" — the same thing
            it means in every other list in the product. */}
        <span aria-hidden="true" className="shrink-0 text-xs text-[var(--text-muted)]">
          ›
        </span>
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// One run, opened — GitHub's run page
// ---------------------------------------------------------------------------

/**
 * The jobs and steps of a single run, with a way back to the list.
 *
 * Laid out like the page GitHub sends you to when you click a run: the run's own
 * title and number as the heading, a summary strip of the facts that describe it
 * (status, duration, branch, trigger, commit), then the jobs. A student who
 * learns this screen can read the real one.
 */
function RunDetail({
  repoId,
  run,
  onBack,
}: {
  repoId: string;
  run: GithubWorkflowRunInfo;
  onBack: () => void;
}) {
  const running = isRunning(run);

  // The newest run's jobs already arrived with the activity payload; fetching
  // them again would be a second request for bytes already held.
  const hasInlineJobs = run.jobs.length > 0;
  const lazy = useWorkflowRunJobs(repoId, run.id, {
    enabled: !hasInlineJobs,
    isRunning: running,
  });
  const jobs = hasInlineJobs ? run.jobs : lazy.data?.jobs ?? [];

  const duration = running
    ? null
    : formatDuration(run.startedAt ?? run.createdAt, run.updatedAt);

  const facts: Array<{ label: string; value: React.ReactNode }> = [
    { label: "Status", value: runLabel(run) },
    { label: "Total duration", value: duration ?? "—" },
    { label: "Branch", value: <span className="font-mono text-xs">{run.branch}</span> },
    { label: "Triggered by", value: describeTrigger(run) },
  ];

  return (
    <div>
      {/* Back FIRST in the DOM, so a keyboard user lands on the way out before
          being walked through the jobs they just left. */}
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-3">
        ← All runs
      </Button>

      <div className="flex items-start gap-3">
        <RunStatusIcon run={run} />
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-[var(--text-strong)]">
            {run.commitMessage || run.name}
          </h3>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {run.name}
            {run.runNumber > 0 && ` #${run.runNumber}`}
            {run.runAttempt > 1 && ` · attempt ${run.runAttempt}`}
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-4 py-3 sm:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="min-w-0">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
              {f.label}
            </dt>
            <dd className="mt-0.5 truncate text-sm text-[var(--text-strong)]">{f.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4">
        {lazy.isLoading && <Skeleton className="h-24 w-full rounded-lg" />}

        {lazy.error && (
          <p className="text-sm text-[var(--text-muted)]">
            Couldn&rsquo;t load this run&rsquo;s steps
            {lazy.error.isNetworkError ? " — the backend didn't answer." : "."}
          </p>
        )}

        {/* A server-side problem GitHub reported (an expired run, usually) comes
            back as a successful response carrying `error`. */}
        {lazy.data?.error && (
          <p className="text-sm text-[var(--text-muted)]">{lazy.data.error}</p>
        )}

        {!lazy.isLoading && !lazy.error && !lazy.data?.error && (
          <JobList jobs={jobs} running={running} repoId={repoId} />
        )}
      </div>
    </div>
  );
}

function JobList({
  jobs,
  running,
  repoId,
}: {
  jobs: GithubWorkflowJob[];
  running: boolean;
  repoId: string;
}) {
  if (jobs.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        {running
          ? "This run has started but no job has been picked up yet."
          : "No jobs were recorded for this run."}
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {jobs.map((job) => (
        <JobRow key={job.name} job={job} repoId={repoId} running={running} />
      ))}
    </ul>
  );
}

/**
 * One job: its steps, and its console output on demand.
 *
 * The console is COLLAPSED until asked for, and that is a data decision as much
 * as a visual one — `useJobLog` does not fetch until it is open, so a run with
 * six jobs costs one log request rather than six.
 *
 * It opens by default on a FAILED job. That is the whole point of the feature: a
 * student whose build broke should not have to discover that the answer is
 * behind one more click.
 */
function JobRow({
  job,
  repoId,
  running,
}: {
  job: GithubWorkflowJob;
  repoId: string;
  running: boolean;
}) {
  const failed = job.conclusion === "failure";
  const [open, setOpen] = useState(failed);
  const log = useJobLog(repoId, open ? job.id : null, { isRunning: running });

  return (
    <li>
          <div className="flex items-center gap-2">
            <GenericPill tone={jobTone(job)}>
              {job.status !== "completed" ? job.status.replace(/_/g, " ") : job.conclusion ?? "done"}
            </GenericPill>
            <span className="text-sm font-medium text-[var(--text-strong)]">
              {job.name}
            </span>

            {/*
              `job.id` is 0 for a run recorded before the id was carried through.
              Offering a console that cannot be fetched would be a button that
              only ever fails, so it is simply absent.
            */}
            {job.id > 0 && (
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((on) => !on)}
                className="ml-auto rounded-md px-2 py-1 text-xs font-medium text-platform transition-colors hover:bg-platform-50"
              >
                {open ? "Hide console" : "View console"}
              </button>
            )}
          </div>

          {/* Every step, not only the failing ones. A student debugging needs to
              know how far the run got before it stopped, and a list containing
              nothing but failures cannot show that. */}
          {job.steps.length > 0 && (
            <ul className="ml-1 mt-2 space-y-1">
              {job.steps.map((step) => {
                const failed = step.conclusion === "failure";
                return (
                  <li key={step.name} className="flex items-start gap-2 text-xs">
                    <StepGlyph conclusion={step.conclusion} status={step.status} />
                    <span
                      className={cn(
                        failed
                          ? "font-medium text-red-700"
                          : "text-[var(--text-muted)]",
                      )}
                    >
                      {step.name}
                      {failed && " — this is where it stopped"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

      {open && job.id > 0 && (
        <div className="ml-1 mt-3">
          <JobLogConsole
            log={log.log}
            isLoading={log.isLoading}
            error={log.error?.message ?? null}
            jobName={job.name}
            onRetry={log.refetch}
          />
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Status glyphs
// ---------------------------------------------------------------------------

const ICON_STYLES: Record<Tone, string> = {
  success: "bg-emerald-500 text-white",
  danger: "bg-red-500 text-white",
  running: "bg-sky-500 text-white animate-pulse",
  warning: "bg-amber-500 text-white",
  neutral: "bg-slate-300 text-white",
  info: "bg-platform text-white",
};

const ICON_GLYPH: Record<Tone, string> = {
  success: "✓",
  danger: "✕",
  running: "•",
  warning: "!",
  neutral: "–",
  info: "•",
};

function RunStatusIcon({ run }: { run: GithubWorkflowRunInfo }) {
  const tone = runTone(run);
  return (
    <span
      // The label carries the meaning; the glyph is decoration on top of it, so
      // a screen reader hears "failure" rather than "multiplication sign".
      role="img"
      aria-label={runLabel(run)}
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
        ICON_STYLES[tone],
      )}
    >
      <span aria-hidden="true">{ICON_GLYPH[tone]}</span>
    </span>
  );
}

function StepGlyph({
  conclusion,
  status,
}: {
  conclusion: string | null;
  status: string;
}) {
  const tone: Tone =
    status !== "completed"
      ? "running"
      : conclusion === "success"
        ? "success"
        : conclusion === "failure"
          ? "danger"
          : "neutral";

  return (
    <span
      role="img"
      aria-label={conclusion ?? status}
      className={cn(
        "mt-px flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
        ICON_STYLES[tone],
      )}
    >
      <span aria-hidden="true">{ICON_GLYPH[tone]}</span>
    </span>
  );
}
