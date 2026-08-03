"use client";
// ============================================================================
// VIEW LAYER — the teacher's project list for one class.
//
// Collapsing the rows (see TeacherProjectRow) fixed the height of the page. This
// component fixes the other half of the same problem: with a term's worth of
// projects, a short list of closed rows is still a list you have to READ to find
// anything in.
//
// So there is a filter, and it appears only once there are enough projects for
// scanning to be work. Below that threshold a search box is furniture — it asks
// the teacher to look at a control that cannot help them, on a list they can
// already see all of.
//
// The filter matches title AND description because teachers name projects
// tersely ("Lab 4") and put the actual subject in the description. Matching only
// the title would send someone searching "recursion" away empty from a project
// that is entirely about recursion.
// ============================================================================
import { useMemo, useState } from "react";
import type { Assignment, SystemUser } from "@/models/types";
import type { ClassAssignmentsVM } from "@/viewmodels/useClassAssignments";
import { Input } from "@/components/ui";
import { TeacherProjectRow } from "./TeacherProjectRow";

/**
 * Below this many projects the list is scannable as-is and the filter is hidden.
 * Six is about one screenful of collapsed rows.
 */
const FILTER_THRESHOLD = 6;

export function TeacherProjectList({
  assignments,
  sectionLabel,
  usersById,
  vm,
}: Readonly<{
  assignments: Assignment[];
  sectionLabel: string;
  usersById: Record<string, SystemUser>;
  vm: ClassAssignmentsVM;
}>) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return assignments;
    return assignments.filter(
      (a) =>
        a.title.toLowerCase().includes(needle) ||
        a.description.toLowerCase().includes(needle),
    );
  }, [assignments, query]);

  const showFilter = assignments.length >= FILTER_THRESHOLD;

  return (
    <div className="space-y-3">
      {showFilter && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[14rem] flex-1">
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter projects by name or description…"
              aria-label="Filter projects"
            />
          </div>
          {/* A count, not a spinner: filtering is synchronous over data already
              in memory, so the only thing worth reporting is how much of the
              list is left. */}
          <p className="text-xs text-[var(--text-muted)]" aria-live="polite">
            {filtered.length === assignments.length
              ? `${assignments.length} projects`
              : `${filtered.length} of ${assignments.length} projects`}
          </p>
        </div>
      )}

      {filtered.length === 0 ? (
        // Not the page-level EmptyState: the class HAS projects, the filter just
        // excluded them all, and telling a teacher "no assignments yet" here
        // would be a lie they might act on.
        <p className="rounded-xl border border-dashed border-[var(--border-subtle)] px-5 py-8 text-center text-sm text-[var(--text-muted)]">
          No project matches &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <TeacherProjectRow
              key={a.id}
              assignment={a}
              sectionLabel={sectionLabel}
              usersById={usersById}
              vm={vm}
            />
          ))}
        </div>
      )}
    </div>
  );
}
