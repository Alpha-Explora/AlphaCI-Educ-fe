"use client";
// ============================================================================
// VIEW LAYER — vertical, grouped tab rail.
//
// The side-panel form of Tabs: a panel title, then the sections stacked under
// small uppercase group headings, with the chosen one highlighted. Sibling of
// Tabs.tsx rather than a mode of it — the keyboard contract differs (Up/Down,
// not Left/Right) and so does the layout contract (the caller has to put this
// beside its panel, where a strip just sits above it).
//
// WHY GROUPS. A flat list of four is a list; the headings turn it into a map of
// what a class HAS — the class itself, its people, its work, its configuration.
// That reading survives the list growing, which a flat one does not.
//
// ARIA notes, both deliberate:
//
//   · aria-orientation="vertical" + Up/Down. The tabs pattern binds arrows to
//     the visual axis, so a vertical list that answers to Left/Right announces
//     one thing and does another.
//   · The group headings sit INSIDE the tablist and are role="presentation".
//     A tablist may only own tabs, so the headings are hidden from the
//     accessibility tree — they are a visual grouping of controls that already
//     name themselves, not information only sighted users should get. This
//     keeps one ring of arrow navigation across every group.
//
// Presentational only. The selection is owned by the caller.
// ============================================================================
import { useRef } from "react";
import { cn } from "./cn";

export interface SideTabItem<T extends string> {
  id: T;
  label: string;
}

export interface SideTabGroup<T extends string> {
  /** Small uppercase heading. Omit for an ungrouped run of items. */
  heading?: string;
  items: ReadonlyArray<SideTabItem<T>>;
}

export function SideTabs<T extends string>({
  groups,
  value,
  onChange,
  /** Names the tablist for screen readers, e.g. "Class sections". */
  label,
  /** Shown above the groups — what this side panel is FOR. */
  title,
  /** Second line under the title. Section, term, that sort of thing. */
  subtitle,
  /** Prefix for the generated tab/panel ids — must match the panels' own. */
  idPrefix,
  /** Parked at the foot of the panel, below the groups and outside the tablist. */
  footer,
  className,
}: {
  readonly groups: ReadonlyArray<SideTabGroup<T>>;
  readonly value: T;
  readonly onChange: (id: T) => void;
  readonly label: string;
  readonly title?: React.ReactNode;
  readonly subtitle?: React.ReactNode;
  readonly idPrefix: string;
  readonly footer?: React.ReactNode;
  readonly className?: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Flattened once per render: arrow keys cross group boundaries, so the ring
  // is over all the items and not over each group separately.
  const flat = groups.flatMap((g) => g.items);

  function onKeyDown(event: React.KeyboardEvent) {
    const delta =
      event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    let next: SideTabItem<T> | undefined;

    if (delta !== 0) {
      const at = flat.findIndex((i) => i.id === value);
      // Wrap around — the ARIA pattern expects a ring, not a dead end.
      next = flat[(at + delta + flat.length) % flat.length];
    } else if (event.key === "Home") {
      next = flat[0];
    } else if (event.key === "End") {
      next = flat[flat.length - 1];
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
    <div className={cn("w-full shrink-0 lg:w-56", className)}>
      {(title || subtitle) && (
        <div className="mb-4 min-w-0">
          {title && (
            <h2 className="truncate text-lg font-semibold text-[var(--text-strong)]">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
              {subtitle}
            </p>
          )}
        </div>
      )}

      <div
        role="tablist"
        aria-label={label}
        aria-orientation="vertical"
        onKeyDown={onKeyDown}
        className="flex flex-col gap-0.5"
      >
        {groups.map((group, gi) => (
          // Key on the heading when there is one; the index is the fallback for
          // an unheaded run, of which there is at most one in practice.
          <div key={group.heading ?? `group-${gi}`} role="presentation">
            {group.heading && (
              <p
                role="presentation"
                className={cn(
                  "px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]",
                  // No top gap on the first group — the title above already
                  // supplies the separation.
                  gi === 0 ? "pt-0" : "pt-4",
                )}
              >
                {group.heading}
              </p>
            )}
            {group.items.map((item) => {
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
                    "w-full truncate rounded-lg px-3 py-1.5 text-left text-sm font-medium transition-colors",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform",
                    selected
                      ? "bg-platform-50 text-platform-700"
                      : "text-[var(--text-muted)] hover:bg-slate-50 hover:text-[var(--text-strong)]",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {footer && <div className="mt-5">{footer}</div>}
    </div>
  );
}
