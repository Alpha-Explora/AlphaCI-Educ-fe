// ============================================================================
// VIEW LAYER — the quiet columns either side of the pass.
//
// Both are DECORATIVE and both are marked aria-hidden by the shell that
// places them. That is not laziness about alt text: every fact in here is
// also reachable from the form itself or from the page the reader arrived on,
// and a screen-reader user landing on a sign-in wants the fields, not a
// second telling of the marketing.
//
// The bar for adding anything here is in config/brand.ts next to the strings:
// it must be TRUE and CHECKABLE. No invented metrics, no "10,000 students",
// no fabricated activity feed. This is a school product and the one thing it
// cannot do on its front door is lie about a number.
//
// They are separated from AuthShell so the shell stays readable as LAYOUT —
// a grid and three slots — instead of a grid with two essays inside it.
// ============================================================================
import { authPanelCopy, authAside, landingCopy } from "@/config/brand";

/**
 * The shape both aside copy sets share (`authAside`, `staffAuthAside`).
 *
 * Structural typing over a union of the two literal objects: the columns care
 * that there is a title and three steps, not which door's words they are.
 */
export interface AuthAsideCopy {
  stepsTitle: string;
  steps: readonly string[];
  helpTitle: string;
  helpBody: string;
  /** Quiet last line. Defaults to `landingCopy.helpLine` when omitted. */
  footnote?: string;
}

/** Left column: the promise, then what actually happens after the button. */
export function AuthPromise({ copy = authAside }: { copy?: AuthAsideCopy }) {
  return (
    <div className="flex flex-col justify-center">
      <p className="whitespace-pre-line text-[2.4rem] font-semibold leading-[1.1] tracking-tight text-white xl:text-[2.6rem]">
        {authPanelCopy.headline}
      </p>
      <p className="mt-4 max-w-[24rem] text-lg leading-relaxed text-white/70">
        {authPanelCopy.body}
      </p>

      {/* Numbered rather than bulleted: these are a SEQUENCE, and the numbers
          are the only thing distinguishing this list from the marks in the
          right column, which are a set. */}
      <p className="mt-9 text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
        {copy.stepsTitle}
      </p>
      <ol className="mt-4 space-y-3">
        {copy.steps.map((step, i) => (
          <li key={step} className="flex items-start gap-3">
            <span className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/12 text-xs font-semibold text-white/85 ring-1 ring-white/20">
              {i + 1}
            </span>
            <span className="max-w-[22rem] text-sm leading-relaxed text-white/75">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Foot of the right column: the one thing to do when this page fails.
 *
 * It sits under the run rather than under the form on purpose. Inside the
 * card it would be a fourth thing to read before signing in; out here it is
 * only found by somebody who has stopped and looked up, which is exactly the
 * person it is for.
 */
export function AuthHelp({ copy = authAside }: { copy?: AuthAsideCopy }) {
  return (
    // Right-aligned to finish the mirror the run above it starts. See the
    // note in RunReadout: the column is anchored to the page's right edge all
    // the way down, because half-mirroring reads as a mistake.
    <div className="mt-9 border-t border-white/15 pt-6 text-right">
      <p className="text-base font-semibold text-white/90">{copy.helpTitle}</p>
      <p className="ml-auto mt-2 max-w-[20rem] text-sm leading-relaxed text-white/60">
        {copy.helpBody}
      </p>
      {/* Falls back to the landing page's footnote, which is written for a
          student ("ask your teacher"). A door whose readers have no teacher to
          ask supplies its own. */}
      <p className="ml-auto mt-3 max-w-[20rem] text-sm leading-relaxed text-white/40">
        {copy.footnote ?? landingCopy.helpLine}
      </p>
    </div>
  );
}
