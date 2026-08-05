"use client";
// ============================================================================
// VIEW LAYER — a job's console output.
//
// The step list already said WHICH step failed. This says WHY, and until it
// existed there was no answer to that inside this product: the compiler error
// only lived on GitHub, which students have no account for. A red cross beside
// "Build" with nowhere to click is not a CI/CD lesson, it is a dead end.
//
// A CONSOLE, NOT A DOCUMENT. Monospace, dark, line-numbered, and scrolled in its
// own box rather than laid out as page text — because that is the artefact
// students are learning to read, and rendering it as prose would teach them a
// shape they will never see again in this industry.
//
// IT OWNS THE RIGHT PANE of the run screen — one job's output at a time, with
// the run's other jobs in a narrow rail beside it rather than stacked above it
// (see GithubActionsPanel). That is what earns the width and the height: a stack
// trace must not wrap, so a console needs horizontal room it cannot get from a
// column shared with every other job in the run.
//
// THE ERROR IS FOUND FOR THEM, ONCE. `firstErrorLine` is computed on the server
// (see job-log.util.ts) and this jumps to it on open. Two thousand lines of npm
// output with "scroll until it turns red" as the instruction is the failure mode
// this whole component exists to remove.
// ============================================================================
import { useEffect, useMemo, useRef, useState } from "react";
import type { JobLogLine, JobLogView } from "@/models/types";
import { Banner, Button, Spinner, cn } from "@/components/ui";

/** Stable empty list — see the note at its use site. */
const NO_LINES: JobLogLine[] = [];

/** Line colours. Everything not named here reads as ordinary output. */
const LEVEL_STYLES: Record<string, string> = {
  error: "text-red-300",
  warning: "text-amber-300",
  notice: "text-sky-300",
  debug: "text-slate-500",
  command: "text-slate-400",
};

export function JobLogConsole({
  log,
  isLoading,
  error,
  onRetry,
}: {
  readonly log: JobLogView | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly onRetry: () => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [copied, setCopied] = useState(false);

  // A shared constant, not a fresh `[]`: an inline fallback is a new array on
  // every render, which would make the memo below recompute the filter on every
  // keystroke elsewhere in the page.
  const lines = log?.lines ?? NO_LINES;

  /*
    Errors and warnings, plus a little of what came before each.

    Not the error lines ALONE: a compiler prints the offending source on one
    line and "error:" on the next, so an error-only view routinely shows the
    verdict without the evidence. Two lines of lead-in is what makes the filter
    usable rather than merely short.
  */
  const shown = useMemo(() => {
    if (!onlyErrors) return lines;
    const keep = new Set<number>();
    lines.forEach((line, index) => {
      if (line.level !== "error" && line.level !== "warning") return;
      for (let back = Math.max(0, index - 2); back <= index; back += 1) {
        keep.add(back);
      }
    });
    return lines.filter((_, index) => keep.has(index));
  }, [lines, onlyErrors]);

  const jumpTo = (lineNumber: number) => {
    const target = scroller.current?.querySelector<HTMLElement>(
      `[data-line="${lineNumber}"]`,
    );
    target?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  /*
    Land on the failure the moment the log opens.

    Keyed on the log identity rather than run once on mount: opening a second
    job reuses this component, and without the dependency the console would show
    the new job scrolled to the old job's error position.
  */
  useEffect(() => {
    if (!log?.firstErrorLine) return;
    // After paint — the rows do not exist to scroll to during this render.
    const id = requestAnimationFrame(() => jumpTo(log.firstErrorLine as number));
    return () => cancelAnimationFrame(id);
  }, [log]);

  const copy = () => {
    if (!log) return;
    void navigator.clipboard.writeText(log.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2_000);
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-4 py-6 text-sm text-[var(--text-muted)]">
        <Spinner /> Loading the console output…
      </div>
    );
  }

  if (error || log?.error) {
    return (
      <Banner
        tone="warning"
        title="Couldn't load this log"
        action={
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        }
      >
        {error ?? log?.error}
      </Banner>
    );
  }

  // Simulated mode: no GitHub call was made at all, so there is no log to show
  // and saying "empty" would read as "your step printed nothing".
  if (log && !log.live) {
    return (
      <p className="rounded-lg bg-[var(--bg-subtle)] px-4 py-3 text-sm text-[var(--text-muted)]">
        Live GitHub access is off on this server, so console output is not
        available here.
      </p>
    );
  }

  if (lines.length === 0) {
    return (
      <p className="rounded-lg bg-[var(--bg-subtle)] px-4 py-3 text-sm text-[var(--text-muted)]">
        This job produced no console output.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {/* Just "Console". It used to read "Console · {jobName}", which was
          correct when the log sat inside a stack of jobs and wrong now that it
          has a pane whose own heading, one inch above, is that job's name. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-[var(--text-strong)]">Console</span>

        {/* The count is the headline. A student who sees "3 errors" knows to use
            the jump; one who sees nothing assumes the log is fine and scrolls. */}
        {log && log.errorCount > 0 && (
          <button
            type="button"
            onClick={() => log.firstErrorLine && jumpTo(log.firstErrorLine)}
            className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-200 transition-colors hover:bg-red-100"
          >
            {log.errorCount} {log.errorCount === 1 ? "error" : "errors"} · jump
          </button>
        )}
        {log && log.warningCount > 0 && (
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
            {log.warningCount} {log.warningCount === 1 ? "warning" : "warnings"}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {log && log.errorCount > 0 && (
            <button
              type="button"
              aria-pressed={onlyErrors}
              onClick={() => setOnlyErrors((on) => !on)}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset transition-colors",
                onlyErrors
                  ? "bg-platform-600 text-white ring-platform-600"
                  : "bg-white text-[var(--text-muted)] ring-[var(--border-subtle)] hover:bg-slate-50",
              )}
            >
              Errors only
            </button>
          )}
          <button
            type="button"
            onClick={copy}
            className="rounded-md bg-white px-2 py-1 text-xs font-medium text-[var(--text-muted)] ring-1 ring-inset ring-[var(--border-subtle)] transition-colors hover:bg-slate-50"
          >
            {copied ? "Copied" : "Copy log"}
          </button>
        </div>
      </div>

      {log?.truncated && (
        <p className="text-xs text-[var(--text-muted)]">
          Showing the last {lines.length.toLocaleString()} of{" "}
          {log.totalLines.toLocaleString()} lines — a failing step reports itself
          at the end, so this is the part that explains it.
        </p>
      )}

      {/*
        `overflow-x-auto` on the scroller and `whitespace-pre` on each line: a
        stack trace must NOT wrap. Wrapped, the indentation that shows nesting is
        destroyed and a 300-character line becomes a paragraph nobody can scan.
      */}
      <div
        ref={scroller}
        // Taller than it used to be (28rem), because it no longer shares a
        // column with every other job in the run — it has a pane, and a console
        // that shows twelve lines at a time is a keyhole onto the one artefact
        // this component exists to make readable.
        className="max-h-[36rem] overflow-auto rounded-lg bg-slate-900 py-2 font-mono text-xs leading-relaxed"
      >
        <table className="w-full border-separate border-spacing-0">
          <tbody>
            {shown.map((line) => (
              <LogRow key={line.number} line={line} />
            ))}
          </tbody>
        </table>
      </div>

      {onlyErrors && shown.length === 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          Nothing matched — this job logged no errors or warnings.
        </p>
      )}
    </div>
  );
}

/**
 * One line: a sticky gutter number and the text.
 *
 * A table row rather than a flex div so the gutter column sizes itself to the
 * widest number and every line starts at the same x — the thing that makes a
 * console scannable. `select-none` on the gutter keeps line numbers out of a
 * copied selection, which is what makes the copied text pasteable.
 */
function LogRow({ line }: { readonly line: JobLogLine }) {
  const isError = line.level === "error";

  return (
    <tr
      data-line={line.number}
      className={cn("group", isError && "bg-red-950/40")}
    >
      <td className="w-[1%] select-none whitespace-nowrap px-3 text-right align-top text-slate-600 tabular-nums">
        {line.number}
      </td>
      <td
        className={cn(
          "whitespace-pre px-2 align-top",
          LEVEL_STYLES[line.level] ?? "text-slate-200",
          line.level === "command" && "font-semibold",
        )}
      >
        {/* A group header is the runner announcing a step. Marked so the eye can
            find section boundaries in a wall of output. */}
        {line.level === "command" && line.group === line.text ? "▸ " : ""}
        {line.text || " "}
      </td>
    </tr>
  );
}
