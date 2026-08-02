"use client";
// ============================================================================
// VIEW LAYER — vertical, grouped tab rail.
//
// The side-panel form of Tabs: the sections stacked under small uppercase group
// headings, with the chosen one highlighted. Sibling of Tabs.tsx rather than a
// mode of it — the keyboard contract differs (Up/Down, not Left/Right) and so
// does the layout contract (the caller has to put this beside its panel, where
// a strip just sits above it).
//
// WHY THE RAIL IS TINTED. Sitting on --bg-canvas with no surface of its own,
// the rail read as empty page rather than as a panel, and nothing told the eye
// where navigation stopped and content began. A brand-tinted block is the
// cheapest way to say "this column is the map, that column is the thing" —
// and it inverts the selected state: on a tinted rail a tinted chip vanishes,
// so the open section is drawn in solid brand with white text instead.
//
// It carries no title. The page header above already names the class, and
// repeating "AT1234 / AlphaTest" one inch below it spent the top of the rail
// on something the teacher had just read.
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
    <div
      className={cn(
        // The tinted panel. Rounded and bordered so it reads as a rail rather
        // than as a stripe of coloured page, and p-3 so the selected chip has
        // tint on every side of it.
        "w-full shrink-0 rounded-2xl border border-platform-200 bg-platform-100 p-3 lg:w-60",
        // Sticky, so the rail is still there after scrolling a long tab. Needs
        // the parent row to be items-start: a stretched flex child is already
        // as tall as the scroll area and has nowhere to stick to.
        "lg:sticky lg:top-6",
        className,
      )}
    >
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
                  // platform-700 rather than --text-muted: muted grey on a
                  // blue tint reads as disabled. Full strength, no opacity —
                  // 11px is small text, and it needs its 4.5:1.
                  "px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-platform-700",
                  // No top gap on the first group — the panel's own padding
                  // already supplies the separation.
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
                    // border-l is always present (transparent when unselected) so the
                    // selected accent bar never shifts the label's horizontal position.
                    "w-full truncate rounded-lg border-l-[3px] px-3 py-1.5 text-left text-sm transition-colors",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform-700",
                    selected
                      ? // Solid fill, not a tint: on a tinted rail a tinted chip is
                        // invisible. White on platform-600 is 5.17:1 — AA.
                        "border-platform-800 bg-platform-600 font-semibold text-white shadow-sm"
                      : // platform-900 rather than --text-strong, which is a blue-black
                        // mixed for white and goes muddy on a blue tint.
                        "border-transparent font-medium text-platform-900 hover:bg-platform-200",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Ruled off rather than merely spaced: the join code is class-level
          information, not a fifth section, and inside a filled panel a gap
          alone does not say so. */}
      {footer && (
        <div className="mt-4 border-t border-platform-200 pt-4">{footer}</div>
      )}
    </div>
  );
}
