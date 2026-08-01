"use client";
// ============================================================================
// VIEW LAYER — Starter project gallery (teacher)
//
// A dropdown could only ever show a name and one line. Choosing what a whole
// class will build for a fortnight deserves more than that: which files appear
// in the repository, what the exercise actually teaches, and how hard it is
// relative to the others.
//
// A MODAL over the wizard rather than a page. The teacher is mid-creation with
// a title, a student list and a coverage gate already entered; sending them to
// /teacher/starters means either losing that or persisting a half-built form
// across a navigation. Browsing is a detour, not a destination.
//
// Two panes: a scannable list on the left, the full detail of one starter on
// the right. On a phone the list becomes the whole dialog and selecting a card
// swaps to its detail, because two panes at 380px is neither.
// ============================================================================
import { useState } from "react";
import type { ProjectTemplateOption, Stack } from "@/models/types";
import { Button, GenericPill, Modal, Spinner, cn } from "@/components/ui";

/** 1-5 from the registry, rendered as filled pips so it is scannable. */
function DifficultyMeter({ level }: { readonly level: number }) {
  return (
    <span className="inline-flex items-center gap-1" title={`Difficulty ${level} of 5`}>
      <span className="sr-only">Difficulty {level} of 5</span>
      {[1, 2, 3, 4, 5].map((pip) => (
        <span
          key={pip}
          aria-hidden="true"
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            pip <= level ? "bg-platform" : "bg-slate-200",
          )}
        />
      ))}
    </span>
  );
}

/**
 * One starter's full detail.
 *
 * The file list is the part a dropdown can never show, and it is what actually
 * answers "what will my students see when they open this?". It comes from the
 * server, computed by the same builder that provisions the repository, so it
 * cannot describe a shape the teacher will not get.
 */
function StarterDetail({
  starter,
  stack,
  onUse,
  isCurrent,
}: {
  readonly starter: ProjectTemplateOption;
  readonly stack: Stack;
  readonly onUse: () => void;
  readonly isCurrent: boolean;
}) {
  const files = starter.filesByStack[stack] ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-strong)]">
            {starter.label}
          </h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{starter.summary}</p>
        </div>
        <DifficultyMeter level={starter.difficulty} />
      </div>

      <div className="mt-4 rounded-lg bg-slate-50 p-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          What it teaches
        </span>
        <p className="mt-1 text-sm text-[var(--text-strong)]">{starter.teaches}</p>
      </div>

      <div className="mt-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Files your students get
        </span>
        {files.length > 0 ? (
          <ul className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {files.map((path) => (
              <li
                key={path}
                className="truncate font-mono text-xs text-[var(--text-strong)]"
                title={path}
              >
                {path}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Not available for this language.
          </p>
        )}
        {/* Said once, here, rather than repeated on every card: it is the
            reassurance a teacher needs before setting a strict gate, and it is
            true of every starter by construction. */}
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Plus the build config and the CI pipeline for your chosen language.
          Every starter ships passing tests that fully cover its own code, so it
          will not fail whatever coverage gate you set.
        </p>
      </div>

      <div className="mt-auto pt-5">
        <Button onClick={onUse} disabled={isCurrent} className="w-full">
          {isCurrent ? "Currently selected" : `Use ${starter.label}`}
        </Button>
      </div>
    </div>
  );
}

export function StarterGalleryModal({
  open,
  onClose,
  starters,
  isLoading,
  stack,
  selectedId,
  onSelect,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly starters: ProjectTemplateOption[];
  readonly isLoading: boolean;
  readonly stack: Stack;
  readonly selectedId: string | undefined;
  readonly onSelect: (id: string) => void;
}) {
  // Opens on whatever is already chosen, so the gallery explains the current
  // answer before offering alternatives.
  const [previewId, setPreviewId] = useState<string | undefined>(selectedId);
  const preview =
    starters.find((s) => s.id === previewId) ?? starters.find((s) => s.id === selectedId) ?? starters[0];

  // Mobile: one pane at a time. `detail` is only reachable by picking a card,
  // so the back control always has somewhere to go.
  const [mobilePane, setMobilePane] = useState<"list" | "detail">("list");

  function choose(id: string) {
    onSelect(id);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Starter projects" size="wide">
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--text-muted)]">
          <Spinner /> Loading starters…
        </div>
      ) : starters.length === 0 ? (
        <p className="py-12 text-center text-sm text-[var(--text-muted)]">
          No starters are available for this language yet.
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]">
          {/* List */}
          {/* Two-up. With nine starters a single column is a scroll; two
              columns fit the whole catalogue in view, which is the point of a
              gallery over a dropdown. One column below `lg`, where two would be
              too cramped to read. */}
          <ul
            className={cn(
              "grid content-start gap-2 sm:grid-cols-2",
              "max-h-[60vh] overflow-y-auto pr-1",
              mobilePane === "detail" && "hidden lg:grid",
            )}
          >
            {starters.map((starter) => {
              const active = starter.id === preview?.id;
              return (
                <li key={starter.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewId(starter.id);
                      setMobilePane("detail");
                    }}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-platform",
                      active
                        ? "border-platform bg-platform-50"
                        : "border-[var(--border-subtle)] hover:border-platform-200 hover:bg-slate-50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      {/* Truncates rather than wraps: in a two-up grid a long
                          name would otherwise push the pill onto its own line
                          and make one card taller than its neighbour. */}
                      <span className="truncate text-sm font-medium text-[var(--text-strong)]">
                        {starter.label}
                      </span>
                      {starter.id === selectedId && (
                        <span className="shrink-0">
                          <GenericPill tone="success">Selected</GenericPill>
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">
                      {starter.summary}
                    </p>
                    <div className="mt-2">
                      <DifficultyMeter level={starter.difficulty} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Detail */}
          <div
            className={cn(
              "rounded-lg border border-[var(--border-subtle)] p-4",
              // Stays put while the card grid scrolls next to it, so the
              // comparison the gallery exists for stays on screen.
              "lg:sticky lg:top-0 lg:max-h-[60vh] lg:overflow-y-auto",
              mobilePane === "list" && "hidden lg:block",
            )}
          >
            <button
              type="button"
              onClick={() => setMobilePane("list")}
              className="mb-3 text-xs font-medium text-platform-700 lg:hidden"
            >
              ← All starters
            </button>
            {preview && (
              <StarterDetail
                starter={preview}
                stack={stack}
                isCurrent={preview.id === selectedId}
                onUse={() => choose(preview.id)}
              />
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
