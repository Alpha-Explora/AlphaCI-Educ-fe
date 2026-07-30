"use client";
// ============================================================================
// VIEW LAYER — read the repository's code, per branch
//
// The gap this fills: students have no GitHub account, so before this they could
// not read their own submitted code anywhere. The pipeline told them a Sonar
// smell existed and a hidden test failed; nothing let them look at the file.
//
// Plain monospace with line numbers, no syntax highlighting. Highlighting needs a
// grammar bundle per language, and the four languages here (Java, Node, Python,
// PHP) would pull in a sizeable dependency to colour code a student already reads
// coloured in VS Code. Line numbers matter more — they are how a Sonar finding or
// a stack frame gets located.
// ============================================================================
import { useRepoFiles } from "@/viewmodels/useRepoFiles";
import type { RepoBranch } from "@/models/types";
import {
  Banner,
  Card,
  Field,
  SectionHeading,
  Select,
  Skeleton,
  StateBoundary,
  cn,
} from "@/components/ui";

export function CodeBrowserPanel({
  repoId,
  branches,
  defaultBranch,
}: {
  repoId: string;
  branches: RepoBranch[];
  defaultBranch?: string | null;
}) {
  const vm = useRepoFiles(repoId, defaultBranch ?? branches[0]?.name ?? null);

  return (
    <Card className="p-5">
      <SectionHeading
        title="Code"
        subtitle="Browse what is actually on each branch — the same files the pipeline graded."
      />

      <div className="mt-4 flex flex-wrap items-end gap-3">
        {branches.length > 0 && (
          <Field label="Branch">
            {({ id }) => (
              <Select
                id={id}
                value={vm.ref ?? ""}
                onChange={(e) => vm.setRef(e.target.value)}
              >
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}
      </div>

      {/* Breadcrumb. Every segment is clickable, which is the only way back out
          of a deep path without a browser-history dependency. */}
      <nav aria-label="File path" className="mt-4 flex flex-wrap items-center gap-1 text-sm">
        {vm.crumbs.map((crumb, idx) => (
          <span key={crumb.path} className="flex items-center gap-1">
            {idx > 0 && (
              <span aria-hidden="true" className="text-[var(--text-muted)]">
                /
              </span>
            )}
            <button
              type="button"
              onClick={() => vm.goTo(crumb.path)}
              disabled={idx === vm.crumbs.length - 1}
              className={cn(
                "rounded px-1 py-0.5 font-mono text-xs",
                idx === vm.crumbs.length - 1
                  ? "font-semibold text-[var(--text-strong)]"
                  : "text-platform-700 hover:underline",
              )}
            >
              {crumb.label}
            </button>
          </span>
        ))}
      </nav>

      <StateBoundary
        isLoading={vm.isLoading}
        error={vm.error}
        loadingFallback={<Skeleton className="mt-4 h-48 w-full" />}
      >
        <div className="mt-3">
          {vm.listing?.kind === "missing" && (
            <Banner tone="warning">
              Nothing at this path on <strong>{vm.ref}</strong>. It may exist on a
              different branch.
            </Banner>
          )}

          {vm.listing?.kind === "dir" && (
            <ul className="divide-y divide-[var(--border-subtle)] rounded-lg border border-[var(--border-subtle)]">
              {vm.path !== "" && (
                <li>
                  <button
                    type="button"
                    onClick={vm.goUp}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span aria-hidden="true">↩</span>
                    <span className="font-mono text-xs text-[var(--text-muted)]">..</span>
                  </button>
                </li>
              )}
              {vm.listing.entries.length === 0 && vm.path === "" && (
                <li className="px-3 py-4 text-sm text-[var(--text-muted)]">
                  This branch has no files yet.
                </li>
              )}
              {vm.listing.entries.map((entry) => (
                <li key={entry.path}>
                  <button
                    type="button"
                    onClick={() => vm.openEntry(entry)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span aria-hidden="true">{entry.type === "dir" ? "📁" : "📄"}</span>
                      <span className="truncate font-mono text-xs text-[var(--text-strong)]">
                        {entry.name}
                      </span>
                    </span>
                    {entry.type === "file" && (
                      <span className="shrink-0 text-xs tabular-nums text-[var(--text-muted)]">
                        {formatBytes(entry.size)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {vm.listing?.kind === "file" && vm.listing.file && (
            <FileView file={vm.listing.file} />
          )}
        </div>
      </StateBoundary>
    </Card>
  );
}

function FileView({
  file,
}: {
  file: NonNullable<RepoContentListingFile>;
}) {
  if (file.isBinary) {
    return (
      <Banner tone="info">
        <strong>{file.name}</strong> is a binary file ({formatBytes(file.size)}), so
        there is nothing to show.
      </Banner>
    );
  }
  if (file.tooLarge || file.text === null) {
    return (
      <Banner tone="info">
        <strong>{file.name}</strong> is too large to display here (
        {formatBytes(file.size)}).
      </Banner>
    );
  }

  const lines = file.text.split("\n");

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)]">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-slate-50/60 px-3 py-2">
        <span className="font-mono text-xs font-medium text-[var(--text-strong)]">
          {file.path}
        </span>
        <span className="text-xs tabular-nums text-[var(--text-muted)]">
          {lines.length} lines · {formatBytes(file.size)}
        </span>
      </div>
      {/*
        The <pre> scrolls inside its own container rather than letting a long line
        widen the page. Line numbers are unselectable so copying the code does not
        drag the numbers with it.
      */}
      <div className="max-h-[32rem] overflow-auto">
        <table className="w-full border-collapse font-mono text-xs">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-slate-50">
                <td className="w-12 select-none border-r border-[var(--border-subtle)] px-2 py-0.5 text-right align-top tabular-nums text-[var(--text-muted)]">
                  {idx + 1}
                </td>
                <td className="whitespace-pre px-3 py-0.5 text-[var(--text-strong)]">
                  {line || " "}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type RepoContentListingFile = {
  name: string;
  path: string;
  size: number;
  text: string | null;
  isBinary: boolean;
  tooLarge: boolean;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
