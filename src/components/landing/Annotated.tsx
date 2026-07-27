"use client";
// ============================================================================
// VIEW LAYER — the felt-tip annotation.
//
// Wraps any element in a hand-drawn pen loop that draws itself on, the way a
// teacher circles the one thing on a worksheet you are meant to do. On this
// product's front door that thing is the sign-in button, and this is the
// entire reason the landing page has a scene at all.
//
// WHY THE PATH IS GENERATED, NOT AUTHORED
// The first version stretched one hand-authored path over whatever it wrapped
// using `preserveAspectRatio="none"`. That makes the loop's shape a GUESS
// about the target's aspect ratio, and when the guess is wrong the loop lands
// crooked, clips the target, or misses it. Here the wrapper is measured and
// the loop is computed from its real pixel size, so:
//
//   - the viewBox is 1:1 with the element, so nothing is distorted;
//   - the loop is centred on the target by construction, not by eye;
//   - clearance is solvable. An ellipse (rx, ry) centred on a rectangle clears
//     that rectangle's corner (a, b) exactly when (a/rx)² + (b/ry)² < 1, which
//     is what LOOP_PASSES and the caller's padding are tuned against.
//
// HOW THE DRAWING WORKS
// A stroked path is "drawn" by dashing it with a single dash exactly as long
// as the path, then sliding that dash into view: `stroke-dasharray = L,
// stroke-dashoffset = L` hides it, and animating the offset to 0 reveals it
// end to end. `getTotalLength()` reads L at runtime.
//
// The loop lives inside PADDING rather than at negative offsets. Two reasons:
// negative insets built by string concatenation are fragile (a leading minus
// in front of a `clamp()` is invalid CSS and silently drops the whole
// declaration), and padding also RESERVES the space the ink occupies, so
// neighbouring text cannot end up underneath the pen.
//
// Presentation only. The colour is --ink-mark from the palette, so a school
// that re-skins gets its own pen.
// ============================================================================
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { cn } from "@/components/ui/cn";

/**
 * The passes of the pen, outermost first.
 *
 * `scale` is a fraction of the padded box's half-width and half-height. Pass 1
 * fills the box; pass 2 is drawn a little inside it, close enough to read as
 * "round again" rather than as a second, separate circle. `turn` rotates the
 * wobble so the two passes do not share their bumps, which is the giveaway
 * that a shape was copied rather than drawn twice.
 */
const LOOP_PASSES = [
  { scaleX: 1, scaleY: 1, turn: 0, seed: 7, from: -0.34, to: 0.42 },
  { scaleX: 0.93, scaleY: 0.9, turn: 0.55, seed: 23, from: -0.1, to: 0.2 },
] as const;

/** Points sampled per loop. Enough to wobble, few enough to stay a circle. */
const SAMPLES = 15;

/** Deterministic PRNG. A loop that re-randomises on every render flickers. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One hand-drawn loop around the centre of a `w` x `h` box.
 *
 * The wobble is biased OUTWARD only (never negative), so a jittered point can
 * never fall inside the nominal ellipse and eat into the clearance the caller
 * paid padding for.
 *
 * Sampled points are joined with Catmull-Rom-to-Bezier conversion, which is
 * what turns 15 points into a continuous curve instead of a polygon.
 */
function buildLoop(
  w: number,
  h: number,
  pass: (typeof LOOP_PASSES)[number],
): string {
  const rand = mulberry32(pass.seed);
  const cx = w / 2;
  const cy = h / 2;
  const rx = (w / 2) * pass.scaleX;
  const ry = (h / 2) * pass.scaleY;

  // Start before 0 and finish past 2π so the pen overshoots its own starting
  // point. A loop that closes exactly reads as a border, not as ink.
  const start = pass.from + pass.turn;
  const end = Math.PI * 2 + pass.to + pass.turn;

  const points: Array<[number, number]> = [];
  for (let i = 0; i <= SAMPLES; i += 1) {
    const a = start + ((end - start) * i) / SAMPLES;
    // Capped at +6%: pass 2's largest possible radius stays under pass 1's
    // smallest, so the two loops never cross. Crossing strokes read as a
    // scribble; nested ones read as "round it, then round it again".
    const wobble = 1 + rand() * 0.06;
    points.push([cx + Math.cos(a) * rx * wobble, cy + Math.sin(a) * ry * wobble]);
  }

  const at = (i: number) => points[Math.min(points.length - 1, Math.max(0, i))];
  let d = `M${at(0)[0].toFixed(1)} ${at(0)[1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const [p0x, p0y] = at(i - 1);
    const [p1x, p1y] = at(i);
    const [p2x, p2y] = at(i + 1);
    const [p3x, p3y] = at(i + 2);
    const c1x = p1x + (p2x - p0x) / 6;
    const c1y = p1y + (p2y - p0y) / 6;
    const c2x = p2x - (p3x - p1x) / 6;
    const c2y = p2y - (p3y - p1y) / 6;
    d += `C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2x.toFixed(1)} ${p2y.toFixed(1)}`;
  }
  return d;
}

export function Annotated({
  children,
  /** Seconds to wait before the pen starts. Lets a page stage its reveal. */
  delay = 0,
  /**
   * Space reserved around the child for the ink, as CSS lengths. A WIDE target
   * needs disproportionately more horizontal room than vertical: the corners
   * are the hard part, and on a wide rectangle they sit far out along the
   * x axis. Under-padding here is what makes a loop cut through a button.
   */
  padX = "3.25rem",
  padY = "1.75rem",
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  padX?: string;
  padY?: string;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  // Measure the padded box, and keep measuring: the loop has to survive a
  // font swap, a resize, and the reflow when a notice banner appears above it.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setBox((prev) => {
        const w = Math.round(rect.width);
        const h = Math.round(rect.height);
        return prev && prev.w === w && prev.h === h ? prev : { w, h };
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const paths = useMemo(
    () => (box ? LOOP_PASSES.map((pass) => buildLoop(box.w, box.h, pass)) : []),
    [box],
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || paths.length === 0) return;

    const nodes = Array.from(svg.querySelectorAll<SVGPathElement>("path"));
    const lengths = nodes.map((p) => p.getTotalLength());

    // Reduced motion still gets the annotation. It is information, not
    // decoration; the pen simply arrives already drawn.
    const stillPlease = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      nodes.forEach((path, i) => {
        gsap.set(path, { strokeDasharray: lengths[i], strokeDashoffset: lengths[i] });
      });

      if (stillPlease) {
        gsap.set(nodes, { strokeDashoffset: 0 });
        return;
      }

      gsap.to(nodes, {
        strokeDashoffset: 0,
        // Longer loops take longer, so both passes move at one believable pen
        // speed rather than finishing together.
        duration: (i: number) => lengths[i] / 780,
        // A pen accelerates out of the first bend and eases into the last.
        ease: "power1.inOut",
        stagger: 0.22,
        delay,
      });
    }, svg);

    return () => ctx.revert();
  }, [delay, paths]);

  return (
    <div
      ref={wrapRef}
      className={cn("relative", className)}
      style={{ padding: `${padY} ${padX}` }}
    >
      {box && (
        <svg
          ref={svgRef}
          aria-hidden="true"
          // `overflow-visible` matters: an outermost <svg> clips to its
          // viewBox by default, and the outward wobble plus half the stroke
          // width push the widest points a couple of pixels past it. Without
          // this the loop's extremes get sliced flat, which is exactly the
          // thing a hand-drawn stroke must never look like.
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          viewBox={`0 0 ${box.w} ${box.h}`}
          fill="none"
        >
          {paths.map((d, i) => (
            <path
              // eslint-disable-next-line react/no-array-index-key
              key={i}
              d={d}
              className="mark-stroke"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

/**
 * The pen-written aside that points at the annotated thing, e.g. "start here".
 * Same ink, same hand: a note without an arrow reads as a UI label, and the
 * arrow is what ties it to the loop.
 */
export function MarkNote({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "mark-note pointer-events-none inline-flex items-center gap-1.5 text-sm font-semibold",
        className,
      )}
    >
      {children}
      <svg
        aria-hidden="true"
        width="42"
        height="26"
        viewBox="0 0 42 26"
        fill="none"
        className="translate-y-0.5"
      >
        <path d="M2 4C12 2 26 6 34 16" className="mark-stroke" style={{ strokeWidth: 2.5 }} />
        <path
          d="M27 17.5C31 17 34 16.5 35 15.5C35.5 14 34.5 10.5 33 7"
          className="mark-stroke"
          style={{ strokeWidth: 2.5 }}
        />
      </svg>
    </span>
  );
}
