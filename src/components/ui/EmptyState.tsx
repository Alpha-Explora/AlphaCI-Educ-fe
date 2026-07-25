// VIEW LAYER — illustrated empty state (subtle ambient pulse on the glyph).
import { cn } from "./cn";

export function EmptyState({
  icon = "📭",
  title,
  description,
  action,
  className,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-subtle)] bg-white/50 px-6 py-12 text-center",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="mb-3 grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-2xl motion-safe:animate-[fade-in_0.6s_ease-out]"
      >
        {icon}
      </span>
      <p className="text-sm font-semibold text-[var(--text-strong)]">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-[var(--text-muted)]">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
