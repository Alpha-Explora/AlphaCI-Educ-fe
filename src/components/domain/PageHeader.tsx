// VIEW LAYER — detail page header with optional back link + breadcrumb.
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
}: {
  title: string;
  subtitle?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("animate-fade-up", className)}>
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-platform"
        >
          <span aria-hidden="true">←</span> {backLabel}
        </Link>
      )}
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-[var(--text-strong)]">{title}</h1>
          {subtitle && (
            <div className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</div>
          )}
          {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
