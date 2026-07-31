// ============================================================================
// VIEW LAYER — shared chrome for every auth page.
//
// LAYOUT ONLY. The room, the pass, the two aside columns and the run all live
// in their own files; this one decides where they go and hands the page's copy
// to the card. If you are reading this to change a colour or a sentence, you
// are in the wrong file:
//
//   AuthScene.tsx        the background field and its drift
//   LanyardBadge.tsx     the pass (static — it no longer swings)
//   AuthAside.tsx        the two decorative columns
//   RunReadout.tsx       the pipeline story
//   config/brand.ts      every string on this page
//
// Both sign-in doors — and any future reset-password / accept-invite page —
// use this shell so they cannot drift apart.
//
// THE SCENE: one pass, hanging in the middle of the room.
//
// This replaced a two-column split (form left, decorative panel right), which
// had an honest problem: the panel was the interesting half of the screen and
// the form was the half you came to use, so the design spent its best real
// estate on the thing nobody was there for. Centring the form inside the
// badge collapses that — the object you look at and the object you use are
// now the same object, and the copy around it can be quiet because it no
// longer has to compete for the middle.
//
// A three-column grid on xl, the middle column alone below it:
//
//   left    the promise, and the first three minutes after the button
//   centre  the pass. TOP-anchored, because it hangs from a hook and a hook
//           floating in the vertical centre of a page is not a hook
//   right   the run — stages, marks, verdict — then where to get help
//
// The outer columns are aria-hidden and come AFTER the form in the DOM, so
// keyboard and screen-reader users reach the fields first with no skip link.
// They are withheld below xl rather than squeezed: at that width the choice
// is a readable pass or three cramped columns, and the pass wins.
// ============================================================================
import Link from "next/link";
import { Brand } from "@/components/layout/Brand";
import { cn } from "@/components/ui/cn";
import { AuthScene } from "./AuthScene";
import { AuthPromise, AuthHelp, type AuthAsideCopy } from "./AuthAside";
import { LanyardBadge } from "./LanyardBadge";
import { RunReadout } from "./RunReadout";
import { brand, badgeCopy, authAside, staffAuthAside } from "@/config/brand";

/**
 * Which copy set the decorative columns use.
 *
 * Not derived from the route, deliberately: /signin/forgot-password and
 * /auth/reset-password serve BOTH audiences from one page and cannot honestly
 * pick either, so they take the default. A prop lets them abstain; a route
 * lookup would force a wrong guess.
 */
const ASIDE_COPY: Record<"student" | "staff", AuthAsideCopy> = {
  student: authAside,
  staff: staffAuthAside,
};

export function AuthShell({
  eyebrow,
  heading,
  subheading,
  children,
  footer,
  aside = "student",
}: {
  /**
   * Small label above the welcome heading, e.g. "Password help". OPTIONAL,
   * and worth omitting: on the main sign-in page it repeated the wordmark
   * sitting directly above it, which is a label telling you what you can
   * already read. Pass one only when it says something the heading does not.
   */
  eyebrow?: string;
  /** ReactNode, not string, so a page can colour part of it (the cohort). */
  heading: React.ReactNode;
  subheading: string;
  /** The form, printed on the card face. */
  children: React.ReactNode;
  /** Cross-link to the other door, at the foot of the card face. */
  footer?: React.ReactNode;
  /**
   * Whose story the two decorative columns tell. Defaults to "student" — the
   * larger audience, and the right answer for the pages that serve both.
   */
  aside?: "student" | "staff";
}) {
  const asideCopy = ASIDE_COPY[aside];

  return (
    <AuthScene>
      <Link
        href="/"
        className="absolute left-6 top-6 z-20 inline-flex rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:left-10 sm:top-8"
        aria-label={`${brand.name} home`}
      >
        {/* Mark only. The full wordmark is printed on the pass, and a school
            name twice on one screen is the second one being ignored — this
            corner's job is "way back", not identity. */}
        <Brand onDark size={36} compact />
      </Link>

      <main
        id="main-content"
        // The asides are justified to their outer edges, so on a big monitor
        // the two columns sit AT the sides of the screen rather than huddling
        // against the pass with a dead margin outside them. `1fr auto 1fr`
        // keeps the pass optically centred however far apart they end up.
        // The cap is wide but not absent: without one, an ultrawide would
        // strand the columns a metre from the thing they describe.
        className="relative mx-auto grid min-h-dvh w-full max-w-[112rem] items-center gap-10 px-5 pb-16 pt-24 sm:px-10 xl:grid-cols-[1fr_auto_1fr] xl:gap-12 xl:pt-16"
      >
        {/* ------------------------------------------------------------- */}
        {/* The pass. FIRST in the DOM — it holds the form.               */}
        {/* `self-start` keeps it hanging from the top of the grid while   */}
        {/* the aside columns stay optically centred on it.                */}
        {/* ------------------------------------------------------------- */}
        <div className="order-1 flex justify-center xl:order-2 xl:self-start">
          <LanyardBadge
            header={
              <div className="flex items-end justify-between gap-3 pt-1">
                <Brand onDark size={30} />
                <span className="pb-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  {badgeCopy.kind}
                </span>
              </div>
            }
          >
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-wider text-platform-600">
                {eyebrow}
              </p>
            )}
            <h1
              className={cn(
                "text-[1.4rem] font-semibold leading-tight text-[var(--text-strong)]",
                eyebrow && "mt-1.5",
              )}
            >
              {heading}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">
              {subheading}
            </p>

            <div className="mt-5">{children}</div>

            {footer && (
              <div className="mt-5 border-t border-[var(--border-subtle)] pt-4 text-xs leading-relaxed text-[var(--text-muted)]">
                {footer}
              </div>
            )}
          </LanyardBadge>
        </div>

        {/* Each aside hugs its own outer edge — the left column starts at the
            left of the page, the right column ends at the right of it — and on
            a tall enough screen both start at the CARD'S TOP EDGE rather than
            floating in the vertical middle.

            The offset is the hook (h-2.5) plus the strap: exactly how far
            below the column top the card face begins. Written from the same
            --strap-h the strap itself uses, so a viewport that shortens the
            lanyard moves all three in step instead of leaving the columns at
            a height nothing else agrees with.

            WHY THE HEIGHT GATE. Top-aligned, the right column needs about
            810px of viewport (151 top + 594 tall + the page's bottom padding).
            Below that it ran 41px past the fold on the 768px lab monitor this
            product is built for — a login page that scrolls is a worse
            outcome than one whose columns are centred. Under 860px they fall
            back to the grid's `items-center`, which is what they did before
            and which fits. */}
        <aside
          aria-hidden="true"
          className="order-2 hidden xl:order-1 xl:block xl:justify-self-start xl:[@media(min-height:860px)]:mt-[calc(var(--strap-h)_+_0.625rem)] xl:[@media(min-height:860px)]:self-start"
        >
          <AuthPromise copy={asideCopy} />
        </aside>

        <aside
          aria-hidden="true"
          className="order-3 hidden xl:block xl:justify-self-end xl:[@media(min-height:860px)]:mt-[calc(var(--strap-h)_+_0.625rem)] xl:[@media(min-height:860px)]:self-start"
        >
          <RunReadout />
          <AuthHelp copy={asideCopy} />
        </aside>
      </main>

      <p
        aria-hidden="true"
        className="pointer-events-none absolute bottom-6 right-6 text-xs text-white/45 sm:right-10"
      >
        Powered by <span className="text-white/70">{brand.poweredBy}</span>
      </p>
    </AuthScene>
  );
}
