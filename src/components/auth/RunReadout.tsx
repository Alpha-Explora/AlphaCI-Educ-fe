"use client";
// ============================================================================
// VIEW LAYER — the run, told ACROSS the foot of the sign-in copy.
//
// This is the old RunCard's content, freed from its card. When the sign-in
// form lived in a column and the story lived on a panel, the story needed a
// container to stop it dissolving into the gradient. Now the FORM is the card
// and it is the only card; giving the story a second one would put two objects
// of equal weight on the screen and make the reader choose. It floats instead.
//
// HORIZONTAL, AND LEFT-ALIGNED. It used to run vertically down the page's right
// edge, mirrored so every row read label-then-icon. That column is gone: the
// pass now sits to the right of the copy with nothing beyond it, so the run
// moved under the copy it belongs to and turned on its side. A pipeline is a
// left-to-right thing anyway — the landing page has always drawn it that way,
// and the vertical version was the odd one out purely because of where it sat.
//
// Two halves, answering two different questions:
//
//   the rail   — WHEN it happens (push, build, test)
//   the marks  — WHAT you get back (builds, tests pass, style clean)
//
// The second half is deliberately a MARKING SHEET, not a log. Ticks appearing
// one by one beside plain statements is the most familiar feedback format in
// any school, and it is doing the same job a CI summary does. That overlap is
// the whole idea of the product, so it is what the front door shows.
//
// NOT a fake screenshot. No window chrome, no invented commit hash, no
// fabricated duration, no log output. It is a diagram of a process, which is
// why it can be stylised without pretending to be a real console.
//
// INTERACTION AND ACCESSIBILITY
// The whole column is aria-hidden and replay is bound to POINTER events on a
// plain div, never a <button>. A focusable control inside an aria-hidden
// subtree is a trap a screen reader cannot explain, and nothing here is
// information a form user needs. It plays once on arrival and again when a
// cursor visits; it does not loop, because the form has to win.
// ============================================================================
import { useCallback, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { runCard } from "@/config/brand";
import { LANDING_ICONS, ICON_WEIGHT } from "@/components/landing/Icons";
import { cn } from "@/components/ui/cn";

export function RunReadout({ className }: { className?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const stillPlease = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      // Ticks are drawn with the single-dash trick: dash each path with its own
      // length, hide it by offsetting by that length, animate the offset to 0.
      const ticks = gsap.utils.toArray<SVGPathElement>(".tick");
      const lengths = ticks.map((t) => t.getTotalLength());
      ticks.forEach((t, i) => {
        gsap.set(t, { strokeDasharray: lengths[i], strokeDashoffset: lengths[i] });
      });

      // Reduced motion gets the finished run. The outcome is the point; the
      // performance is not.
      if (stillPlease) {
        gsap.set(ticks, { strokeDashoffset: 0 });
        gsap.set([".stage", ".mark"], { opacity: 1 });
        // scaleX, not scaleY — the rail is horizontal now. All three places
        // that touch `.rail-fill` (here, the initial set below, and the tween)
        // must agree on the axis, or the rail either never fills or arrives
        // already full.
        gsap.set(".rail-fill", { scaleX: 1 });
        gsap.set(".mark-ring", { backgroundColor: "rgba(255,255,255,0.22)" });
        gsap.set(".verdict", { opacity: 1, y: 0 });
        return;
      }

      const tl = gsap.timeline({ paused: true });
      timelineRef.current = tl;

      tl.set(ticks, { strokeDashoffset: (i: number) => lengths[i] })
        .set(".stage", { opacity: 0.4 })
        .set(".mark", { opacity: 0.35 })
        .set(".rail-fill", { scaleX: 0 })
        .set(".mark-ring", { backgroundColor: "rgba(255,255,255,0)" })
        .set(".verdict", { opacity: 0, y: 8 });

      // --- Phase 1: the run travels ACROSS the rail. Each stage lights as the
      //     fill reaches it, so the dot and the line read as one movement.
      runCard.stages.forEach((_, i) => {
        tl.to(
          `.stage-${i}`,
          { opacity: 1, duration: 0.3, ease: "power2.out" },
          i === 0 ? 0 : "-=0.15",
        );
        if (i < runCard.stages.length - 1) {
          tl.to(`.rail-${i}`, { scaleX: 1, duration: 0.45, ease: "power1.inOut" });
        }
      });

      // --- Phase 2: the marking. Slower than the rail on purpose — this is
      //     the half a student actually cares about, and rushing it wastes it.
      // NB: the per-index hook is `mark-ring-N`, not `ring-N`. `ring-0`,
      // `ring-1` and `ring-2` are REAL Tailwind ring-width utilities, so an
      // index-suffixed `ring-` class would quietly override the `ring-1` that
      // draws the circle and leave the first mark with no outline at all.
      runCard.marks.forEach((_, i) => {
        tl.to(`.mark-${i}`, { opacity: 1, duration: 0.25 }, i === 0 ? "+=0.15" : "-=0.1")
          .to(
            `.mark-ring-${i}`,
            { backgroundColor: "rgba(255,255,255,0.22)", duration: 0.25 },
            "<",
          )
          .to(`.tick-${i}`, { strokeDashoffset: 0, duration: 0.28, ease: "power2.out" }, "<+0.08");
      });

      // --- Phase 3: the verdict.
      tl.to(".verdict", { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, "+=0.1");

      tl.play(0);
    }, root);

    return () => {
      ctx.revert();
      timelineRef.current = null;
    };
  }, []);

  // restart(true) drops any leading delay, so a replay feels like a response
  // rather than a queue.
  const replay = useCallback(() => timelineRef.current?.restart(true), []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      onPointerEnter={replay}
      onClick={replay}
      className={cn("w-full max-w-[30rem] cursor-pointer select-none", className)}
    >
      {/* ---- The rail: when it happens --------------------------------- */}
      {/* `items-start` on the row, and the connector pushed down by exactly
          half the dot's height (h-11 → 1.375rem). The label sits UNDER its dot
          now, so centring the connector on the whole item would hang it below
          the dots it is meant to join. */}
      <ol className="flex items-start">
        {runCard.stages.map((stage, i) => {
          const Glyph = LANDING_ICONS[stage.icon];
          const isLast = i === runCard.stages.length - 1;
          return (
            <li key={stage.label} className={`stage stage-${i} flex items-start`}>
              <span className="flex w-[4.5rem] flex-col items-center gap-2">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/25">
                  <Glyph size={22} weight={ICON_WEIGHT} />
                </span>
                <span className="text-sm font-medium text-white/85">{stage.label}</span>
              </span>
              {/* Fixed width, so the rail's length is set by the gap it spans
                  and not by whatever the label happens to wrap to. Inside the
                  <li> rather than beside it: an <ol> may only hold <li>. */}
              {!isLast && (
                <span className="relative mt-[1.375rem] block h-px w-8 shrink-0 sm:w-12">
                  <span className="absolute inset-0 bg-white/25" />
                  <span
                    className={`rail-fill rail-${i} absolute inset-0 origin-left bg-white/80`}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-7 h-px w-16 bg-white/20" />

      {/* ---- The marks: what you get back ------------------------------ */}
      {/* A wrapping row, not a column: three short statements stacked down the
          page took the vertical space the copy above now needs, and reading
          them across matches the rail they belong to. */}
      <ul className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        {runCard.marks.map((mark, i) => (
          <li key={mark} className={`mark mark-${i} flex items-center gap-2.5`}>
            {/* `text-white` here, not on an ancestor: the tick is drawn with
                `currentColor` and nothing between it and the scene sets one. */}
            <span
              className={`mark-ring mark-ring-${i} grid h-6 w-6 shrink-0 place-items-center rounded-full text-white ring-1 ring-white/30`}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  className={`tick tick-${i}`}
                  d="M3.5 8.4L6.4 11.3L12.5 4.8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="text-sm text-white/85">{mark}</span>
          </li>
        ))}
      </ul>

      <p className="verdict mt-5 text-sm font-semibold text-white">{runCard.verdict}</p>
    </div>
  );
}
