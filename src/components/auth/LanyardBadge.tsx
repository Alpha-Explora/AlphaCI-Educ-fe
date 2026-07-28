"use client";
// ============================================================================
// VIEW LAYER — the sign-in pass: a school ID card hanging from a lanyard.
//
// The form is PRINTED ON THE CARD, not floated next to a picture of one. That
// is the whole idea: everyone arriving here already owns a pass that gets them
// through a door, so the thing they are about to do is already in their hands.
//
// This file is MARKUP AND HANDLES ONLY. Three things it deliberately does not
// contain, each of which used to live here and made it unreadable:
//
//   useLanyardSwing.ts        the simulation (angle, stretch, recoil, rest)
//   confetti.ts               the burst
//   LanyardBadge.module.css   the materials (webbing, metal, card stock)
//
// What is left is the shape of the object and the rules about who may grab it.
//
// INTERACTION AND ACCESSIBILITY
// This card is NOT decorative — it contains the form — so it cannot borrow a
// decorative panel's aria-hidden escape hatch. Three rules follow:
//
//   1. Drag lives on the strap, the clip and the header only. Never on the
//      body, which is where the inputs are: a pointer-down that eats a click
//      on a password field is a bug, not a delight.
//   2. The handles are plain divs with pointer handlers and no tab stop. A
//      keyboard user is never offered a control whose only outcome is motion.
//   3. Focus inside the card calms it (handled in the hook).
//
// prefers-reduced-motion gets a still card and no confetti: the hook never
// installs its ticker, so a pull cannot build the stretch a burst needs.
// ============================================================================
import { useCallback, useRef } from "react";
import { cn } from "@/components/ui/cn";
import { badgeCopy } from "@/config/brand";
import { burstConfetti } from "./confetti";
import { useLanyardSwing } from "./useLanyardSwing";
import styles from "./LanyardBadge.module.css";

/**
 * px of stretch that earns confetti. Roughly a third of the maximum pull, so
 * a deliberate tug always pays and an ordinary sideways swing — which builds
 * no stretch at all — never does.
 */
const CONFETTI_AT = 34;

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
  /** Contents of the blue header. Also the primary drag handle. */
  header: React.ReactNode;
  /** The white card face — heading, form, links. */
  children: React.ReactNode;
  className?: string;
}) {
  const clipRef = useRef<HTMLDivElement>(null);
  const confettiRef = useRef<HTMLDivElement>(null);

  // The hook reports the gesture; this decides what it earned. Keeping the
  // threshold out of the physics is what lets either be retuned alone.
  const onRelease = useCallback((stretchPx: number) => {
    if (stretchPx < CONFETTI_AT) return;
    const layer = confettiRef.current;
    const clip = clipRef.current;
    if (!layer || !clip) return;
    // The layer is `fixed`, so viewport coordinates ARE its coordinates and
    // the clip's rect can be used as-is. It is measured at release rather
    // than at mount because by then the pass has been pulled somewhere else.
    const box = clip.getBoundingClientRect();
    burstConfetti(layer, { x: box.left + box.width / 2, y: box.top + box.height / 2 });
  }, []);

  const { hookRef, armRef, strapRef, cardRef, dragProps } = useLanyardSwing({ onRelease });

  // Worn by every surface that drags, alongside `dragProps`. `touch-none` is
  // what stops a phone from scrolling the page instead of pulling the pass.
  const grab = "cursor-grab touch-none select-none active:cursor-grabbing";

  return (
    <div className={cn("relative flex w-full flex-col items-center", className)}>
      {/*
        Confetti lands here. FIXED, not absolute: particles fall further than
        the badge is tall, and an absolutely-positioned layer would either be
        clipped by the scene or extend the document and raise a scrollbar.
        Fixed to the viewport, it can do neither.
      */}
      <div ref={confettiRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-40" />

      {/* ---- The hook. Also the pivot every angle is measured from. ------ */}
      <span
        ref={hookRef}
        aria-hidden="true"
        className="relative z-10 block h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_0_4px_rgb(var(--brand-900)/0.25)]"
      />

      {/* ---- The arm: strap + card, rotating about the hook -------------- */}
      <div
        ref={armRef}
        className="w-full max-w-[24rem] origin-top will-change-transform [perspective:900px]"
      >
        {/* The fallback in --strap-h matters: the scene sets it from viewport
            height, but a pass dropped onto any other surface still needs a
            strap rather than a zero-height sliver. */}
        <div
          ref={strapRef}
          {...dragProps}
          aria-hidden="true"
          className={cn(styles.strap, grab, "mx-auto h-[var(--strap-h,3.5rem)] w-3.5 rounded-b-[2px]")}
        />

        {/* Second joint. Rotates RELATIVE to the arm and carries the stretch
            — the lag is what makes it read as a card on webbing rather than
            one rigid shape. */}
        <div
          ref={cardRef}
          className="origin-top will-change-transform [transform-style:preserve-3d]"
        >
          {/* The clip, straddling the strap and the card's top edge. Wider
              than it is tall and biting into the card: a clip that floats
              clear of the card reads as a plug on a cable. */}
          <div
            ref={clipRef}
            {...dragProps}
            aria-hidden="true"
            className={cn(grab, "relative z-10 mx-auto -mb-3 h-[18px] w-20")}
          >
            <span className={cn(styles.clip, "absolute inset-0 rounded-[6px]")} />
            <span className="absolute left-1/2 top-1/2 h-[3px] w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgb(var(--brand-900)/0.35)]" />
          </div>

          <article className={cn(styles.card, "overflow-hidden rounded-[20px] bg-white ring-1 ring-white/40")}>
            {/* ---- Header. The third drag handle, and the reason the body
                    never needs to be one: everything grabbable is up here. */}
            <div
              {...dragProps}
              className={cn(
                grab,
                "relative bg-gradient-to-br from-platform-600 to-platform-700 px-5 pb-4 pt-5",
              )}
            >
              {/* The punched slot the lanyard would thread through. */}
              <span
                aria-hidden="true"
                className="absolute left-1/2 top-2 h-1.5 w-16 -translate-x-1/2 rounded-full bg-[rgb(var(--brand-900)/0.35)]"
              />
              {header}
            </div>

            {/* ---- Card face: the form. NOT a drag handle. -------------- */}
            <div className="px-5 pb-5 pt-5 sm:px-6">{children}</div>

            {/* ---- The foot: barcode and issue line. Pure card stock, so
                    it is hidden from assistive tech — a screen reader
                    reading out a decorative barcode helps nobody. ------- */}
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

    </div>
  );
}
