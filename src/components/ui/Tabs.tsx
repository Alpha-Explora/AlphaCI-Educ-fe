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
//
// `trailing` parks page-level content on the right of the strip (the class join
// code, for one). It is a SIBLING of the tablist, not a child: a tablist may
// only contain tabs, so the border lives on the wrapper and the tablist keeps
// itself pure.
//
// `leading` is the same idea on the other side, and exists so a page heading can
// share the strip's row instead of stacking above it. With a leading element and
// no trailing one, the wrapper's `justify-between` pushes the tabs to the RIGHT
// — which is the point: the heading and the tabs read as one band, with the
// border running under both.
//
// Both slots are ReactNode rather than styled here. They carry page content, and
// a primitive that decided their type would be a primitive with opinions about
// the pages that use it.
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
  /** Optional content pinned to the LEFT of the strip, outside the tablist. */
  leading,
  /** Optional content pinned to the right of the strip, outside the tablist. */
  trailing,
  className,
}: {
  items: ReadonlyArray<TabItem<T>>;
  value: T;
  onChange: (id: T) => void;
  label: string;
  idPrefix: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
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
      className={cn(
        // items-end keeps the tabs' bottom edge on the border, so the active
        // tab's -mb-px underline still overlaps it once trailing content makes
        // the row taller than the tabs themselves.
        "flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-[var(--border-subtle)]",
        className,
      )}
    >
      {/* Outside the tablist, and before it in the DOM so reading order matches
          what is on screen. `pb-2` sits it on the same baseline as the tabs,
          whose own py-2.5 holds them off the border. */}
      {leading && <div className="pb-2">{leading}</div>}

      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="flex gap-1"
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

      {trailing && <div className="pb-2">{trailing}</div>}
    </div>
  );
}
