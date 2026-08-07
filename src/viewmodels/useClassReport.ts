"use client";
// ============================================================================
// VIEWMODEL LAYER — the teacher's Report, for ONE section.
//
// Owns the section CHOICE as well as the fetch. The page needs a picker before
// it can ask for anything, and which section is selected is a reading position
// rather than a destination, so it lives here as state rather than in the URL.
//
// Sections come from useTeacherDashboard, already scoped to the selected lab —
// the same list the teacher's Home shows. Building a second query for "my
// sections" would let the picker offer a section Home does not.
// ============================================================================
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { classesApi } from "@/models/api";
import type { AttentionReason, ClassReport } from "@/models/types";
import { useTeacherDashboard } from "./useTeacherDashboard";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

export interface ReportSectionOption {
  id: string;
  /** "CS-101 · A — Intro to Programming" */
  label: string;
}

export interface ClassReportVM {
  sections: ReportSectionOption[];
  selectedId: string | null;
  select: (id: string) => void;
  data: ClassReport | undefined;
  isLoading: boolean;
  /** Sections are still loading, so there is nothing to pick from yet. */
  isLoadingSections: boolean;
  error: PresentableError | null;
  refetch: () => void;
  /**
   * Submitted as a percentage of expected, and marked as a percentage of
   * SUBMITTED — not of expected.
   *
   * Marked-over-expected would mean a teacher who has marked every single thing
   * handed in still reads as "50% marked" because half the class never handed
   * in. That is the students' backlog, not the teacher's, and the two need to be
   * separable at a glance.
   */
  rates: { submitted: number | null; marked: number | null };
}

export function useClassReport(
  teacherId: string | null,
  orgId: string | null,
): ClassReportVM {
  const dashboard = useTeacherDashboard(teacherId, orgId);
  const [chosen, setChosen] = useState<string | null>(null);

  const sections = useMemo<ReportSectionOption[]>(
    () =>
      (dashboard.data?.classes ?? []).map((c) => ({
        id: c.id,
        label: `${c.code} · ${c.section} — ${c.name}`,
      })),
    [dashboard.data],
  );

  /*
    The chosen section, or the first one.

    Derived rather than written into state by an effect. An effect that "defaults
    the selection once loaded" has to decide what to do when the lab switches and
    the chosen id is no longer in the list — and the usual answer, leaving it,
    asks the server for a section this teacher cannot see. Falling back whenever
    the id is absent handles first load and lab switching with one rule.
  */
  const selectedId =
    chosen && sections.some((s) => s.id === chosen) ? chosen : sections[0]?.id ?? null;

  const query = useQuery({
    queryKey: queryKeys.classes.report(selectedId ?? "none"),
    queryFn: () => classesApi.report(selectedId as string),
    enabled: Boolean(selectedId),
  });

  const totals = query.data?.totals;
  const rates = {
    submitted:
      totals && totals.expectedSubmissions > 0
        ? Math.round((totals.submitted / totals.expectedSubmissions) * 100)
        : null,
    marked:
      totals && totals.submitted > 0
        ? Math.round((totals.marked / totals.submitted) * 100)
        : null,
  };

  return {
    sections,
    selectedId,
    select: setChosen,
    data: query.data,
    isLoading: query.isLoading,
    isLoadingSections: dashboard.isLoading,
    error: query.error ? toPresentableError(query.error) : dashboard.error,
    refetch: () => void query.refetch(),
    rates,
  };
}

/**
 * What to call each attention reason, in the teacher's words.
 *
 * Phrased as the STUDENT'S situation, not the system's state: "Hasn't submitted"
 * tells a teacher what to do about it, where NO_SUBMISSION only tells them what
 * a column is called.
 */
export const ATTENTION_LABELS: Record<AttentionReason, string> = {
  NO_SUBMISSION: "Nothing submitted",
  AWAITING_MARK: "Waiting on you",
  LOW_AVERAGE: "Low average",
  PIPELINE_FAILING: "Pipeline failing",
};

/**
 * Which reasons are the STUDENT'S problem versus the TEACHER'S.
 *
 * AWAITING_MARK is the teacher's own backlog and must not be coloured as a
 * student at risk — a teacher scanning for red should not be sent chasing
 * someone who did everything right and is waiting on them.
 */
export const ATTENTION_IS_TEACHER_TASK: Record<AttentionReason, boolean> = {
  NO_SUBMISSION: false,
  AWAITING_MARK: true,
  LOW_AVERAGE: false,
  PIPELINE_FAILING: false,
};
