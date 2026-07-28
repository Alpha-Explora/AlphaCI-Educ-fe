"use client";
// ============================================================================
// MOTION — the pass on its lanyard, as a simulation.
//
// WHY THIS IS NOT IN src/viewmodels/
// Everything in that folder owns APPLICATION state: fields, validation, what
// the API said, where to navigate. This hook owns none of it. It holds two
// numbers describing where a decoration is currently hanging, writes them
// straight to the DOM, and would be deleted the day the design changes. Put
// that in viewmodels and the layer stops meaning anything. It lives beside
// the component it moves, which is the only thing that will ever import it.
//
// THE MODEL — two degrees of freedom, each with its own spring:
//
//   θ  ANGLE     a pendulum. Restoring force −g·sin θ, damped per frame.
//                Modelled as TWO joints — the strap's angle, and the card
//                spring-coupled to it so it lags and overshoots at the clip.
//                One rigid rotation looks like a windscreen wiper; the lag is
//                what makes it read as cardboard on webbing.
//
//   s  STRETCH   how far the webbing has been pulled past its rest length.
//                Pure spring, no gravity — a strap does not hang longer than
//                it is, it only comes back. Resistance rises as you pull, so
//                it feels like elastic rather than a slider.
//
// They compose: you can pull and swing at once. `s` at the moment of release
// is handed to `onRelease`, which is how the caller decides whether the pull
// earned a celebration — a plain sideways swing never has any stretch to
// report, so it can never fire one.
//
// Nothing here re-renders React. Both numbers are written with gsap
// quickSetters on the existing ticker, and the ticker is REMOVED once the
// motion falls below what an eye can see — a login page has no business
// holding a rAF open while somebody types their password.
// ============================================================================
import { useCallback, useEffect, useRef } from "react";
import { gsap } from "gsap";

// --- Tuning ---------------------------------------------------------------
// Angles are DEGREES, velocities are degrees-per-60fps-frame, stretch is PX.
// Keeping the sim in the units the transforms want avoids conversions in the
// hot loop.

/** Sets the PERIOD, and period is what communicates mass. 0.5 ≈ 1.1s, close
 *  to a real 50cm lanyard. Higher was the swing of a keyring. */
const GRAVITY = 0.5;
/** Per frame. "How long until the page is quiet" — 0.978 is still by ~3s. */
const SWING_DAMPING = 0.978;
/** Used once focus lands inside the card. Quiets it in about a second. */
const CALM_DAMPING = 0.85;
/** How hard the strap chases the pointer. */
const DRAG_FOLLOW = 0.35;
/** deg. Beyond this the card leaves the column it lives in. */
const MAX_ANGLE = 14;
const MAX_ANGLE_NARROW = 7;

const CARD_STIFFNESS = 0.055; // the clip joint. Lower = floppier card.
const CARD_DAMPING = 0.88; // <1 leaves the overshoot that sells the weight.
const CARD_MAX_LAG = 9; // deg. Past this the card looks detached.

/** px. The asymptote — pull forever and the webbing still stops here. */
const MAX_STRETCH = 96;
const MAX_STRETCH_NARROW = 64;
/** Recoil spring. Stiffer and less damped than the swing, so it SNAPS back. */
const STRETCH_STIFFNESS = 0.12;
const STRETCH_DAMPING = 0.82;
/** px the strap may go slack past rest on the rebound, before it catches. */
const MAX_SLACK = 14;

const TILT_PER_SPEED = 18; // deg of rotateY per deg/frame of swing.
const MAX_TILT = 12;

// Below this in every term the loop parks. Set at the point where motion
// stops being visible, NOT at zero: an exponential decay approaches zero
// without arriving, so a stricter threshold buys nothing an eye can see.
const REST_ANGLE = 0.05;
const REST_SPEED = 0.01;
const REST_STRETCH = 0.4;

const DEG = Math.PI / 180;
const clamp = (v: number, limit: number) => Math.min(Math.max(v, -limit), limit);

export interface LanyardSwing {
  /** The pivot. Never rotates — every angle is measured from it. */
  hookRef: React.RefObject<HTMLSpanElement>;
  /** Rotates by θ about the hook. */
  armRef: React.RefObject<HTMLDivElement>;
  /** Scales along Y by the stretch. */
  strapRef: React.RefObject<HTMLDivElement>;
  /** Rotates by the lag and translates down by the stretch. */
  cardRef: React.RefObject<HTMLDivElement>;
  /** Spread onto every surface that should be grabbable. */
  dragProps: {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
    onPointerCancel: (event: React.PointerEvent<HTMLElement>) => void;
  };
}

export function useLanyardSwing({
  onRelease,
}: {
  /**
   * Called on pointer-up with how far the strap was stretched, in px. The
   * hook has no opinion about what that earns — it reports the gesture and
   * the caller decides. Keeps the physics ignorant of confetti.
   */
  onRelease?: (stretchPx: number) => void;
} = {}): LanyardSwing {
  const hookRef = useRef<HTMLSpanElement>(null);
  const armRef = useRef<HTMLDivElement>(null);
  const strapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Every mutable number the simulation owns. In a ref, not state: this
  // changes 60 times a second and none of it belongs in the render tree.
  const sim = useRef({
    theta: 0,
    omega: 0,
    cardTheta: 0,
    cardOmega: 0,
    stretch: 0,
    stretchVel: 0,
    targetStretch: 0,
    dragging: false,
    calming: false,
    target: 0,
    grabOffset: 0,
    grabDepth: 0,
    pivotX: 0,
    pivotY: 0,
    maxAngle: MAX_ANGLE,
    maxStretch: MAX_STRETCH,
    strapHeight: 56,
  });

  // Set by the mount effect so the pointer handlers can wake a parked loop.
  const startLoop = useRef<() => void>(() => {});
  const reducedMotion = useRef(false);
  // Latest callback without re-running the effect that owns the ticker.
  const releaseRef = useRef(onRelease);
  releaseRef.current = onRelease;

  useEffect(() => {
    const arm = armRef.current;
    const card = cardRef.current;
    const strap = strapRef.current;
    if (!arm || !card || !strap) return;

    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Small screens get a shallower swing and a shorter pull: the card is a
    // fixed width but the room either side of it is not, and a 14° throw on a
    // 360px phone puts the corner off the screen.
    const measure = () => {
      const narrow = window.innerWidth < 640;
      sim.current.maxAngle = narrow ? MAX_ANGLE_NARROW : MAX_ANGLE;
      sim.current.maxStretch = narrow ? MAX_STRETCH_NARROW : MAX_STRETCH;
      // The strap's rest height is a clamp() of viewport height, so it has to
      // be read from the DOM rather than assumed — scaleY needs a divisor.
      sim.current.strapHeight = strap.offsetHeight || 56;
    };
    measure();
    window.addEventListener("resize", measure);

    const setArm = gsap.quickSetter(arm, "rotation", "deg") as (v: number) => void;
    const setCard = gsap.quickSetter(card, "rotation", "deg") as (v: number) => void;
    const setTilt = gsap.quickSetter(card, "rotationY", "deg") as (v: number) => void;
    const setDrop = gsap.quickSetter(card, "y", "px") as (v: number) => void;
    const setStrap = gsap.quickSetter(strap, "scaleY") as (v: number) => void;

    if (reducedMotion.current) {
      setArm(0);
      setCard(0);
      setTilt(0);
      setDrop(0);
      setStrap(1);
      return () => window.removeEventListener("resize", measure);
    }

    let running = false;

    const tick = () => {
      const s = sim.current;
      // deltaRatio keeps the sim frame-rate independent; the cap stops a
      // backgrounded tab from resuming with one enormous integration step
      // that flings the card off its hook.
      const d = Math.min(gsap.ticker.deltaRatio(60), 3);

      if (s.dragging) {
        const previous = s.theta;
        // Exponential chase, corrected for frame length, so the strap feels
        // the same on a 60Hz and a 144Hz display.
        const follow = 1 - Math.pow(1 - DRAG_FOLLOW, d);
        s.theta += (s.target - s.theta) * follow;
        s.stretch += (s.targetStretch - s.stretch) * follow;
        // Velocity is measured, not assigned, so letting go mid-sweep throws
        // the card exactly as hard as the hand was moving it.
        s.omega = (s.theta - previous) / d;
        s.stretchVel = 0;
      } else {
        const damping = s.calming ? CALM_DAMPING : SWING_DAMPING;
        s.omega = (s.omega + -GRAVITY * Math.sin(s.theta * DEG) * d) * Math.pow(damping, d);
        s.theta += s.omega * d;
        // Recoil: a spring straight back to rest length, with enough left in
        // it to overshoot once. That bounce is the whole feel of letting go.
        s.stretchVel = (s.stretchVel - s.stretch * STRETCH_STIFFNESS * d) * Math.pow(STRETCH_DAMPING, d);
        s.stretch += s.stretchVel * d;
        // Webbing goes SLACK, it does not compress. Unbounded, the recoil
        // shortened the strap to 72% of its length, which is a rubber band
        // rather than a lanyard. It bounces off the limit with most of its
        // energy gone, which reads as the card catching on the strap.
        if (s.stretch < -MAX_SLACK) {
          s.stretch = -MAX_SLACK;
          s.stretchVel *= -0.3;
        }
      }

      // The clip joint: a damped spring pulling the card towards the strap.
      const pull = (s.theta - s.cardTheta) * CARD_STIFFNESS;
      s.cardOmega = (s.cardOmega + pull * d) * Math.pow(CARD_DAMPING, d);
      s.cardTheta += s.cardOmega * d;

      setArm(s.theta);
      setCard(clamp(s.cardTheta - s.theta, CARD_MAX_LAG));
      // A card on a strap does not stay square to the viewer while it swings.
      setTilt(clamp(s.omega * TILT_PER_SPEED, MAX_TILT));
      setDrop(s.stretch);
      // The webbing lengthens rather than moving: origin-top scaleY, so the
      // hook end stays pinned and only the clip end travels.
      setStrap((s.strapHeight + s.stretch) / s.strapHeight);

      const asleep =
        !s.dragging &&
        Math.abs(s.theta) < REST_ANGLE &&
        Math.abs(s.omega) < REST_SPEED &&
        Math.abs(s.cardTheta) < REST_ANGLE &&
        Math.abs(s.cardOmega) < REST_SPEED &&
        Math.abs(s.stretch) < REST_STRETCH &&
        Math.abs(s.stretchVel) < REST_STRETCH;

      if (asleep) {
        s.theta = s.omega = s.cardTheta = s.cardOmega = 0;
        s.stretch = s.stretchVel = 0;
        s.calming = false;
        setArm(0);
        setCard(0);
        setTilt(0);
        setDrop(0);
        setStrap(1);
        gsap.ticker.remove(tick);
        running = false;
      }
    };

    const start = () => {
      if (running) return;
      gsap.ticker.add(tick);
      running = true;
    };
    startLoop.current = start;

    // Focus inside the card kills the motion. Typing a password into a
    // swinging box is a usability failure, and the moment somebody starts is
    // exactly when the toy has to get out of the way.
    const calm = () => {
      if (sim.current.dragging) return;
      sim.current.calming = true;
      start();
    };
    card.addEventListener("focusin", calm);

    // Arrival: the pass drops onto its hook and settles. ONCE — it does not
    // idle-sway, because a form has to win any competition for attention and
    // perpetual motion beside one is a fight it loses.
    //
    // The target is the ARM, deliberately not its parent. A transform on the
    // badge's root would make it the containing block for `position: fixed`
    // descendants, and the confetti layer is fixed precisely so a burst cannot
    // grow the document or raise a scrollbar. gsap merges this `y` with the
    // `rotation` the ticker writes, so both can own the same element safely.
    const intro = gsap.fromTo(
      arm,
      { autoAlpha: 0, y: -26 },
      { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" },
    );
    sim.current.theta = 9;
    sim.current.omega = -0.45;
    start();

    return () => {
      intro.kill();
      card.removeEventListener("focusin", calm);
      window.removeEventListener("resize", measure);
      gsap.ticker.remove(tick);
      running = false;
    };
  }, []);

  /**
   * The CSS rotation that puts the card under the pointer.
   *
   * The negation is not a fudge and must not be "tidied away". Screen Y points
   * DOWN, so for a body hanging below its pivot a POSITIVE (clockwise) CSS
   * rotation carries the card LEFT: the point (0, L) maps to (−L·sinθ, L·cosθ).
   * Without the flip the pass slides away from the cursor, which is the one
   * thing a drag is never allowed to do.
   */
  const angleAt = (clientX: number, clientY: number) => {
    const s = sim.current;
    // Guard the vertical term: a pointer level with (or above) the hook would
    // otherwise divide towards ±90° and snap the card sideways.
    const dy = Math.max(clientY - s.pivotY, 24);
    return (-Math.atan2(clientX - s.pivotX, dy) * 180) / Math.PI;
  };

  /**
   * How far BELOW the hook the pointer is. Vertical only, and that is the
   * whole point.
   *
   * The obvious measure — radial distance from the hook — is wrong, and
   * wrong in a way that only shows up once confetti is attached to it.
   * Swing sideways while staying level and Pythagoras still grows the
   * distance (300px down, 200px across reads as 360px), so a hard sideways
   * swing silently counted as a 60px pull and fired the celebration. Stretch
   * now means what a reader thinks it means: pull DOWN. A level swing
   * produces exactly zero, no matter how far it travels.
   */
  const depthAt = (clientY: number) => clientY - sim.current.pivotY;

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (reducedMotion.current) return;
    const hook = hookRef.current;
    if (!hook) return;

    // The pivot is measured from the HOOK, which never rotates. Measuring the
    // arm instead would work exactly once: its bounding box moves as it
    // swings, so a second grab would be computed against a lie.
    const box = hook.getBoundingClientRect();
    const s = sim.current;
    s.pivotX = box.left + box.width / 2;
    s.pivotY = box.top + box.height / 2;
    // Both offsets exist so the pass does not teleport under the cursor on
    // grab: we remember where it was relative to the hand, not just where the
    // hand is.
    s.grabOffset = angleAt(event.clientX, event.clientY) - s.theta;
    s.grabDepth = depthAt(event.clientY) - s.stretch;
    s.target = s.theta;
    s.targetStretch = s.stretch;
    s.dragging = true;
    s.calming = false;

    event.currentTarget.setPointerCapture(event.pointerId);
    // Stops the drag from selecting the header text on its way past.
    event.preventDefault();
    startLoop.current();
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const s = sim.current;
    if (!s.dragging) return;
    s.target = clamp(angleAt(event.clientX, event.clientY) - s.grabOffset, s.maxAngle);

    // Resistance. A linear pull would let the card be dragged to the floor;
    // this approaches maxStretch asymptotically, so the webbing gets harder to
    // pull the further it goes and never reaches an end you can hit.
    const pulled = Math.max(0, depthAt(event.clientY) - s.grabDepth);
    s.targetStretch = s.maxStretch * (1 - Math.exp(-pulled / s.maxStretch));
  }, []);

  const endDrag = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const s = sim.current;
    if (!s.dragging) return;
    s.dragging = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    releaseRef.current?.(s.stretch);
  }, []);

  return {
    hookRef,
    armRef,
    strapRef,
    cardRef,
    dragProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
