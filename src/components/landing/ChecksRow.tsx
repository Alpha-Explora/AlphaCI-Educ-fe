"use client";
// ============================================================================
// VIEW LAYER — what a run actually checks.
//
// The stage rail answers "when does this happen"; this row answers "what does
// it DO to my work". Four plain statements, in execution order, using the same
// words the run output will use later. Teaching the vocabulary here is cheap;
// teaching it in front of a red failing build is not.
//
// Rendered as a hairline-separated row rather than four cards: these are
// facts about one process, not four independent features, and boxing them
// would say otherwise.
//
// Presentation only. Copy comes from src/config/brand.ts.
// ============================================================================
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { pipelineChecks } from "@/config/brand";
import { LANDING_ICONS, ICON_WEIGHT } from "./Icons";

export function ChecksRow({ delay = 0 }: { delay?: number }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const stillPlease = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      if (stillPlease) {
        gsap.set(".check-item", { opacity: 1, y: 0 });
        return;
      }
      // Left to right, same direction and rhythm as the rail above it, so the
      // two rows read as one continuous explanation rather than two lists.
      gsap.fromTo(
        ".check-item",
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.45, stagger: 0.09, ease: "power2.out", delay },
      );
    }, root);

    return () => ctx.revert();
  }, [delay]);

  return (
    <div ref={rootRef}>
      <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
        {pipelineChecks.map((check) => {
          const Glyph = LANDING_ICONS[check.icon];
          return (
            <li
              key={check.label}
              className="check-item flex items-center gap-3 border-[var(--border-subtle)] xl:border-l xl:pl-5 xl:first:border-l-0 xl:first:pl-0"
            >
              <Glyph
                size={22}
                weight={ICON_WEIGHT}
                aria-hidden="true"
                className="shrink-0 text-platform-600"
              />
              <span className="text-[0.95rem] leading-snug text-[var(--text-muted)]">
                {check.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
