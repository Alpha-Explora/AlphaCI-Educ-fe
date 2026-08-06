"use client";
// ============================================================================
// VIEW LAYER — the diff of one pull request
//
// A pull request you cannot read the diff of is not a code review. Students have
// no GitHub account, so for a teammate reviewing a group submission this is the
// ONLY place the change can be seen — and for a teacher it removes the trip to a
// site the student cannot visit.
//
// TWO VIEWS, because they answer different questions.
//
//   UNIFIED is the default: one column, the shape a patch already has, and the
//   one that survives a narrow screen. It answers "what changed here".
//
//   SPLIT puts base and head side by side. It answers "what was this line
//   BEFORE", which is the question a review actually asks and which one column
//   cannot show — a replacement is a block of removals followed some rows later
//   by a block of additions, and the eye has to hold the pair itself.
//
// This file used to render the raw patch text and argue against side-by-side, on
// the grounds that re-deriving per-side line numbers is easy to get subtly wrong.
// That caution was right and it is an argument for TESTING the derivation, not
// for going without it: the arithmetic now lives in models/diff.ts as pure
// functions over a string, checked against a real patch, and this file only
// renders what they return.
//
// LINE NUMBERS IN BOTH VIEWS. "It broke on line 42" is the sentence a teacher
// says to a student; before this the reader had to count rows by hand.
// ============================================================================
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { repositoriesApi } from "@/models/api";
import type { PullRequestFile } from "@/models/types";
import {
  gutterWidth,
  parseUnifiedPatch,
  toSplitRows,
  type SplitCell,
  type UnifiedRow,
} from "@/models/diff";
import { queryKeys } from "@/viewmodels/queryKeys";
import { toPresentableError } from "@/viewmodels/errors";
import { Banner, Skeleton, StateBoundary, cn } from "@/components/ui";

type DiffView = "unified" | "split";

export function PullRequestDiff({
  repoId,
  number,
}: {
  repoId: string;
  number: number;
}) {
  const [view, setView] = useState<DiffView>("unified");

  const query = useQuery({
    queryKey: queryKeys.repositories.pullRequestFiles(repoId, number),
    queryFn: () => repositoriesApi.pullRequestFiles(repoId, number),
  });

  const files = query.data ?? [];
  const additions = files.reduce((n, f) => n + f.additions, 0);
  const deletions = files.reduce((n, f) => n + f.deletions, 0);

  return (
    <StateBoundary
      isLoading={query.isLoading}
      error={query.error ? toPresentableError(query.error) : null}
      isEmpty={query.data?.length === 0}
      emptyFallback={
        <Banner tone="info">
          This pull request changes no files — the branch has nothing the target
          does not already have.
        </Banner>
      }
      loadingFallback={<Skeleton className="h-32 w-full" />}
    >
      <div className="space-y-3">
        {/* What the whole change amounts to, before any of it is read. A reviewer
            deciding whether this is a five-line fix or a rewrite should not have
            to scroll the files to find out. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-muted)]">
            <span className="font-medium text-[var(--text-strong)]">
              {files.length} {files.length === 1 ? "file" : "files"} changed
            </span>{" "}
            <span className="tabular-nums text-emerald-700">+{additions}</span>{" "}
            <span className="tabular-nums text-rose-700">−{deletions}</span>
          </p>
          <ViewToggle value={view} onChange={setView} />
        </div>

        {files.map((file) => (
          <FileDiff key={file.filename} file={file} view={view} />
        ))}
      </div>
    </StateBoundary>
  );
}

/**
 * `aria-pressed` buttons rather than a tablist.
 *
 * These do not switch between panels of different content — the same diff is
 * drawn either way — so they are two toggle buttons reporting their own state,
 * which is what a screen reader should hear. A tablist would announce a
 * navigation that is not happening.
 */
function ViewToggle({
  value,
  onChange,
}: {
  value: DiffView;
  onChange: (v: DiffView) => void;
}) {
  const OPTIONS: ReadonlyArray<{ id: DiffView; label: string }> = [
    { id: "unified", label: "Unified" },
    { id: "split", label: "Side by side" },
  ];

  return (
    <div className="inline-flex shrink-0 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0.5">
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform",
            value === option.id
              ? "bg-platform-50 text-platform-700"
              : "text-[var(--text-muted)] hover:text-[var(--text-strong)]",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function FileDiff({
  file,
  view,
}: {
  file: PullRequestFile;
  view: DiffView;
}) {
  const rows = file.patch === null ? [] : parseUnifiedPatch(file.patch);
  // `ch` so the gutter is sized in DIGITS of the monospace face it contains,
  // which is the only unit that stays correct when the font scales.
  const gutter = `${gutterWidth(rows) + 1}ch`;

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-slate-50/60 px-3 py-2">
        <span className="truncate font-mono text-xs font-medium text-[var(--text-strong)]">
          {file.filename}
        </span>
        <span className="flex shrink-0 items-center gap-2 text-xs tabular-nums">
          <span className="text-emerald-700">+{file.additions}</span>
          <span className="text-rose-700">−{file.deletions}</span>
          <span className="rounded bg-white px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)] ring-1 ring-inset ring-[var(--border-subtle)]">
            {file.status}
          </span>
        </span>
      </div>

      {file.patch === null ? (
        <p className="px-3 py-3 text-xs text-[var(--text-muted)]">
          No text diff available — this file is binary, or the change is too large
          for GitHub to render inline.
        </p>
      ) : (
        <div className="max-h-96 overflow-auto">
          {view === "unified" ? (
            <UnifiedTable rows={rows} gutter={gutter} />
          ) : (
            <SplitTable rows={rows} gutter={gutter} />
          )}
        </div>
      )}
    </div>
  );
}

function UnifiedTable({
  rows,
  gutter,
}: {
  rows: UnifiedRow[];
  gutter: string;
}) {
  return (
    <table className="w-full border-collapse font-mono text-xs">
      <tbody>
        {rows.map((row, idx) => {
          if (row.kind === "hunk" || row.kind === "meta") {
            return (
              <tr key={idx} className={rowTone(row.kind)}>
                <td colSpan={3} className="whitespace-pre px-3 py-0.5">
                  {row.text}
                </td>
              </tr>
            );
          }
          return (
            <tr key={idx} className={rowTone(row.kind)}>
              <LineNo no={row.oldNo} width={gutter} />
              <LineNo no={row.newNo} width={gutter} />
              <td className="whitespace-pre px-3 py-0.5">
                {/* The marker is re-added rather than kept in `text`: the parser
                    strips it so the two columns of the split view do not each
                    show a stray +/-, and unified is the one place it belongs. */}
                {markerFor(row.kind)}
                {row.text || " "}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function SplitTable({ rows, gutter }: { rows: UnifiedRow[]; gutter: string }) {
  const split = toSplitRows(rows);

  return (
    <table className="w-full border-collapse font-mono text-xs">
      <colgroup>
        <col style={{ width: gutter }} />
        <col className="w-1/2" />
        <col style={{ width: gutter }} />
        <col className="w-1/2" />
      </colgroup>
      <tbody>
        {split.map((row, idx) => {
          if (row.kind === "hunk" || row.kind === "meta") {
            return (
              <tr key={idx} className={rowTone(row.kind)}>
                <td colSpan={4} className="whitespace-pre px-3 py-0.5">
                  {row.text}
                </td>
              </tr>
            );
          }
          return (
            <tr key={idx}>
              <Side cell={row.left!} width={gutter} />
              {/* The divider lives on the right column's left edge so the two
                  halves read as two files rather than one wide one. */}
              <Side cell={row.right!} width={gutter} divider />
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** One half of a split row: its line number and its text, toned together. */
function Side({
  cell,
  width,
  divider = false,
}: {
  cell: SplitCell;
  width: string;
  divider?: boolean;
}) {
  const tone =
    cell.kind === "add"
      ? "bg-emerald-50 text-emerald-900"
      : cell.kind === "del"
        ? "bg-rose-50 text-rose-900"
        : cell.kind === "empty"
          ? "bg-slate-50/60"
          : "text-[var(--text-strong)]";

  return (
    <>
      <td
        style={{ width }}
        className={cn(
          "select-none border-r border-[var(--border-subtle)] px-1 py-0.5 text-right align-top tabular-nums text-[var(--text-muted)]",
          divider && "border-l",
          tone,
        )}
      >
        {cell.no ?? ""}
      </td>
      <td className={cn("whitespace-pre px-3 py-0.5 align-top", tone)}>
        {cell.kind === "empty" ? " " : cell.text || " "}
      </td>
    </>
  );
}

/** A gutter cell. `select-none` so copying the diff does not copy the numbers. */
function LineNo({ no, width }: { no: number | null; width: string }) {
  return (
    <td
      style={{ width }}
      className="select-none border-r border-[var(--border-subtle)] px-1 py-0.5 text-right align-top tabular-nums text-[var(--text-muted)]"
    >
      {no ?? ""}
    </td>
  );
}

function markerFor(kind: UnifiedRow["kind"]): string {
  if (kind === "add") return "+";
  if (kind === "del") return "-";
  return " ";
}

/**
 * Colour by the row's PARSED kind, not by re-reading its first character.
 *
 * The old version tested the raw text and had to check `@@` before `-`, because
 * a hunk header and a removal both begin with a dash once `---` is in play. The
 * parser has already made that distinction, so the ordering trap is gone.
 */
function rowTone(kind: UnifiedRow["kind"]): string {
  if (kind === "hunk") return "bg-platform-50 text-platform-800";
  if (kind === "meta") return "bg-slate-50 text-[var(--text-muted)]";
  if (kind === "add") return "bg-emerald-50 text-emerald-900";
  if (kind === "del") return "bg-rose-50 text-rose-900";
  return "text-[var(--text-strong)]";
}
