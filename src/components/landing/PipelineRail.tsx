"use client";
// ============================================================================
// VIEW LAYER — the three stages of a run.
//
// This replaces the old row of three equal feature cards. A CI pipeline is a
// SEQUENCE, and three identical boxes say nothing about order; a rail that
// fills from left to right while each stage lights in turn is the explanation
// itself. That is also the justification for the motion here: it is not
// decoration, it is the diagram running once so a student who has never met
// CI can see what "on every push" means.
//
// The rail replays on hover, because the one question this strip provokes is
// "wait, what happened?" and the answer should be one gesture away.
//
// Presentation only. Stage copy comes from src/config/brand.ts.
// ============================================================================
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { pipelineStages } from "@/config/brand";
import { LANDING_ICONS, ICON_WEIGHT } from "./Icons";

export function PipelineRail({ delay = 0 }: { delay?: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const playRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const stillPlease = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      // Reduced motion gets the finished diagram: full rail, all stages solid.
      if (stillPlease) {
        gsap.set(".rail-fill", { scaleX: 1 });
        gsap.set(".stage", { opacity: 1, y: 0 });
        gsap.set(".stage-dot", { scale: 1 });
        return;
      }

      const tl = gsap.timeline({ delay });
      playRef.current = tl;

      tl.fromTo(
        ".stage",
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.16, ease: "power2.out" },
      )
        // The rail is the run travelling between stages, so it starts with the
        // first stage rather than after all three have appeared.
        .fromTo(
          ".rail-fill",
          { scaleX: 0 },
          { scaleX: 1, duration: 0.5, stagger: 0.42, ease: "power1.inOut" },
          0.24,
        )
        // Each icon pops as the run reaches it. Offset by the same 0.42s as the
        // rail segments so the pop lands when the fill arrives, not before.
        .fromTo(
          ".stage-dot",
          { scale: 0.86 },
          { scale: 1, duration: 0.34, stagger: 0.42, ease: "back.out(2.4)" },
          0.2,
        );
    }, root);

    return () => {
      ctx.revert();
      playRef.current = null;
    };
  }, [delay]);

  const replay = () => {
    // restart(true) also clears the initial delay, so a hover feels immediate.
    playRef.current?.restart(true);
  };

  return (
    <div ref={rootRef} onPointerEnter={replay} className="relative">
      {/* The name goes on the list, not the wrapper: aria-label is ignored on
          a plain div, but <ol> carries role="list" and accepts one. */}
      <ol
        aria-label="What happens when you push"
        className="relative grid gap-7 sm:grid-cols-3 sm:gap-8"
      >
        {pipelineStages.map((stage, i) => {
          const Glyph = LANDING_ICONS[stage.icon];
          const isLast = i === pipelineStages.length - 1;
          return (
            <li key={stage.title} className="stage relative flex gap-3.5 sm:block">
              {/* Connector to the next stage. One segment per gap rather than
                  one line across the whole strip, so the fill can travel stage
                  by stage instead of sliding behind the icons. Wide layouts
                  only: a horizontal line through a vertical stack would be a
                  lie about direction. */}
              {/* Geometry note: the connector starts at the dot's right edge
                  (h-14 = 3.5rem) and reaches into the next column by exactly
                  the grid gap (sm:gap-8 = 2rem), and it sits at the dot's
                  vertical centre (1.75rem). Change the dot size or the gap and
                  these three numbers have to move with it. */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className="absolute left-[3.5rem] right-[-2rem] top-[1.75rem] hidden h-px sm:block"
                >
                  <span className="absolute inset-0 bg-[var(--border-subtle)]" />
                  <span className="rail-fill absolute inset-0 origin-left bg-platform-400" />
                </span>
              )}

              <span className="stage-dot relative grid h-14 w-14 shrink-0 place-items-center rounded-full border border-platform-100 bg-platform-50 text-platform-700">
                <Glyph size={28} weight={ICON_WEIGHT} aria-hidden="true" />
              </span>
              <span className="block sm:mt-5">
                <span className="block text-lg font-semibold text-[var(--text-strong)]">
                  {stage.title}
                </span>
                <span className="mt-1.5 block max-w-[26ch] text-[0.975rem] leading-relaxed text-[var(--text-muted)]">
                  {stage.body}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
