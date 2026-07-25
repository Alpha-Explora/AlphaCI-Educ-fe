// VIEW LAYER — compact metric display + progress bar + section heading.
import { cn } from "./cn";

export function Stat({
  label,
  value,
  hint,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "success" | "warning" | "platform";
  className?: string;
}) {
  const valueTone =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-amber-600"
        : tone === "platform"
          ? "text-platform"
          : "text-[var(--text-strong)]";
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className={cn("mt-0.5 text-2xl font-semibold tabular-nums", valueTone)}>
        {value}
      </p>
      {hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

export function ProgressBar({
  value,
  max = 100,
  tone = "platform",
  className,
}: {
  value: number;
  max?: number;
  tone?: "platform" | "success" | "warning";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, max === 0 ? 0 : (value / max) * 100));
  const bar =
    tone === "success"
      ? "bg-success"
      : tone === "warning"
        ? "bg-warning"
        : "bg-platform";
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-200", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-500", bar)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function SectionHeading({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-strong)]">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
