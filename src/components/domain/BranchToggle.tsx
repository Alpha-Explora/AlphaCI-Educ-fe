"use client";
// VIEW LAYER — segmented branch switcher for the workspace / repo detail.
import type { RepoBranch } from "@/models/types";
import { cn } from "@/components/ui";

export function BranchToggle({
  branches,
  selected,
  onSelect,
}: {
  branches: RepoBranch[];
  selected: string | null;
  onSelect: (name: string) => void;
}) {
  if (branches.length === 0) return null;
  return (
    <div
      className="inline-flex flex-wrap gap-1 rounded-lg border border-[var(--border-subtle)] bg-slate-50 p-1"
      role="tablist"
      aria-label="Git branches"
    >
      {branches.map((b) => {
        const active = b.name === selected;
        return (
          <button
            key={b.name}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(b.name)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-platform",
              active
                ? "bg-white text-platform-700 shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-strong)]",
            )}
          >
            <span aria-hidden="true">⎇</span>
            {b.name}
            {b.isProtected && (
              <span
                title="Protected branch"
                aria-label="Protected"
                className="text-[var(--text-muted)]"
              >
                🔒
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
