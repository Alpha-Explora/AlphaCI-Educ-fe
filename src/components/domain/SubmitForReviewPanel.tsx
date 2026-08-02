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
import type { MergeReadiness, PullRequestView, RepoBranch } from "@/models/types";
import {
  Banner,
  Button,
  Card,
  Field,
  GenericPill,
  Select,
  SectionHeading,
  Skeleton,
  StateBoundary,
  Textarea,
  cn,
} from "@/components/ui";

const PROTECTED_BRANCHES = ["uat", "main"] as const;

export function SubmitForReviewPanel({
  repoId,
  branches,
  audience,
  isGroup,
}: {
  repoId: string;
  branches: RepoBranch[];
  audience: "student" | "teacher";
  /** Group assignments require a teammate's approval before merging. */
  isGroup: boolean;
}) {
  const vm = usePullRequests(repoId);

  // Only branches a student could propose FROM. Offering `main` as a source
  // would produce a pull request from a branch into itself, which the server
  // rejects — better not to present it at all.
  const sourceBranches = branches.filter(
    (b) => !PROTECTED_BRANCHES.includes(b.name as (typeof PROTECTED_BRANCHES)[number]),
  );

  const [head, setHead] = useState(sourceBranches[0]?.name ?? "");
  const [base, setBase] = useState<string>("uat");

  return (
    <Card className="p-5">
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
            ) : (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Your branch">
                    {({ id }) => (
                      <Select
                        id={id}
                        value={head}
                        onChange={(e) => setHead(e.target.value)}
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
                        onChange={(e) => setBase(e.target.value)}
                      >
                        {PROTECTED_BRANCHES.map((b) => (
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
                  disabled={!head}
                >
                  Open pull request
                </Button>
                <p className="text-xs text-[var(--text-muted)]">
                  Opening a pull request does not merge anything. It asks for your
                  work to be checked first — the pipeline runs, and{" "}
                  {isGroup
                    ? "a teammate reviews it"
                    : "you merge it once the checks pass"}
                  .
                </p>
              </div>
            )}
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {vm.pullRequests.map((pr) => (
              <PullRequestRow
                key={pr.number}
                pr={pr}
                vm={vm}
                audience={audience}
                repoId={repoId}
              />
            ))}
          </ul>
        )}
      </StateBoundary>
    </Card>
  );
}

function PullRequestRow({
  pr,
  vm,
  audience,
  repoId,
}: {
  pr: PullRequestView;
  vm: ReturnType<typeof usePullRequests>;
  audience: "student" | "teacher";
  repoId: string;
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
