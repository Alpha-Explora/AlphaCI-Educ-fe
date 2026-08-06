// VIEW LAYER — detail page header with optional back link + breadcrumb.
//
// ONE ROW, READ LEFT TO RIGHT: where you came from, then what this page is,
// then anything you can do to it.
//
// The title block used to be right-ALIGNED at the far end of this row, opposite
// the back button. On a laptop that put the page's own name in the last place
// anyone looks, with a foot of empty band between it and the only other thing in
// the header — so the heading read as a watermark and the back button read as
// the page title. The two now sit together on the left and the actions take the
// right, which is the same reading order every other detail view in the product
// already uses.
//
// STILL ONE ROW, deliberately. The back link on its own line above the title
// spends a whole row of vertical space on six words, and it is a row that
// appears on every detail page in the product — roughly 40px taken off the top
// of the content each time. It wraps to a second line only when the viewport
// cannot fit both, which is the one case where the space is not a waste.
import Link from "next/link";
import { cn } from "@/components/ui";

/**
 * The back control on its own.
 *
 * Exported because one caller needs it somewhere other than beside a title: the
 * student workspace parks it in the tab strip's trailing slot, which is space the
 * six tabs were never going to fill. Extracted rather than copied — a second
 * hand-rolled back button is the copy that drifts out of step with this one.
 */
export function BackLink({
  href,
  label,
  className,
}: Readonly<{ href: string; label: string; className?: string }>) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm font-medium text-[var(--text-strong)] shadow-card transition-colors hover:border-platform/40 hover:bg-platform-50 hover:text-platform-800",
        className,
      )}
    >
      <span aria-hidden="true">←</span> {label}
    </Link>
  );
}

export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel = "Back",
  meta,
  actions,
  titleAlign = "start",
  className,
}: Readonly<{
  title: string;
  subtitle?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  /**
   * Which end of the row the title block sits at. `start` — beside the back
   * control — is the default and what every page inside a course still uses.
   *
   * OPT-IN, AND DELIBERATELY NOT THE DEFAULT. Right-aligned titles are what this
   * header USED to do everywhere; the note at the top of this file records why
   * that was undone, and none of it stopped being true. A page that asks for
   * `end` is accepting that trade on its own screen — it is not a signal the
   * default should move back.
   */
  titleAlign?: "start" | "end";
  className?: string;
}>) {
  const alignEnd = titleAlign === "end";
  /*
    Title, subtitle and status pills as ONE unit, always left-aligned.

    They were a single circled block in the design note for a reason: "Calculator
    / at1234-…-fe / Submitted / 100 pts" is one statement about one thing, and the
    pills are only meaningful directly under the name they qualify. Splitting them
    across the row — name on the left, pills on the right — would fill the empty
    band at the cost of the thing the band was in the way of.
  */
  const titleBlock = (
    <div className={cn("min-w-0", alignEnd && "text-right")}>
      <h1 className="text-2xl font-semibold text-[var(--text-strong)]">{title}</h1>
      {subtitle && <div className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</div>}
      {/* The pills follow the text. Left-aligned pills under a right-aligned
          heading would read as belonging to whatever is on the left, which on
          this row is the back button. */}
      {meta && (
        <div
          className={cn(
            "mt-3 flex flex-wrap items-center gap-2",
            alignEnd && "justify-end",
          )}
        >
          {meta}
        </div>
      )}
    </div>
  );

  const actionGroup = actions && (
    <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
  );

  if (!backHref) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-start justify-between gap-4 animate-fade-up",
          className,
        )}
      >
        {titleBlock}
        {actionGroup}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4 animate-fade-up",
        className,
      )}
    >
      {alignEnd ? (
        /*
          Back control at one end of the band, identity at the other.

          The actions travel WITH the back control rather than staying on the
          right, because the right is now occupied — and "where you came from"
          plus "what you can do here" is a coherent left-hand cluster, where
          actions stranded between a back button and a right-aligned title would
          belong to neither.
        */
        <>
          <div className="flex flex-wrap items-start gap-3 sm:gap-4">
            <BackLink href={backHref} label={backLabel} />
            {actionGroup}
          </div>
          {titleBlock}
        </>
      ) : (
        <>
          {/*
            The back control and the title, together.

            `flex-wrap` rather than a fixed row: `backLabel` is a breadcrumb, not
            a word — "AT1234 — Web Applications 2" on the teacher's workspace —
            so on a narrow viewport it drops to its own line above the title
            instead of squeezing the heading into a column three words wide.

            `items-start` puts the button on the title's first line. It stands
            ~6px taller than that line (py-2 + text-sm against text-2xl's 2rem
            leading), which is close enough to read as aligned and cheaper than
            pinning it with a magic margin that would break the moment the
            title's size changed.
          */}
          <div className="flex min-w-0 flex-wrap items-start gap-3 sm:gap-4">
            <BackLink href={backHref} label={backLabel} />
            {titleBlock}
          </div>
          {actionGroup}
        </>
      )}
    </div>
  );
}
