// ============================================================================
// VIEW LAYER — shared chrome for every auth page.
//
// Pure presentation. No hooks, no data access, no navigation decisions: the
// pages pass in their own copy and form. Both sign-in doors — and any future
// reset-password / accept-invite page — use this so they cannot drift apart.
//
// Layout: a two-column split on lg+, stacked on mobile. The blue welcome panel
// is DECORATIVE and comes second in the DOM, so keyboard and screen-reader
// users reach the form first without needing a skip link.
//
// SCENE: the form column carries the same ruled paper as the landing page, so
// the two doors read as one product. What it does NOT carry is the felt-tip
// ink. This form already uses red for validation (`border-danger`,
// `text-danger`), and a red annotation on the same screen would put two
// meanings on one colour — "do this" and "you got this wrong". The error state
// would lose that argument, so the pen stays on the landing page.
// ============================================================================
import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import { Brand } from "@/components/layout/Brand";
import { cn } from "@/components/ui/cn";
import { ICON_WEIGHT } from "@/components/landing/Icons";
import { brand, authPanelCopy } from "@/config/brand";

export interface AuthHighlight {
  /**
   * A vector icon component, not an emoji. Emoji render differently on every
   * OS in the lab, cannot take the brand colour, and read as decoration where
   * these need to read as UI.
   */
  icon: Icon;
  title: string;
  body: string;
}

export function AuthShell({
  eyebrow,
  heading,
  subheading,
  highlights,
  children,
  footer,
}: {
  /**
   * Small label above the welcome heading, e.g. "Password help". OPTIONAL, and
   * worth omitting: on the main sign-in page it repeated the wordmark sitting
   * 40px directly above it, which is a label telling you what you can already
   * read. Pass one only when it says something the heading does not.
   */
  eyebrow?: string;
  /** ReactNode, not string, so a page can colour part of it (the cohort name). */
  heading: React.ReactNode;
  subheading: string;
  /** Three reassuring "here's what this is for" points on the blue panel. */
  highlights: AuthHighlight[];
  /** The form card contents. */
  children: React.ReactNode;
  /** Cross-link to the other door. */
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* ---------------------------------------------------------------- */}
      {/* Form column — first in the DOM so it gets focus order priority.  */}
      {/* ---------------------------------------------------------------- */}
      {/* `paper-rules` paints through an ::before, which is a positioned box
          and therefore paints ABOVE normal-flow content. The content wrapper
          below is `relative` for exactly that reason: once both are
          positioned, DOM order decides, and the rules go behind. */}
      <main
        id="main-content"
        className="paper-rules relative order-1 flex flex-col justify-center overflow-hidden bg-[var(--bg-surface)] px-5 py-10 sm:px-10 lg:px-16"
      >
        <div className="relative mx-auto w-full max-w-[26rem]">
          <Link
            href="/"
            className="inline-flex rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform"
            aria-label={`${brand.name} home`}
          >
            <Brand size={36} />
          </Link>

          <div className="mt-9">
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-wider text-platform-600">
                {eyebrow}
              </p>
            )}
            <h1
              className={cn(
                "text-[1.75rem] font-semibold leading-tight text-[var(--text-strong)]",
                eyebrow && "mt-2",
              )}
            >
              {heading}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
              {subheading}
            </p>
          </div>

          <div className="mt-7">{children}</div>

          {footer && (
            <div className="mt-8 border-t border-[var(--border-subtle)] pt-5 text-sm text-[var(--text-muted)]">
              {footer}
            </div>
          )}
        </div>
      </main>

      {/* ---------------------------------------------------------------- */}
      {/* Welcome column — decorative, hidden from assistive tech and from  */}
      {/* small screens entirely (it carries no information the form needs).*/}
      {/* ---------------------------------------------------------------- */}
      {/* Everything in here is anchored to the panel's RIGHT edge, and mirrored
          to suit: icons sit after their text (`flex-row-reverse`) and the
          wordmark reverses too. Half-mirroring is what looks like a mistake —
          a right-aligned heading over a left-aligned list reads as a bug, so
          the alignment is carried all the way through.

          The message block is vertically CENTRED rather than distributed with
          `justify-between`; the brand and the footnote are pinned to the
          corners instead. Three-way distribution left a dead band between the
          list and the footnote that got wider on every taller screen. */}
      <aside
        aria-hidden="true"
        className="auth-hero auth-grid relative order-2 hidden flex-col justify-center overflow-hidden p-12 lg:flex"
      >
        <Brand
          onDark
          size={36}
          className="absolute right-12 top-12 flex-row-reverse text-right"
        />

        <div className="relative ml-auto max-w-md text-right">
          <p className="whitespace-pre-line text-[2rem] font-semibold leading-[1.2] text-white">
            {authPanelCopy.headline}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/80">
            {authPanelCopy.body}
          </p>

          <ul className="mt-9 space-y-4">
            {highlights.map((item) => (
              <li key={item.title} className="flex flex-row-reverse gap-3.5">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15 text-white ring-1 ring-white/20"
                  aria-hidden="true"
                >
                  <item.icon size={19} weight={ICON_WEIGHT} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-white/70">
                    {item.body}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="absolute bottom-12 right-12 text-right">
          <p className="text-xs text-white/60">{authPanelCopy.footnote}</p>
          <p className="mt-1.5 text-xs text-white/45">
            Powered by <span className="text-white/70">{brand.poweredBy}</span>
          </p>
        </div>
      </aside>
    </div>
  );
}

/** The white card the form sits in. Separate so pages can place siblings. */
export function AuthCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-[var(--border-subtle)] bg-white p-5 shadow-card sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
