// VIEW LAYER — detail page header with optional back link + breadcrumb.
//
// Two layouts, chosen by whether there IS a back link:
//
//   with back    — one row: the back control (a real bordered button, not a
//                  text link) and any page actions on the left, the title block
//                  right-aligned opposite them. The back link used to sit on
//                  its own line above the title, which spent a whole row of
//                  vertical space on six words; folding it into the title row
//                  lifts the page's actual content up by ~40px.
//   without back — the ordinary left-aligned title block, unchanged.
import Link from "next/link";
import { cn } from "@/components/ui";

export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel = "Back",
  meta,
  actions,
  className,
}: Readonly<{
  title: string;
  subtitle?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}>) {
  const titleBlock = (align: "left" | "right") => (
    <div className={cn("min-w-0", align === "right" && "sm:text-right")}>
      <h1 className="text-2xl font-semibold text-[var(--text-strong)]">{title}</h1>
      {subtitle && <div className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</div>}
      {meta && (
        <div
          className={cn(
            "mt-3 flex flex-wrap items-center gap-2",
            align === "right" && "sm:justify-end",
          )}
        >
          {meta}
        </div>
      )}
    </div>
  );

  if (!backHref) {
    return (
      <div className={cn("animate-fade-up", className)}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          {titleBlock("left")}
          {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </div>
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
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm font-medium text-[var(--text-strong)] shadow-card transition-colors hover:border-platform/40 hover:bg-platform-50 hover:text-platform-800"
        >
          <span aria-hidden="true">←</span> {backLabel}
        </Link>
        {actions}
      </div>
      {titleBlock("right")}
    </div>
  );
}
