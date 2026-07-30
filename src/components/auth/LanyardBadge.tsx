// ============================================================================
// VIEW LAYER — the sign-in pass: a school ID card hanging from a lanyard.
//
// The form is PRINTED ON THE CARD, not floated next to a picture of one. That
// is the whole idea: everyone arriving here already owns a pass that gets them
// through a door, so the thing they are about to do is already in their hands.
//
// STATIC BY DESIGN. This used to be a draggable object — a spring simulation
// (useLanyardSwing.ts) let you pull the pass and swing it, and a hard tug fired
// confetti (confetti.ts). Both are gone, along with those two files.
//
// The reason is what this screen is FOR. It is the first thing a student sees
// on a shared lab PC, often while a class waits, and the fastest path through
// it is the only thing that matters. A pass that moves invites playing with the
// pass; it also put pointer handlers and a `touch-none` region directly above
// the fields, which is a real cost on a touchscreen for a purely decorative
// return. The card still LOOKS like a hanging pass — hook, strap, clip, card
// stock, barcode — it simply does not respond to being grabbed.
//
// What remains here is markup and CSS only: no state, no refs, no handlers,
// which is also why this file no longer needs "use client".
//
//   LanyardBadge.module.css   the materials (webbing, metal, card stock)
//   AuthScene.module.css      the room, and --strap-h (the strap's length)
// ============================================================================
import { cn } from "@/components/ui/cn";
import { badgeCopy } from "@/config/brand";
import styles from "./LanyardBadge.module.css";

/**
 * The barcode on the card's foot. A FIXED pattern, deliberately not
 * Math.random(): this page server-renders, and a random bar width would give
 * the client different HTML from the server's and break hydration. A barcode
 * that reshuffles on every visit is also a barcode nobody believes.
 */
const BARCODE = [3, 1, 1, 2, 4, 1, 2, 1, 3, 2, 1, 1, 4, 2, 1, 3, 1, 2, 2, 1, 3, 1, 1, 2];

export function LanyardBadge({
  header,
  children,
  className,
}: {
  /** Contents of the blue header. */
  header: React.ReactNode;
  /** The white card face — heading, form, links. */
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative flex w-full flex-col items-center", className)}>
      {/* ---- The hook the strap hangs from. ----------------------------- */}
      <span
        aria-hidden="true"
        className="relative z-10 block h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_0_4px_rgb(var(--brand-900)/0.25)]"
      />

      <div className="w-full max-w-[24rem]">
        {/* The fallback in --strap-h matters: the scene sets it from viewport
            height, but a pass dropped onto any other surface still needs a
            strap rather than a zero-height sliver. */}
        <div
          aria-hidden="true"
          className={cn(styles.strap, "mx-auto h-[var(--strap-h,3.5rem)] w-3.5 rounded-b-[2px]")}
        />

        {/* The clip, straddling the strap and the card's top edge. Wider
            than it is tall and biting into the card: a clip that floats
            clear of the card reads as a plug on a cable. */}
        <div aria-hidden="true" className="relative z-10 mx-auto -mb-3 h-[18px] w-20">
          <span className={cn(styles.clip, "absolute inset-0 rounded-[6px]")} />
          <span className="absolute left-1/2 top-1/2 h-[3px] w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgb(var(--brand-900)/0.35)]" />
        </div>

        <article className={cn(styles.card, "overflow-hidden rounded-[20px] bg-white ring-1 ring-white/40")}>
          {/* ---- Header ------------------------------------------------- */}
          <div className="relative bg-gradient-to-br from-platform-600 to-platform-700 px-5 pb-4 pt-5">
            {/* The punched slot the lanyard would thread through. */}
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-2 h-1.5 w-16 -translate-x-1/2 rounded-full bg-[rgb(var(--brand-900)/0.35)]"
            />
            {header}
          </div>

          {/* ---- Card face: the form. --------------------------------- */}
          <div className="px-5 pb-5 pt-5 sm:px-6">{children}</div>

          {/* ---- The foot: barcode and issue line. Pure card stock, so
                  it is hidden from assistive tech — a screen reader
                  reading out a decorative barcode helps nobody. --------- */}
          <div
            aria-hidden="true"
            className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-5 py-3 sm:px-6"
          >
            <span className="flex h-7 items-end gap-[2px]">
              {BARCODE.map((width, i) => (
                <span
                  key={i}
                  style={{ width, height: i % 3 === 0 ? "100%" : "78%" }}
                  className="block bg-[var(--text-strong)] opacity-80"
                />
              ))}
            </span>
            <span className="flex shrink-0 items-center gap-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                {badgeCopy.serial}
              </span>
              <span className="rounded-full bg-platform-600 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                {badgeCopy.status}
              </span>
            </span>
          </div>
        </article>
      </div>
    </div>
  );
}
