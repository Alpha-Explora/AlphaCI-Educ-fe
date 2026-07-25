// VIEW LAYER — inline banner for network/error/info/success messaging.
import { cn } from "./cn";

type Tone = "error" | "network" | "info" | "success" | "warning";

const TONE: Record<Tone, { box: string; icon: string }> = {
  error: { box: "border-red-200 bg-red-50 text-red-800", icon: "⚠" },
  network: { box: "border-amber-200 bg-amber-50 text-amber-900", icon: "⚡" },
  info: { box: "border-platform-100 bg-platform-50 text-platform-800", icon: "ℹ" },
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-800", icon: "✓" },
  warning: { box: "border-amber-200 bg-amber-50 text-amber-900", icon: "!" },
};

export function Banner({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const t = TONE[tone];
  return (
    <div
      role={tone === "error" || tone === "network" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
        t.box,
        className,
      )}
    >
      <span aria-hidden="true" className="mt-0.5 font-semibold">
        {t.icon}
      </span>
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5 opacity-90")}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
