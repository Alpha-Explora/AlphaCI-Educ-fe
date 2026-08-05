"use client";
// VIEWMODEL LAYER — the console output of ONE Actions job.
//
// The companion to useWorkflowRunJobs, loaded even more lazily: the steps arrive
// when a run is opened, the LOG only when a student opens a specific job. It is
// the largest response in the product — thousands of lines — so fetching it for
// every job of every run would spend the lab's shared GitHub rate limit on
// output nobody has looked at.
//
// A FINISHED JOB'S LOG IS IMMUTABLE, which is what `staleTime: Infinity` below
// encodes. A student who opens the same failing step three times while fixing
// their code pays for it once. A job still running is the one case where the
// output grows under them, so that one polls.
import { useQuery } from "@tanstack/react-query";
import { repositoriesApi } from "@/models/api";
import type { JobLogView } from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

/** Matches the activity poll — a running job is appending as someone watches. */
const POLL_MS = 15_000;

export interface JobLogVM {
  log: JobLogView | null;
  isLoading: boolean;
  error: PresentableError | null;
  refetch: () => void;
}

export function useJobLog(
  repoId: string,
  jobId: number | null,
  opts: { isRunning: boolean },
): JobLogVM {
  const query = useQuery({
    queryKey: queryKeys.repositories.jobLog(repoId, jobId ?? 0),
    queryFn: () => repositoriesApi.jobLogs(repoId, jobId as number),
    // `jobId` is null until a student opens a job, and 0 is what a run from
    // before job ids were carried through reports — neither can be fetched.
    enabled: Boolean(jobId),
    refetchInterval: opts.isRunning ? POLL_MS : false,
    staleTime: opts.isRunning ? 0 : Infinity,
  });

  return {
    log: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? toPresentableError(query.error) : null,
    refetch: () => void query.refetch(),
  };
}
