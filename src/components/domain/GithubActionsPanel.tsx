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
// TWO SCREENS, NOT ONE SCROLL. A flat list of runs, newest first, and — when a
// run is opened — GitHub's run page: the jobs in a rail down the left, the
// selected job's steps and console output in the panel beside it. Both replace
// earlier accordion designs, and for the same reason each time: nesting a run
// inside a commit, then a job inside a run, then a 500-line console inside a
// job meant the deeper you looked the narrower the column got, and the thing a
// student actually came for — the compiler error — ended up in the thinnest
// column on the page, several screens below the fold.
//
// A commit with no run is still reported, as a footnote under the runs.
// "Nothing happened" is a result a student needs to see: it means the push
// landed but no workflow matched it, which is otherwise an invisible failure
// that looks like CI being slow.
//
// Data/polling live in useRepoActivity; per-run jobs load on open via
// useWorkflowRunJobs and a job's console via useJobLog, so a page showing ten
// runs still costs one request and an opened run costs at most one log.
// ============================================================================
import { useRef, useState } from "react";
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
 * One run, opened: the run's own facts, its jobs in a rail, and the selected
 * job's steps and console beside them.
 *
 * Laid out like the page GitHub sends you to when you click a run, because a
 * student who learns this screen can read the real one — and because the shape
 * is the right one on its own merits. A run is a SET of jobs of which usually
 * exactly one matters, so the jobs belong in a narrow index and the one you
 * picked belongs in the wide column. The previous stacked version gave every
 * job the full width whether or not you were reading it, and put the console —
 * the widest artefact in the product, and the reason anyone opens a run — at
 * the bottom of the tallest one.
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

  // WHICH JOB IS OPEN — by name, not by `job.id`.
  //
  // `job.id` is 0 on any run recorded before the id was carried through, so on
  // such a run every job would share one key and selecting any of them would
  // select all. The name is what this list is already keyed on and GitHub
  // requires job names to be unique within a run.
  //
  // Null means "nothing chosen yet" rather than seeding state from the first
  // render's data — same sentinel pattern as the branch filter above. This
  // component polls while a run is live, so a name written into state on load
  // could outlive the job that carried it.
  const [jobChoice, setJobChoice] = useState<string | null>(null);

  // Opens on the FAILURE, and stays wherever the student put it afterwards.
  //
  // Derived on every render rather than written into state once, so a run being
  // watched live moves its own selection onto the job that breaks — while an
  // explicit click still wins, because `jobChoice` is consulted first. A
  // student arrives here with one question, and the answer is never in a job
  // that passed.
  const failedJob = jobs.find((j) => j.conclusion === "failure");
  const selected =
    jobs.find((j) => j.name === jobChoice) ?? failedJob ?? jobs[0] ?? null;
  const selectedIndex = selected ? jobs.indexOf(selected) : -1;

  const duration = running
    ? null
    : formatDuration(run.startedAt ?? run.createdAt, run.updatedAt);

  const facts: Array<{ label: string; value: React.ReactNode }> = [
    { label: "Status", value: runLabel(run) },
    { label: "Total duration", value: duration ?? "—" },
    { label: "Branch", value: <span className="font-mono text-xs">{run.branch}</span> },
    { label: "Triggered by", value: describeTrigger(run) },
  ];

  const jobsUnavailable =
    lazy.isLoading || Boolean(lazy.error) || Boolean(lazy.data?.error);

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

      {lazy.isLoading && <Skeleton className="mt-4 h-64 w-full rounded-lg" />}

      {lazy.error && (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Couldn&rsquo;t load this run&rsquo;s steps
          {lazy.error.isNetworkError ? " — the backend didn't answer." : "."}
        </p>
      )}

      {/* A server-side problem GitHub reported (an expired run, usually) comes
          back as a successful response carrying `error`. */}
      {lazy.data?.error && (
        <p className="mt-4 text-sm text-[var(--text-muted)]">{lazy.data.error}</p>
      )}

      {!jobsUnavailable && jobs.length === 0 && (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          {running
            ? "This run has started but no job has been picked up yet."
            : "No jobs were recorded for this run."}
        </p>
      )}

      {/*
        THE TWO PANES. `items-start` so the rail can be sticky — a stretched
        flex child is already as tall as the scroll area and has nowhere to
        stick to (the same constraint SideTabs documents).

        `min-w-0` on the right pane is load-bearing, not tidiness: a flex item
        defaults to `min-width: auto`, which means it refuses to shrink below
        its content. A 300-character stack trace inside would push the pane
        wider than the card and take the whole page's horizontal scrollbar with
        it, instead of scrolling inside the console where it belongs.
      */}
      {!jobsUnavailable && jobs.length > 0 && selected && (
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start">
          <JobRail
            jobs={jobs}
            selectedIndex={selectedIndex}
            onSelect={setJobChoice}
          />
          {/* Keyed on the job, so switching jobs REMOUNTS the pane. The console
              holds its own view state — an "Errors only" filter and a scroll
              position parked on the previous job's failure — and carrying that
              across to a different job's output would silently misrepresent
              it. */}
          <JobPane
            key={selected.name}
            job={selected}
            repoId={repoId}
            running={running}
            labelledBy={`runjob-tab-${selectedIndex}`}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The jobs rail
// ---------------------------------------------------------------------------

/**
 * The one line about a job worth reading BEFORE opening it.
 *
 * On a failure that is where it stopped. A rail that only repeats "failure"
 * makes you open a job to learn what the index should have told you, and on a
 * run whose jobs are named `alphaci / ⓵ Sandbox — Boot & parse` the name alone
 * says nothing about the outcome.
 */
function jobSummary(job: GithubWorkflowJob): string {
  if (job.status !== "completed") {
    const active = job.steps.find((s) => s.status === "in_progress");
    return active ? `running ${active.name}` : job.status.replace(/_/g, " ");
  }
  const broke = job.steps.find((s) => s.conclusion === "failure");
  if (broke) return `stopped at ${broke.name}`;
  const ran = job.steps.length;
  return ran > 0 ? `${ran} ${ran === 1 ? "step" : "steps"}` : "no steps recorded";
}

/**
 * The jobs of a run, as a vertical tablist.
 *
 * A tablist and not a list of links, because that is what it behaves like: one
 * of N selected, swapping the panel beside it, no navigation. Modelled on
 * SideTabs — Up/Down rather than Left/Right, wrapping at both ends, follow-focus
 * — but not built on it, because SideTabs takes a plain string label and the
 * whole point of this rail is the status glyph and the summary line under each
 * name.
 *
 * NEUTRAL SURFACE, where SideTabs is brand-tinted. Every row here already
 * carries a colour that means something (emerald passed, red failed, sky
 * running); laying them on a blue tint puts the chrome in competition with the
 * only signal on the screen. So the rail recedes and the statuses carry the
 * colour.
 */
function JobRail({
  jobs,
  selectedIndex,
  onSelect,
}: {
  readonly jobs: GithubWorkflowJob[];
  readonly selectedIndex: number;
  readonly onSelect: (name: string) => void;
}) {
  const refs = useRef<Record<number, HTMLButtonElement | null>>({});

  function onKeyDown(event: React.KeyboardEvent) {
    const delta =
      event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    let next = -1;

    if (delta !== 0) {
      // Wrap around — the ARIA pattern expects a ring, not a dead end.
      next = (selectedIndex + delta + jobs.length) % jobs.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = jobs.length - 1;
    }
    if (next < 0) return;

    event.preventDefault();
    onSelect(jobs[next].name);
    // Follow-focus: with automatic activation the focused tab IS the selected
    // one, so focus has to move with the selection or the next arrow press
    // would start over from the old tab.
    refs.current[next]?.focus();
  }

  return (
    <div
      className={cn(
        "w-full shrink-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-2",
        // Sticky, so the rail is still there after scrolling a long console.
        // Needs the parent row to be items-start — a stretched flex child is
        // already as tall as the scroll area and has nowhere to stick to.
        "lg:sticky lg:top-6 lg:w-72",
        // Capped and scrollable, because a run's job count is not small: the
        // master pipeline has fifteen. A rail taller than the viewport cannot
        // stick to anything and would take its own bottom half off-screen with
        // no way back to it.
        "lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto",
      )}
    >
      <p className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
        {jobs.length} {jobs.length === 1 ? "job" : "jobs"}
      </p>
      <div
        role="tablist"
        aria-label="Jobs in this run"
        aria-orientation="vertical"
        onKeyDown={onKeyDown}
        className="flex flex-col gap-0.5"
      >
        {jobs.map((job, index) => {
          const isSelected = index === selectedIndex;
          return (
            <button
              key={job.name}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="tab"
              // Indexed rather than named: a job name carries spaces, slashes
              // and em dashes, none of which belong in an id another attribute
              // has to point at.
              id={`runjob-tab-${index}`}
              aria-selected={isSelected}
              aria-controls="runjob-panel"
              // Only the selected tab is reachable by Tab; arrows do the rest.
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onSelect(job.name)}
              className={cn(
                // The left border is always present — transparent when
                // unselected — so the selected accent bar never shifts the
                // label's horizontal position.
                "flex w-full items-start gap-2 rounded-lg border-l-[3px] px-2 py-2 text-left transition-colors",
                "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-platform",
                isSelected
                  ? "border-platform bg-[var(--bg-surface)] shadow-sm"
                  : "border-transparent hover:bg-[var(--border-subtle)]",
              )}
            >
              <JobStatusIcon job={job} />
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block truncate text-xs",
                    isSelected
                      ? "font-semibold text-[var(--text-strong)]"
                      : "font-medium text-[var(--text-strong)]",
                  )}
                  // The names are long and the rail is narrow, so the full one
                  // has to be reachable somehow.
                  title={job.name}
                >
                  {job.name}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block truncate text-[11px]",
                    job.conclusion === "failure"
                      ? "text-red-700"
                      : "text-[var(--text-muted)]",
                  )}
                >
                  {jobSummary(job)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The selected job — steps, then console
// ---------------------------------------------------------------------------

/**
 * One job in full: its steps, then its console output.
 *
 * THE CONSOLE IS NO LONGER BEHIND A CLICK. It used to be collapsed per job, and
 * that was a data decision as much as a visual one — six stacked jobs could
 * otherwise have meant six log fetches. Selecting one job at a time removes the
 * problem the collapse was solving: at most one log is ever in flight, which is
 * fewer than the old layout fetched the moment a run had two failing jobs
 * (both auto-opened). And a finished job's log is immutable, so `useJobLog`
 * caches it forever and coming back to a job costs nothing.
 *
 * Steps stay above it rather than being replaced by it. "How far did it get"
 * and "what did it say" are two different questions and a student debugging
 * needs both — the step list is the map, the console is the transcript.
 */
function JobPane({
  job,
  repoId,
  running,
  labelledBy,
}: {
  readonly job: GithubWorkflowJob;
  readonly repoId: string;
  readonly running: boolean;
  /** The rail tab that names this panel, for the tabs ARIA contract. */
  readonly labelledBy: string;
}) {
  // `job.id` is 0 on a run recorded before the id was carried through — there is
  // no log endpoint to call for it, and `useJobLog` treats 0 as "don't fetch".
  const hasLog = job.id > 0;
  const log = useJobLog(repoId, hasLog ? job.id : null, { isRunning: running });

  return (
    <div
      id="runjob-panel"
      role="tabpanel"
      aria-labelledby={labelledBy}
      // Focusable so the follow-focus arrow keys in the rail can be followed by
      // a Tab into the panel that just changed under them.
      tabIndex={-1}
      className="min-w-0 flex-1"
    >
      <div className="flex flex-wrap items-center gap-2">
        <GenericPill tone={jobTone(job)}>
          {job.status !== "completed"
            ? job.status.replace(/_/g, " ")
            : job.conclusion ?? "done"}
        </GenericPill>
        <h4 className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-strong)]">
          {job.name}
        </h4>
      </div>

      {/* Every step, not only the failing ones. A student debugging needs to
          know how far the run got before it stopped, and a list containing
          nothing but failures cannot show that.

          Numbered, because that is how a step is referred to out loud ("it died
          on step 6") and the numbers are GitHub's own — the API returns steps in
          execution order. */}
      {job.steps.length > 0 && (
        <ol className="mt-3 divide-y divide-[var(--border-subtle)] overflow-hidden rounded-lg border border-[var(--border-subtle)]">
          {job.steps.map((step, index) => {
            const failed = step.conclusion === "failure";
            return (
              <li
                key={step.name}
                className={cn(
                  "flex items-start gap-2 px-3 py-1.5 text-xs",
                  failed && "bg-red-50",
                )}
              >
                <span className="w-4 shrink-0 select-none text-right tabular-nums text-[var(--text-muted)]">
                  {index + 1}
                </span>
                <StepGlyph conclusion={step.conclusion} status={step.status} />
                <span
                  className={cn(
                    "min-w-0",
                    failed ? "font-medium text-red-700" : "text-[var(--text-muted)]",
                  )}
                >
                  {step.name}
                  {failed && " — this is where it stopped"}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-4">
        {hasLog ? (
          <JobLogConsole
            log={log.log}
            isLoading={log.isLoading}
            error={log.error?.message ?? null}
            onRetry={log.refetch}
          />
        ) : (
          <p className="rounded-lg bg-[var(--bg-subtle)] px-4 py-3 text-sm text-[var(--text-muted)]">
            This run was recorded before console output was kept, so there is no
            log to show for it. A new run will have one.
          </p>
        )}
      </div>
    </div>
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

/** The run glyph's sibling, for a job. Same size, so the rail lines up. */
function JobStatusIcon({ job }: { readonly job: GithubWorkflowJob }) {
  const tone = jobTone(job);
  const label =
    job.status !== "completed" ? job.status.replace(/_/g, " ") : job.conclusion ?? "completed";

  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        "mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
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
