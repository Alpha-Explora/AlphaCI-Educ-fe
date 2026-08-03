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
// `minmax(0, 1fr) auto minmax(0, 1fr)` on xl, the pass alone below it:
//
//   left    the promise, the first three minutes, then the pipeline readout
//   centre  the pass. TOP-anchored, because it hangs from a hook and a hook
//           floating in the vertical centre of a page is not a hook
//   right   a preview of the workspace, then the one useful recovery note
//
// The copy column is aria-hidden and comes AFTER the form in the DOM, so
// keyboard and screen-reader users reach the fields first with no skip link.
// It is withheld below xl rather than squeezed: at that width the choice is a
// readable pass or two cramped columns, and the pass wins.
// ============================================================================
import Link from "next/link";
import { Brand } from "@/components/layout/Brand";
import { cn } from "@/components/ui/cn";
import { AuthScene } from "./AuthScene";
import {
  AuthPromise,
  AuthHelp,
  AuthWorkspacePreview,
  type AuthAsideCopy,
} from "./AuthAside";
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
}: Readonly<{
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
}>) {
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
        // Equal outer tracks keep the pass centred while giving wide monitors
        // useful content on both sides. The side content remains capped so it
        // stays readable instead of stretching to fill every last pixel.
        // `xl:pb-8`, down from pb-12: on a 768px-tall lab monitor the pass alone
        // reaches within 40px of the fold, and the old 48px of bottom padding
        // was enough on its own to push the page into a scroll it did not need.
        className="relative mx-auto grid min-h-dvh w-full max-w-[100rem] items-center gap-10 px-5 pb-16 pt-24 sm:px-10 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:items-start xl:gap-x-10 xl:px-12 xl:pb-8 xl:pt-12 2xl:gap-x-16"
      >
        {/* ------------------------------------------------------------- */}
        {/* The pass. FIRST in the DOM — it holds the form.               */}
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

        {/* THE SIDE COLUMNS SHARE ONE TOP OFFSET. Both carry the same `mt`, so
            they start on the same line as each other — a shelf the pass hangs
            past, rather than two columns that each found their own height.

            The number is a compromise between the two things that were wrong
            before. Flush with the card face, the copy sat lower than it needed
            to; at the grid's top with no offset at all it floated a full
            strap-length above the card and read as unattached to it. This lands
            between: high enough to lead the eye down to the form, low enough
            that the three objects still belong to one row.

            Deliberately NOT --strap-h: that variable shortens the lanyard on a
            squat viewport, and the columns following it would then rise on
            exactly the screens with the least room to spare.

            AND IT IS HEIGHT-GATED, for that same reason stated positively. The
            xl breakpoint is 1280px WIDE, which a 1366x768 lab monitor clears —
            so these columns are on screen at 768px of height, where the taller
            of the two already ends within ~20px of the fold. Pushing it down
            another 48px there buys a nicer top edge and pays for it with a
            scrollbar on a login page. Above 820px there is room, so the offset
            applies; below it the columns stay high and fit. */}
        <aside
          aria-hidden="true"
          className="order-2 hidden xl:order-1 xl:mt-2 xl:block xl:justify-self-start xl:[@media(min-height:820px)]:mt-12 2xl:[@media(min-height:820px)]:mt-14"
        >
          <AuthPromise copy={asideCopy} />
          <RunReadout className="mt-9" />
        </aside>

        <aside
          aria-hidden="true"
          className="order-3 hidden xl:mt-2 xl:block xl:[@media(min-height:820px)]:mt-12 2xl:[@media(min-height:820px)]:mt-14"
        >
          {/* `ml-auto` is what holds this off the card, and it is doing the job
              `justify-self-end` on the <aside> could not: the aside used to
              carry `w-full`, which makes it fill the whole track, and a grid
              item that already spans its track has nothing left to justify. The
              25rem panel inside it therefore sat at the track's LEFT edge —
              hard against the pass, with all the slack stranded out to the
              right. Pushing the inner box instead puts the empty space back
              between the two, where it reads as the gap it is.

              One wrapper for BOTH children, not a flex row on the aside: the
              preview and the help note stack, and making the aside a flex
              container would stand them side by side. */}
          <div className="ml-auto w-full max-w-[25rem]">
            <AuthWorkspacePreview copy={asideCopy} />
            <AuthHelp copy={asideCopy} />
          </div>
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
