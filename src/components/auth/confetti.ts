// ============================================================================
// MOTION — the reward for pulling the pass.
//
// Framework-free on purpose: it takes a layer and a point, and it is done.
// No React, no state, no component. The physics hook reports the gesture, the
// badge decides it earned something, this draws it — three files that can each
// be changed without reading the other two.
//
// WHY IT IS THIRTY DIVS AND NOT A CANVAS
// A canvas burst needs a sized, DPR-aware surface that has to be kept in sync
// with a layout that swings, and it draws in colours it has to be TOLD. These
// particles are ordinary elements wearing ordinary utility classes, which
// means they take the school's palette the same way every other element on the
// page does — see the colour note below. Thirty nodes for 1.6s is nothing;
// getting re-skinning wrong is not.
// ============================================================================
import { gsap } from "gsap";

/**
 * Every entry is a TOKEN-BACKED utility, never a literal colour. `platform` is
 * the brand ramp and the three accents are palette variables, so a school that
 * re-skins `globals.css` gets confetti in its own colours without touching
 * this file. Adding a `bg-[#ff0]` here would be the one thing that breaks that
 * promise, and it would only be visible to the school that re-skinned.
 */
const COLORS = [
  "bg-platform-200",
  "bg-platform-400",
  "bg-platform-600",
  "bg-mint",
  "bg-sun",
  "bg-grape",
  "bg-white",
];

const COUNT = 30;
/** Above this many live particles we skip the burst rather than pile up. */
const MAX_LIVE = 90;

/** Spread of the initial fan, radians either side of straight up. */
const FAN = 0.9;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Throw a burst of confetti from `origin`, in coordinates relative to `layer`.
 *
 * `layer` must be positioned and should be `pointer-events-none` and
 * `aria-hidden` — this is decoration landing on top of a form, and it must not
 * be able to swallow a click on the password field or announce itself.
 */
export function burstConfetti(layer: HTMLElement, origin: { x: number; y: number }) {
  if (layer.childElementCount > MAX_LIVE) return;

  for (let i = 0; i < COUNT; i++) {
    const piece = document.createElement("span");
    const round = i % 3 === 0;
    piece.className = `absolute block ${COLORS[i % COLORS.length]} ${
      round ? "h-1.5 w-1.5 rounded-full" : "h-2.5 w-1.5 rounded-[1px]"
    }`;
    layer.appendChild(piece);

    // Straight up, fanned. Screen Y points down, hence the negative sine.
    const angle = -Math.PI / 2 + rand(-FAN, FAN);
    const speed = rand(90, 220);
    const driftX = Math.cos(angle) * speed;
    const riseY = Math.sin(angle) * speed;

    gsap.set(piece, {
      x: origin.x,
      y: origin.y,
      rotation: rand(0, 360),
      scale: rand(0.7, 1.25),
    });

    // Two independent axes, which is what makes it read as thrown rather than
    // as a shape being tweened: X carries on drifting the whole time while Y
    // rises, stalls and falls under its own ease.
    const flight = gsap.timeline({ onComplete: () => piece.remove() });
    flight
      .to(piece, { x: origin.x + driftX, duration: 1.5, ease: "power2.out" }, 0)
      .to(piece, { rotation: `+=${rand(180, 540)}`, duration: 1.5, ease: "none" }, 0)
      .to(piece, { y: origin.y + riseY, duration: 0.45, ease: "power2.out" }, 0)
      .to(piece, { y: origin.y + rand(220, 400), duration: 1.05, ease: "power1.in" }, 0.45)
      .to(piece, { opacity: 0, duration: 0.4, ease: "power1.in" }, 1.1);
  }
}
