// VIEW LAYER — presence badge. Shared by the per-lab student monitor and the
// platform operator console so one presence rule renders one way everywhere.
import type { Presence } from "@/viewmodels/presence";
import { cn } from "./cn";

const PRESENCE_META: Record<Presence, { label: string; dot: string; chip: string }> = {
  ONLINE: {
    label: "Online",
    dot: "bg-success",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  IDLE: {
    label: "Idle",
    dot: "bg-warning",
    chip: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  OFFLINE: {
    label: "Offline",
    dot: "bg-slate-400",
    chip: "bg-slate-50 text-slate-600 ring-slate-200",
  },
  NEVER: {
    label: "Never signed in",
    dot: "bg-slate-300",
    chip: "bg-slate-50 text-slate-500 ring-slate-200",
  },
};

export function PresencePill({ presence }: { readonly presence: Presence }) {
  const meta = PRESENCE_META[presence];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        meta.chip,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          meta.dot,
          // Only a live presence pulses — a static dot on an offline row would
          // read as activity that isn't there.
          presence === "ONLINE" && "motion-safe:animate-pulse",
        )}
      />
      {meta.label}
    </span>
  );
}
