// ============================================================================
// VIEW LAYER — the useful context around the sign-in pass.
//
// The left side explains the first push. The right side previews the workspace
// waiting after sign-in. Together they use a wide classroom monitor without
// turning the page into marketing filler or moving attention away from the
// form in the middle.
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
import { ICON_WEIGHT, LANDING_ICONS } from "@/components/landing/Icons";

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
  workspaceEyebrow: string;
  workspaceTitle: string;
  workspaceBody: string;
  workspaceItems: readonly {
    icon: string;
    title: string;
    body: string;
  }[];
  accessTitle: string;
  accessBody: string;
}

/** Head of the column: the promise, then what actually happens after the button. */
export function AuthPromise({ copy = authAside }: Readonly<{ copy?: AuthAsideCopy }>) {
  return (
    <div className="flex flex-col">
      {/* Larger than it was. With the right column gone this headline is the
          only thing balancing a 24rem card, and at 2.4rem it was losing.
          Capped at the width where the copy's own line break is the ONLY break:
          the string carries a \n after "gets", and any size that also wraps
          "Every push gets" turns a two-line headline into a ragged three. */}
      <p className="whitespace-pre-line text-[2.4rem] font-semibold leading-[1.05] tracking-tight text-white xl:text-[2.75rem] 2xl:text-[3rem]">
        {authPanelCopy.headline}
      </p>
      <p className="mt-5 max-w-[26rem] text-lg leading-relaxed text-white/70 2xl:text-xl">
        {authPanelCopy.body}
      </p>

      {/* Numbered rather than bulleted: these are a SEQUENCE, and the numbers
          are the only thing distinguishing this list from the marks in the run
          below, which are a set. */}
      <p className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
        {copy.stepsTitle}
      </p>
      <ol className="mt-4 space-y-2.5">
        {copy.steps.map((step, i) => (
          <li key={step} className="flex items-start gap-3">
            <span className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/12 text-xs font-semibold text-white/85 ring-1 ring-white/20">
              {i + 1}
            </span>
            <span className="max-w-[24rem] text-[0.9375rem] leading-relaxed text-white/75">
              {step}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Foot of the column: the one thing to do when this page fails.
 *
 * It sits under the workspace preview rather than under the form on purpose. Inside the
 * card it would be a fourth thing to read before signing in; out here it is
 * only found by somebody who has stopped and looked up, which is exactly the
 * person it is for.
 *
 * The title and body now read on ONE line where they fit. Two stacked
 * paragraphs plus a footnote was a third block of prose on a page with two
 * fields, and it was the block least likely to be read — so it earns the least
 * room, not a heading of its own.
 */
export function AuthHelp({ copy = authAside }: Readonly<{ copy?: AuthAsideCopy }>) {
  return (
    <div className="mt-6 border-t border-white/15 pt-4">
      <p className="max-w-[30rem] text-sm leading-relaxed text-white/60">
        <span className="font-semibold text-white/85">{copy.helpTitle}</span>{" "}
        {copy.helpBody}
      </p>
      {/* Falls back to the landing page's footnote, which is written for a
          student ("ask your teacher"). A door whose readers have no teacher to
          ask supplies its own. */}
      <p className="mt-2 max-w-[30rem] text-sm leading-relaxed text-white/40">
        {copy.footnote ?? landingCopy.helpLine}
      </p>
    </div>
  );
}

/** Right column: a compact, honest preview of what the account opens. */
export function AuthWorkspacePreview({
  copy = authAside,
}: Readonly<{
  copy?: AuthAsideCopy;
}>) {
  return (
    <div className="w-full max-w-[25rem]">
      <section className="rounded-[1.75rem] border border-white/15 bg-white/[0.09] p-5 shadow-[0_24px_70px_-35px_rgb(var(--brand-900)/0.8)] backdrop-blur-md 2xl:p-6">
        <div className="flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-white/55">
          <span className="h-2 w-2 rounded-full bg-mint shadow-[0_0_0_4px_rgb(255_255_255/0.06)]" />
          {copy.workspaceEyebrow}
        </div>

        <h2 className="mt-4 max-w-[19rem] text-[1.55rem] font-semibold leading-tight tracking-tight text-white">
          {copy.workspaceTitle}
        </h2>
        <p className="mt-2.5 max-w-[21rem] text-[0.8125rem] leading-relaxed text-white/60">
          {copy.workspaceBody}
        </p>

        <ul className="mt-5 space-y-2.5">
          {copy.workspaceItems.map((item) => {
            const Glyph = LANDING_ICONS[item.icon];

            return (
              <li
                key={item.title}
                className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-3"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/12 text-white ring-1 ring-white/15">
                  <Glyph size={20} weight={ICON_WEIGHT} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white/90">
                    {item.title}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-white/55">
                    {item.body}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-3.5 flex gap-3 rounded-2xl border border-white/10 bg-[rgb(var(--brand-900)/0.22)] p-3.5">
        <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/15">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 13c0 5-3.5 7.5-8 8.8C7.5 20.5 4 18 4 13V5.5L12 2l8 3.5V13Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </span>
        <p className="text-xs leading-relaxed text-white/55">
          <span className="block text-sm font-semibold text-white/85">
            {copy.accessTitle}
          </span>
          <span className="mt-0.5 block">{copy.accessBody}</span>
        </p>
      </div>
    </div>
  );
}
