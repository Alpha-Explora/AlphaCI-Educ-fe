"use client";
// ============================================================================
// VIEWMODEL LAYER — "you already run this section" check.
//
// A laboratory is a GitHub organization — a storage/billing shard — not a room.
// Teachers read the laboratory field as a venue and re-create a section they
// already run so it "exists in" the lab they're meeting in that day. That gives
// them two class records for one cohort: two rosters, two gradebooks, and work
// scattered between them.
//
// The backend already refuses an exact duplicate WITHIN a course (same course +
// section + term -> 400). It cannot refuse the cross-lab case, because two labs
// have genuinely separate course records — and sometimes creating both really
// is intended. So this is a WARNING, not a block: it names the section the
// teacher already has and links to it, and lets them continue if they meant it.
//
// Reads GET /classes?teacherId= with no orgId, which returns their classes
// across every laboratory — the one query that can see the collision at all.
// ============================================================================
import { useQuery } from "@tanstack/react-query";
import { classesApi } from "@/models/api";
import type { AccessibleLab, ClassCohort } from "@/models/types";
import { queryKeys } from "./queryKeys";

export interface DuplicateClassMatch {
  existing: ClassCohort;
  /** Laboratory the existing section lives in, named for the message. */
  labName: string;
  /** true when it's in the lab being created into — the backend will reject anyway. */
  isSameLab: boolean;
}

const norm = (value: string) => value.trim().toLowerCase();

export function useDuplicateClassCheck({
  teacherId,
  labs,
  courseCode,
  section,
  term,
  targetOrgId,
}: {
  teacherId: string | null;
  labs: AccessibleLab[];
  /** Code of the course being created under, e.g. "CS-301". */
  courseCode: string | null;
  section: string;
  term: string;
  /** Lab the new class would land in, so the message can say "another lab". */
  targetOrgId: string | null;
}): DuplicateClassMatch | null {
  const query = useQuery({
    queryKey: queryKeys.classes.list({ teacherId: teacherId ?? undefined }),
    queryFn: () => classesApi.list({ teacherId: teacherId as string }),
    enabled: Boolean(teacherId),
  });

  // Only meaningful once all three identifying fields are filled in — warning
  // on a half-typed section would fire on every keystroke.
  if (!courseCode || !section.trim() || !term.trim()) return null;

  const existing = (query.data ?? []).find(
    (c) =>
      norm(c.code) === norm(courseCode) &&
      norm(c.section) === norm(section) &&
      norm(c.term) === norm(term),
  );
  if (!existing) return null;

  return {
    existing,
    labName: labs.find((l) => l.id === existing.orgId)?.name ?? "another laboratory",
    isSameLab: existing.orgId === targetOrgId,
  };
}
