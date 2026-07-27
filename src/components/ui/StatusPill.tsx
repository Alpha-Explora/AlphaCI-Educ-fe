// VIEW LAYER — status pills for repo / pipeline / check / plagiarism statuses.
import { cn } from "./cn";
import type {
  CheckStatus,
  PipelineStatus,
  PlagiarismStatus,
  RepoStatus,
} from "@/models/types";

type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "running";

const TONE: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-600 ring-slate-200",
  info: "bg-platform-50 text-platform-700 ring-platform-100",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  running: "bg-sky-50 text-sky-700 ring-sky-200",
};

function Pill({
  tone,
  children,
  dot = true,
}: {
  tone: Tone;
  children: React.ReactNode;
  dot?: boolean;
}) {
  const dotColor: Record<Tone, string> = {
    neutral: "bg-slate-400",
    info: "bg-platform",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    running: "bg-sky-500",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONE[tone],
      )}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            dotColor[tone],
            tone === "running" && "animate-pulse",
          )}
        />
      )}
      {children}
    </span>
  );
}

const REPO_TONE: Record<RepoStatus, Tone> = {
  IN_PROGRESS: "info",
  SUBMITTED: "warning",
  GRADED: "success",
  ARCHIVED: "neutral",
};
const REPO_LABEL: Record<RepoStatus, string> = {
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  GRADED: "Graded",
  ARCHIVED: "Archived",
};

export function RepoStatusPill({ status }: { status: RepoStatus }) {
  return <Pill tone={REPO_TONE[status]}>{REPO_LABEL[status]}</Pill>;
}

const PIPE_TONE: Record<PipelineStatus, Tone> = {
  QUEUED: "neutral",
  RUNNING: "running",
  PASSED: "success",
  FAILED: "danger",
};
const PIPE_LABEL: Record<PipelineStatus, string> = {
  QUEUED: "Queued",
  RUNNING: "Running",
  PASSED: "Passed",
  FAILED: "Failed",
};

export function PipelineStatusPill({ status }: { status: PipelineStatus }) {
  return <Pill tone={PIPE_TONE[status]}>{PIPE_LABEL[status]}</Pill>;
}

const CHECK_TONE: Record<CheckStatus, Tone> = {
  PASS: "success",
  FAIL: "danger",
  WARN: "warning",
};
const CHECK_LABEL: Record<CheckStatus, string> = {
  PASS: "Pass",
  FAIL: "Fail",
  WARN: "Warn",
};

export function CheckStatusPill({ status }: { status: CheckStatus }) {
  return <Pill tone={CHECK_TONE[status]}>{CHECK_LABEL[status]}</Pill>;
}

export function PlagiarismPill({ status }: { status: PlagiarismStatus }) {
  return (
    <Pill tone={status === "FLAGGED" ? "danger" : "success"}>
      {status === "FLAGGED" ? "Plagiarism flagged" : "Originality clear"}
    </Pill>
  );
}

export function GenericPill({
  tone = "neutral",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <Pill tone={tone} dot={false}>
      {children}
    </Pill>
  );
}

// GithubRoleBadge (OWNER / MAINTAINER / MEMBER) was removed along with the
// team-hierarchy view: it printed the hosting provider's role vocabulary
// straight onto the admin screen. StaffRoleDirectory now describes access by
// what the person can do instead.

// Provisioning mode badge. LIVE (green) once source hosting is connected;
// SIMULATED (amber) while provisioning is mocked. Names no provider.
export function GithubModeBadge({ live }: { live: boolean }) {
  return (
    <Pill tone={live ? "success" : "warning"}>{live ? "LIVE" : "SIMULATED"}</Pill>
  );
}
