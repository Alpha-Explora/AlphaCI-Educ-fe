"use client";
// ============================================================================
// VIEW LAYER — pick a teacher who already works elsewhere on the platform.
//
// Sits above the blank form in the Add teacher dialog. Choosing someone fills
// the three fields from their existing record, which is not just a typing
// saver: the API requires an existing teacher's email AND GitHub username to
// match their record exactly, so hand-typing them is the main way an admin
// meets a 409.
//
// Presentation only — the list, the search and the fill action all come from
// useTeacherDirectory.
// ============================================================================
import { Avatar, Input, Spinner, cn } from "@/components/ui";
import type { TransferableTeacher } from "@/models/types";

export function ExistingTeacherPicker({
  teachers,
  matches,
  query,
  onQueryChange,
  isLoading,
  picked,
  onPick,
  onClear,
  disabled,
}: {
  readonly teachers: TransferableTeacher[];
  readonly matches: TransferableTeacher[];
  readonly query: string;
  readonly onQueryChange: (value: string) => void;
  readonly isLoading: boolean;
  readonly picked: TransferableTeacher | null;
  readonly onPick: (teacher: TransferableTeacher) => void;
  readonly onClear: () => void;
  readonly disabled: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5 text-sm text-[var(--text-muted)]">
        <Spinner size="sm" />
        Checking for teachers already on the platform…
      </div>
    );
  }

  // Nothing to reuse — say nothing at all rather than showing an empty box the
  // admin has to reason about before typing.
  if (teachers.length === 0 && !picked) return null;

  if (picked) {
    return (
      <div className="rounded-lg border border-platform-200 bg-platform-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar name={picked.fullName} color={picked.avatarColor} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--text-strong)]">
                {picked.fullName}
              </p>
              <p className="truncate text-xs text-[var(--text-muted)]">
                Already teaches at {picked.labNames.join(", ") || "another laboratory"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="shrink-0 text-xs font-medium text-platform-700 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform"
          >
            Choose someone else
          </button>
        </div>
        <p className="mt-2 text-xs text-platform-700">
          Their existing account and sign-in are kept — we only add them to this
          laboratory.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div>
        <label
          htmlFor="existing-teacher-search"
          className="block text-sm font-medium text-[var(--text-strong)]"
        >
          Already on the platform?
        </label>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          Pick someone who teaches at another laboratory, or type a new person
          below.
        </p>
      </div>

      {teachers.length > 5 && (
        <Input
          id="existing-teacher-search"
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search by name, email or GitHub username…"
          disabled={disabled}
        />
      )}

      <ul className="max-h-44 space-y-1 overflow-y-auto rounded-lg border border-[var(--border-subtle)] p-1">
        {matches.length === 0 ? (
          <li className="px-2.5 py-3 text-center text-xs text-[var(--text-muted)]">
            No one matches “{query.trim()}”.
          </li>
        ) : (
          matches.map((teacher) => (
            <li key={teacher.id}>
              <button
                type="button"
                onClick={() => onPick(teacher)}
                disabled={disabled}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                  "hover:bg-[var(--bg-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                <Avatar name={teacher.fullName} color={teacher.avatarColor} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[var(--text-strong)]">
                    {teacher.fullName}
                  </span>
                  <span className="block truncate text-xs text-[var(--text-muted)]">
                    {teacher.email}
                    {teacher.labNames.length > 0 && ` · ${teacher.labNames.join(", ")}`}
                  </span>
                </span>
                {teacher.githubUsername && (
                  <span
                    className="shrink-0 font-mono text-xs text-[var(--text-muted)]"
                    title={teacher.githubLinked ? "Connected" : "Invited, not connected yet"}
                  >
                    @{teacher.githubUsername}
                  </span>
                )}
              </button>
            </li>
          ))
        )}
      </ul>

      <div className="flex items-center gap-3 pt-1" aria-hidden="true">
        <span className="h-px flex-1 bg-[var(--border-subtle)]" />
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          or add someone new
        </span>
        <span className="h-px flex-1 bg-[var(--border-subtle)]" />
      </div>
    </div>
  );
}
