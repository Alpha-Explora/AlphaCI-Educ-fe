"use client";
// ============================================================================
// VIEW LAYER — tab strip primitive.
//
// Follows the ARIA tabs pattern: one stop in the page's tab order, with
// Left/Right (and Home/End) moving between tabs. That matters here because the
// panel behind a tab can be long — a keyboard user shouldn't have to tab
// through every control in "Overview" to reach the "Settings" tab.
//
// Presentational only. The selected tab is owned by the caller, so the page can
// decide whether it lives in component state or the URL.
// ============================================================================
import { useRef } from "react";
import { cn } from "./cn";

export interface TabItem<T extends string> {
  id: T;
  label: string;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  /** Names the tablist for screen readers, e.g. "Class sections". */
  label,
  /** Prefix for the generated tab/panel ids — must match the panels' own. */
  idPrefix,
  className,
}: {
  items: ReadonlyArray<TabItem<T>>;
  value: T;
  onChange: (id: T) => void;
  label: string;
  idPrefix: string;
  className?: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKeyDown(event: React.KeyboardEvent) {
    const delta =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    let next: TabItem<T> | undefined;

    if (delta !== 0) {
      const at = items.findIndex((i) => i.id === value);
      // Wrap around — the ARIA pattern expects a ring, not a dead end.
      next = items[(at + delta + items.length) % items.length];
    } else if (event.key === "Home") {
      next = items[0];
    } else if (event.key === "End") {
      next = items[items.length - 1];
    }
    if (!next) return;

    event.preventDefault();
    onChange(next.id);
    // Follow-focus: with automatic activation the focused tab IS the selected
    // one, so focus has to move with the selection or the next arrow press
    // would start over from the old tab.
    refs.current[next.id]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        "flex gap-1 border-b border-[var(--border-subtle)]",
        className,
      )}
    >
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[item.id] = el;
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${item.id}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${item.id}`}
            // Only the selected tab is reachable by Tab; arrows do the rest.
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform",
              selected
                ? "border-platform text-platform-700"
                : "border-transparent text-[var(--text-muted)] hover:border-[var(--border-subtle)] hover:text-[var(--text-strong)]",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
