"use client";
// ============================================================================
// VIEW LAYER — Submit a branch for review, and merge it.
//
// This replaces GitHub's pull request UI. Students have no GitHub account, so
// there is no other route: `main` and `uat` refuse direct pushes, and a rejected
// `git push origin main` with no explanation was previously where a beginner got
// stuck with nothing to act on.
//
// The design principle throughout is that a BLOCKED merge must teach. Every
// refusal names what is wrong and what to do, because "merge is disabled" with a
// grey button is the experience this panel exists to remove.
// ============================================================================
import { useState } from "react";
import { usePullRequests } from "@/viewmodels/usePullRequests";
import { PullRequestDiff } from "./PullRequestDiff";
import { PullRequestConversation } from "./PullRequestConversation";
import { useSession } from "@/viewmodels/useSession";
import {
  BRANCH_PROMOTION_ORDER,
  GRADED_BRANCHES,
  type MergeReadiness,
  type PullRequestView,
  type RepoBranch,
  type SystemUser,
} from "@/models/types";
import {
  Banner,
  Button,
  EmptyState,
  Field,
  GenericPill,
  Select,
  PanelSurface,
  SectionHeading,
  Skeleton,
  StateBoundary,
  Textarea,
  cn,
} from "@/components/ui";

export function SubmitForReviewPanel({
  repoId,
  branches,
  audience,
  isGroup,
  surface,
}: {
  repoId: string;
  branches: RepoBranch[];
  audience: "student" | "teacher";
  /** Group assignments require a teammate's approval before merging. */
  isGroup: boolean;
  /** False when the page already supplies the card — see PanelSurface. */
  surface?: boolean;
}) {
  const vm = usePullRequests(repoId);
  // The signed-in account, for the comment thread: who may edit or delete a
  // comment is decided from it (and re-decided on the server).
  const { user: viewer } = useSession();

  // Only branches a student could propose FROM. Offering a graded branch as a
  // source would produce a pull request from a branch into itself, which the
  // server rejects — better not to present it at all.
  const sourceBranches = branches.filter((b) => !GRADED_BRANCHES.includes(b.name));

  // WHICH TARGETS EXIST, not which targets the product has names for.
  //
  // This was a hardcoded `["uat", "main"]` rendered directly, so every project
  // offered `uat` — including MAIN_ONLY projects, which have no such branch. It
  // was also the default, so a student who submitted without touching the
  // dropdown got the server's refusal ("You can only submit into main") on their
  // first ever pull request, naming a branch the dropdown had not offered them.
  //
  // Intersecting the promotion order with the repository's ACTUAL branches is
  // the whole fix, and it needs no knowledge of the strategy: a MAIN_ONLY repo
  // has no `uat` to find. It is also the pattern RepoRunsExplorer already uses
  // for the branch toggle a few sections up the same page.
  const targetBranches = BRANCH_PROMOTION_ORDER.filter((name) =>
    branches.some((b) => b.name === name),
  );

  // Null means "not chosen yet" rather than seeding state from the first render's
  // data, so a selection cannot outlive the branch that backed it. Merging moves
  // branches — and can delete the one just merged — which invalidates the
  // repository query and re-renders this panel with a different list. A value
  // captured once in useState would still be sitting in the dropdown, naming a
  // branch that no longer exists. Same sentinel pattern as useRepositoryDetail.
  const [headChoice, setHeadChoice] = useState<string | null>(null);
  const [baseChoice, setBaseChoice] = useState<string | null>(null);

  const head =
    headChoice && sourceBranches.some((b) => b.name === headChoice)
      ? headChoice
      : (sourceBranches[0]?.name ?? "");

  // Defaults to the first hop that EXISTS — `uat` on a two-stage project, `main`
  // on a one-stage one. It was the literal `"uat"`, which on a MAIN_ONLY project
  // is a branch the server refuses and the student never chose.
  const base =
    baseChoice && targetBranches.includes(baseChoice)
      ? baseChoice
      : (targetBranches[0] ?? "");

  return (
    <PanelSurface surface={surface}>
      <SectionHeading
        title="Submit for review"
        subtitle="Your work reaches main through a pull request — this is where you open and merge it."
      />

      {vm.actionError && (
        <Banner tone="error" className="mt-4">
          {vm.actionError.message}
        </Banner>
      )}

      <StateBoundary
        isLoading={vm.isLoading}
        error={vm.error}
        loadingFallback={<Skeleton className="mt-4 h-24 w-full" />}
      >
        {vm.pullRequests.length === 0 ? (
          <div className="mt-4">
            {sourceBranches.length === 0 ? (
              <Banner tone="info">
                You have no feature branches yet. Create one, push your work to
                it, then come back here to submit it.
              </Banner>
            ) : targetBranches.length === 0 ? (
              /*
                Sources but no targets. Not a state a correctly provisioned
                repository can reach — `main` exists from creation — so it means
                either the branch list could not be read from GitHub just now, or
                provisioning did not finish. Previously this rendered a dropdown
                offering `uat` and `main` regardless, and every submission was
                refused with no clue why.
              */
              <Banner tone="warning">
                This project has no branch to submit into yet. Its <code>main</code>{" "}
                branch could not be read — reload in a moment, and tell your
                teacher if it keeps happening.
              </Banner>
            ) : (
              <div className="space-y-5">
                {/*
                  SAY THAT THE LIST IS EMPTY, rather than only offering the form.

                  This tab used to render a bare pair of dropdowns on an
                  otherwise blank page, which reads as "something failed to
                  load" — there was nothing to tell a student whether they were
                  looking at an empty list or a broken one.

                  It matters most straight after a merge. The list is GitHub's
                  OPEN pull requests only (the API call fixes `state=open`), so a
                  merged pull request leaves it and the tab a student was just
                  working in goes blank. Without this, the most common reading of
                  a successful merge is that the merge lost the work.
                */}
                <EmptyState
                  icon="🔀"
                  title="No pull requests open"
                  description="Nothing is waiting for review right now. Anything you already merged has left this list — that is what a finished pull request looks like."
                />

                {/* Ruled off, and labelled. Inside one card a gap alone does not
                    say that the notice above is a STATUS and this is an ACTION. */}
                <div className="space-y-3 border-t border-[var(--border-subtle)] pt-5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                    Open a pull request
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Your branch">
                      {({ id }) => (
                        <Select
                          id={id}
                          value={head}
                          onChange={(e) => setHeadChoice(e.target.value)}
                        >
                          {sourceBranches.map((b) => (
                            <option key={b.name} value={b.name}>
                              {b.name}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Field>
                    <Field label="Merge into">
                      {({ id }) => (
                        <Select
                          id={id}
                          value={base}
                          onChange={(e) => setBaseChoice(e.target.value)}
                        >
                          {targetBranches.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Field>
                  </div>
                  <Button
                    onClick={() => vm.open({ head, base })}
                    loading={vm.isOpening}
                    disabled={!head || !base}
                  >
                    Open pull request
                  </Button>
                  <p className="text-xs text-[var(--text-muted)]">
                    Opening a pull request does not merge anything. It asks for
                    your work to be checked first — the pipeline runs, and{" "}
                    {isGroup
                      ? "a teammate reviews it"
                      : "you merge it once the checks pass"}
                    .
                    {/*
                      The promotion path, spelled out, and only when there IS one.
                      A two-stage project is the case where "merge into uat" looks
                      like a detour — saying where it leads is the difference
                      between a confusing extra step and the lesson the setting
                      exists to teach. Read off the branches that exist, so it
                      cannot contradict the dropdown beside it.
                    */}
                    {targetBranches.length > 1 && (
                      <>
                        {" "}
                        Work reaches <code>main</code> through{" "}
                        <code>{targetBranches[0]}</code> first — one pull request
                        per hop, each checked by the pipeline.
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4">
            {/* Counted and labelled OPEN, matching the "N workflow runs" header
                on the Actions tab. It also names what this list is: the API call
                behind it fixes `state=open`, so a merged pull request is absent
                rather than listed as done, and a student who is not told that
                reads the shrinking list as work disappearing. */}
            <p className="border-b border-[var(--border-subtle)] pb-2 text-sm font-semibold text-[var(--text-strong)]">
              {vm.pullRequests.length} open pull{" "}
              {vm.pullRequests.length === 1 ? "request" : "requests"}
            </p>
            <ul className="mt-4 space-y-4">
              {vm.pullRequests.map((pr) => (
                <PullRequestRow
                  key={pr.number}
                  pr={pr}
                  vm={vm}
                  audience={audience}
                  repoId={repoId}
                  viewer={viewer}
                />
              ))}
            </ul>
          </div>
        )}
      </StateBoundary>
    </PanelSurface>
  );
}

function PullRequestRow({
  pr,
  vm,
  audience,
  repoId,
  viewer,
}: {
  pr: PullRequestView;
  vm: ReturnType<typeof usePullRequests>;
  audience: "student" | "teacher";
  repoId: string;
  /** Who is reading — decides which comment controls are drawn. */
  viewer: SystemUser | null;
}) {
  const [reason, setReason] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  // Collapsed by default, and only mounted when open: a diff is a per-file GitHub
  // read, so fetching one for every listed pull request on page load would be
  // several requests nobody asked for.
  const [showDiff, setShowDiff] = useState(false);
  const r = pr.readiness;

  // "Failed" and "never arrived" need different words. Telling a teacher to
  // override a failing pipeline, when the pipeline passed on GitHub and only
  // the report did not reach this server, describes the wrong incident — and
  // it is the one they are most likely to have to act on.
  const noResult = r.pipeline.status === "none";

  return (
    <li className="rounded-lg border border-[var(--border-subtle)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-strong)]">
            #{pr.number} {pr.title}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            <code>{pr.head}</code> → <code>{pr.base}</code>
            {pr.openedByName && <> · submitted by {pr.openedByName}</>}
            {" · "}
            {pr.headSha.slice(0, 7)}
          </p>
        </div>
        <GenericPill tone={r.canMerge ? "success" : "warning"}>
          {r.canMerge ? "Ready to merge" : "Not ready"}
        </GenericPill>
      </div>

      {/*
        `mergeable` is passed separately because it belongs to the pull request,
        not to the policy: GitHub computes it lazily and reports null while it is
        still working, which is "checking", not "conflicts".
      */}
      <ReadinessChecklist readiness={r} mergeable={pr.mergeable} />

      {r.blockers.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {r.blockers.map((b) => (
            <li
              key={b}
              className="flex gap-2 text-sm text-[var(--text-muted)]"
            >
              <span aria-hidden="true" className="text-amber-600">
                !
              </span>
              {b}
            </li>
          ))}
        </ul>
      )}

      {/*
        A merge refusal comes back as a successful response with a reason, so it
        is rendered here rather than in the error banner — "here is what to fix"
        rather than "something broke".
      */}
      {vm.lastMergeMessage && (
        <Banner tone="info" className="mt-3">
          {vm.lastMergeMessage}
        </Banner>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          onClick={() => vm.merge({ number: pr.number })}
          loading={vm.isMerging}
          disabled={!r.canMerge}
        >
          Merge into {pr.base}
        </Button>

        {/*
          Approval is offered to anyone viewing who is not the submitter — the
          server rejects self-approval, so this button is safe to show broadly
          and the refusal is authoritative.
        */}
        {r.review.required && !r.review.satisfied && (
          <Button
            variant="secondary"
            onClick={() => vm.approve(pr.number)}
            loading={vm.isApproving}
          >
            Approve this commit
          </Button>
        )}

        {audience === "teacher" && r.needsTeacher && (
          <Button variant="secondary" onClick={() => setShowOverride((v) => !v)}>
            {noResult ? "Merge without a pipeline result" : "Override the failing pipeline"}
          </Button>
        )}

        {/*
          The diff is read HERE, not on GitHub. Students have no account there, so
          for a teammate reviewing a group submission this is the only place the
          change is visible at all.
        */}
        <Button variant="secondary" onClick={() => setShowDiff((v) => !v)}>
          {showDiff ? "Hide changes" : "Review changes"}
        </Button>
      </div>

      {showDiff && (
        <div className="mt-4">
          <PullRequestDiff repoId={repoId} number={pr.number} />
        </div>
      )}

      {/*
        The conversation, always shown rather than behind a toggle.

        The diff is collapsed because it costs a per-file GitHub read; a comment
        thread is a single local query, and hiding it would hide the one place a
        teacher's feedback lives. A student who has been asked to change
        something must not have to go looking for the request.
      */}
      <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
        <PullRequestConversation repoId={repoId} number={pr.number} viewer={viewer} />
      </div>

      {audience === "teacher" && showOverride && (
        <div className="mt-3 space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
          <p className="text-xs text-amber-900">
            {noResult
              ? "This merges a commit AlphaCI holds no pipeline result for. Check the run on GitHub first — this does not mean the checks passed, only that nothing was reported here."
              : "This merges a commit whose pipeline did not pass."}{" "}
            It is recorded against your account with the reason below. It does{" "}
            <strong>not</strong> bypass peer review.
          </p>
          <Field label="Reason">
            {({ id }) => (
              <Textarea
                id={id}
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  noResult
                    ? "e.g. checks green on GitHub, results not reaching AlphaCI — reporting URL being fixed"
                    : "e.g. hidden test 3 was broken; fixed for the next assignment"
                }
              />
            )}
          </Field>
          <Button
            onClick={() => vm.merge({ number: pr.number, override: true, reason })}
            loading={vm.isMerging}
            disabled={reason.trim().length === 0}
          >
            Merge anyway
          </Button>
        </div>
      )}
    </li>
  );
}

/** The three gates, always all shown — a student should see what is left. */
function ReadinessChecklist({
  readiness,
  mergeable,
}: {
  readiness: MergeReadiness;
  mergeable: boolean | null;
}) {
  const pipelineLabel = {
    passing: "Pipeline passed",
    failing: "Pipeline failed",
    none: "Pipeline has not finished for this commit",
  }[readiness.pipeline.status];

  const items: { ok: boolean; label: string }[] = [
    { ok: readiness.pipeline.status === "passing", label: pipelineLabel },
  ];

  if (readiness.review.required) {
    items.push({
      ok: readiness.review.satisfied,
      label: readiness.review.satisfied
        ? `Reviewed by ${readiness.review.approvals.map((a) => a.name).join(", ")}`
        : "Waiting for a teammate's review",
    });
  }

  // Only an explicit `false` is a conflict. `null` means GitHub has not finished
  // computing mergeability — telling a student their branch conflicts when it
  // might not is worse than saying nothing yet.
  const conflictLabel = {
    true: "No conflicts with the target branch",
    false: "Conflicts with the target branch",
    null: "Checking for conflicts",
  }[String(mergeable) as "true" | "false" | "null"];

  items.push({ ok: mergeable === true, label: conflictLabel });

  return (
    <ul className="mt-3 space-y-1.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2 text-sm">
          <span
            aria-hidden="true"
            className={cn(
              "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white",
              item.ok ? "bg-emerald-500" : "bg-slate-300",
            )}
          >
            {item.ok ? "✓" : "·"}
          </span>
          <span
            className={
              item.ok
                ? "text-[var(--text-muted)]"
                : "text-[var(--text-muted)]"
            }
          >
            {item.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
