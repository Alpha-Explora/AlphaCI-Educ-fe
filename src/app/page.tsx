"use client";
// ============================================================================
// VIEW LAYER — Landing (/)
//
// ONE door. There used to be two, because staff authenticated with GitHub and
// students with a password — asking each audience to read past the other's
// instructions was the price of that split. GitHub is no longer a login (staff
// link it after signing in), so everyone shares a single email + password form
// and the chooser has nothing left to choose between.
//
// This page previously held the entire sign-in surface AND its logic — a
// role→route map, an OAuth-error switch, and the mock persona switcher. Those
// now live in the ViewModel layer (authRoutes, useAuthNotice, useRoleSwitcher),
// leaving this file as presentation only.
//
// THE SCENE: a marked-up worksheet. The page is a sheet of ruled paper with a
// margin rule, and the one thing a first-time visitor must do is circled in
// pen. That is the whole design: the annotation is not decoration, it is the
// instruction, written in the visual language every student in the building
// already reads correctly.
//
// The circled card is deliberately OFF-CENTRE, in the right column. A centred
// hero puts the action where a browser's own chrome and every other product's
// modal already sit; parking it right, tilted, and ringed in ink makes it the
// one object on the page that looks handled rather than laid out.
//
// TEMPLATE NOTE: every name and line of copy here comes from
// src/config/brand.ts, and every colour from the palette block in globals.css.
// A school re-skins by editing those two files. Nothing below hard-codes
// either, so please keep it that way.
// ============================================================================
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { Banner, Spinner } from "@/components/ui";
import { Brand } from "@/components/layout/Brand";
import { Annotated, MarkNote } from "@/components/landing/Annotated";
import { PipelineRail } from "@/components/landing/PipelineRail";
import { ChecksRow } from "@/components/landing/ChecksRow";
import { useAuthNotice } from "@/viewmodels/useAuthNotice";
import { useRedirectIfSignedIn } from "@/viewmodels/useRedirectIfSignedIn";
import { SIGN_IN_ROUTE, STAFF_SIGN_IN_ROUTE } from "@/viewmodels/authRoutes";
import { brand, landingCopy } from "@/config/brand";

// Split once, at module scope: the greeting template never changes at runtime,
// and doing it here keeps the JSX free of string surgery.
const [greetingBefore, greetingAfter] = landingCopy.greeting.split("{cohort}");

export default function LandingPage() {
  const { isResolving } = useRedirectIfSignedIn();
  const notice = useAuthNotice();

  // A session cookie may already be present; don't flash the door before
  // /auth/me resolves.
  if (isResolving) {
    return (
      <main
        id="main-content"
        className="grid min-h-dvh place-items-center bg-[var(--bg-canvas)]"
      >
        <Spinner size="lg" />
        <span className="sr-only">Checking your session…</span>
      </main>
    );
  }

  // `overflow-x-clip`, not `overflow-hidden`: the pen loops and the tilted card
  // sit slightly outside their boxes and must not be able to widen the page,
  // but `hidden` would also trap vertical overflow in a nested scroll container
  // and clip the footer on a short laptop screen. `clip` contains the
  // horizontal axis without creating a scroll container at all.
  return (
    <main id="main-content" className="relative min-h-dvh overflow-x-clip">
      {/* The sheet. Ruled lines and a wash of the brand hue, both masked so
          they fade well before they reach any text. Decorative only. */}
      <div aria-hidden="true" className="paper-rules pointer-events-none absolute inset-0">
        <div
          className="absolute inset-x-0 top-0 h-[30rem]"
          style={{
            background:
              "radial-gradient(58rem 28rem at 22% -14%, rgb(var(--brand-600) / 0.14), transparent 70%)",
          }}
        />
      </div>

      {/* Full-bleed: no max-width, no centring. The sheet IS the window, and a
          front door that floats in a column with empty rails either side reads
          as a dialog someone forgot to finish. The layout breathes through
          page padding instead, which also gives the margin rule a gutter to
          live in (--margin-rule-x must stay smaller than the padding here). */}
      <div className="paper-margin relative flex min-h-dvh flex-col px-5 py-8 [--margin-rule-x:2.5rem] sm:px-8 lg:px-20 lg:[--margin-rule-x:2.75rem] xl:px-28 xl:[--margin-rule-x:4rem]">
        <header>
          <Brand size={40} />
        </header>

        {/* ---------------------------------------------------------------- */}
        {/* Band 1 — the message, and the one action.                        */}
        {/*                                                                  */}
        {/* Asymmetric split: the message reads left, the action sits far    */}
        {/* right, so the eye lands on the circled button last and stops     */}
        {/* there. Collapses to one column below lg, action FIRST — on a     */}
        {/* phone nobody scrolls a login page to find the button.            */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid flex-1 items-center gap-y-16 py-12 lg:grid-cols-[1.2fr_0.8fr] lg:gap-x-16 xl:gap-x-24">
          <section className="order-2 lg:order-1">
            {/* The one word on this page that belongs to THIS school. Split
                around the placeholder rather than interpolated into a string,
                so the cohort name can carry the brand colour on its own. */}
            <p
              className="animate-fade-up text-2xl font-medium text-[var(--text-muted)] sm:text-3xl xl:text-[2.5rem]"
              style={{ animationDelay: "20ms" }}
            >
              {greetingBefore}
              <span className="font-semibold text-platform-600">{brand.cohort}</span>
              {greetingAfter}
            </p>

            {/* Capped in `ch`, not pixels: at full-bleed widths a headline
                that tracks the column would run to a line length nobody can
                read back to the start of. */}
            <h1
              className="animate-fade-up mt-4 text-[2.4rem] font-semibold leading-[1.06] tracking-tight text-[var(--text-strong)] sm:text-[3.25rem] lg:max-w-[13ch] xl:text-[4.25rem] 2xl:text-[4.75rem]"
              style={{ animationDelay: "90ms" }}
            >
              {landingCopy.headline}
            </h1>
            <p
              className="animate-fade-up mt-6 max-w-[44ch] text-lg leading-relaxed text-[var(--text-muted)] xl:text-xl"
              style={{ animationDelay: "140ms" }}
            >
              {landingCopy.subline}
            </p>
          </section>

          {/* ------------------------------------------------------------ */}
          {/* The circled button. No card around it: a container would put  */}
          {/* a second boundary inside the pen loop, and two nested frames  */}
          {/* around one button is one frame too many. The loop IS the      */}
          {/* container.                                                    */}
          {/* ------------------------------------------------------------ */}
          {/* Dropped below the headline and subline on wide screens. The
              action should read as the answer to the sentence on the left,
              which means arriving after it, not alongside it. Margin rather
              than a transform, so the ink it carries stays inside the layout. */}
          <div className="order-1 flex justify-center lg:order-2 lg:mt-28 lg:justify-end xl:mt-36">
            <div className="w-full max-w-[24rem]">
              {notice && (
                <Banner tone={notice.tone} title={notice.title} className="mb-6">
                  {notice.message}
                </Banner>
              )}

              {/* Sits over the loop's own padding, so the note and the ink
                  share a gutter instead of stacking two of them. */}
              <MarkNote className="ml-6">{landingCopy.ctaAside}</MarkNote>

              {/* Not a button. The circle is the affordance here: on a marked-
                  up worksheet the thing you do is the thing that got ringed,
                  and wrapping a filled blue slab in red ink puts two competing
                  "look at me" treatments on one target. Plain words, circled.

                  `block w-fit` rather than `inline-block`: the loop must hug
                  the words instead of stretching across the column, but an
                  inline-level box would sit on the same line as the MarkNote
                  above it whenever the two happen to fit. Padding is
                  clearance, not decoration — see the ellipse-vs-rectangle
                  inequality documented in Annotated.tsx. */}
              <Annotated
                delay={0.5}
                padX="2.5rem"
                padY="1.35rem"
                className="-mt-1 block w-fit"
              >
                <Link
                  href={SIGN_IN_ROUTE}
                  className="group inline-flex items-center gap-3 rounded-lg text-[2rem] font-semibold leading-none tracking-tight text-platform-700 transition-colors duration-150 hover:text-platform-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-platform sm:text-[2.25rem]"
                >
                  {landingCopy.ctaLabel}
                  {/* Leans forward when you reach for it. Small on purpose:
                      acknowledging the cursor, not performing. */}
                  <ArrowRightIcon
                    size={26}
                    weight="bold"
                    aria-hidden="true"
                    className="transition-transform duration-200 ease-out group-hover:translate-x-1"
                  />
                </Link>
              </Annotated>

              {/* The loop's padding already reserves room for the ink, so this
                  only needs ordinary spacing. */}
              <p className="mt-1 max-w-[22rem] px-1 text-sm leading-relaxed text-[var(--text-muted)]">
                {landingCopy.ctaHint}
              </p>

              {/* The staff door, one line down and deliberately quiet.
                  The circled CTA above goes to the student door, which is
                  right — students are most of the traffic and arrive here
                  first. But staff arriving at the front page had no way to
                  reach their own page except by signing in at the wrong one
                  and being turned around, and a product whose teachers learn
                  their URL by being refused is a product with a bad first
                  day. Small type, not a second button: this is a signpost for
                  a minority, not a competing call to action. */}
              <p className="mt-3 max-w-[22rem] px-1 text-sm leading-relaxed text-[var(--text-muted)]">
                <Link
                  href={STAFF_SIGN_IN_ROUTE}
                  className="font-medium text-platform-600 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform"
                >
                  {landingCopy.staffCtaLabel}
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Band 2 — what a run is. Full width, because the pipeline is a    */}
        {/* left-to-right thing and cramming it into a column would fight    */}
        {/* the one property that makes the diagram legible.                 */}
        {/* ---------------------------------------------------------------- */}
        {/* No rule above the rail any more. It drew a hard horizontal across a
            page whose whole conceit is a sheet of ruled paper — a second, darker
            line cutting the sheet in half, competing with the rules already
            printed on it. The band is separated by space instead, which is what
            the paper metaphor was always going to prefer. The rule between the
            rail and the checks row below survives: those two are adjacent
            content that genuinely needs dividing, not a section boundary. */}
        <section className="pt-10 xl:pt-12">
          <PipelineRail delay={0.35} />
          <div className="mt-10 border-t border-[var(--border-subtle)] pt-8 xl:mt-12">
            <ChecksRow delay={0.85} />
          </div>
        </section>

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-[var(--text-muted)]">
          <p>{landingCopy.helpLine}</p>
          <p>
            Powered by{" "}
            <span className="font-medium text-[var(--text-strong)]">
              {brand.poweredBy}
            </span>
          </p>
        </footer>
      </div>
    </main>
  );
}
