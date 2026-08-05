// ============================================================================
// VIEW LAYER — Join code presentation (shared)
// Oversized monospace code sized to read off a projector/whiteboard, plus a
// Copy button. Used by JoinCodeCard (teacher class page) and the create-class
// success state so both look identical.
// ============================================================================
import { CopyButton, cn } from "@/components/ui";

export function JoinCodeDisplay({
  code,
  active = true,
  copyLabel = "Copy code",
  label = "Class join code",
  children,
}: {
  code: string;
  /** false dims + strikes through the code (joining closed/expired). */
  active?: boolean;
  copyLabel?: string;
  /**
   * Accessible name for the code. Defaults to the enrolment code this component
   * was built for; the class ACCESS code (the one shown at the start of every
   * class) passes its own, because a screen reader announcing both as "join
   * code" would merge two codes that must never be confused.
   */
  label?: string;
  /** Extra actions rendered under the Copy button (e.g. copy join link). */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <output
        aria-label={label}
        className={cn(
          "inline-block rounded-xl border-2 border-dashed px-6 py-4 font-mono text-4xl font-bold tracking-[0.15em] sm:text-5xl",
          active
            ? "border-platform/40 bg-platform-50 text-platform-800"
            : "border-[var(--border-subtle)] bg-slate-50 text-slate-400 line-through",
        )}
      >
        {code}
      </output>
      <div className="flex flex-col gap-2">
        <CopyButton value={code} label={copyLabel} />
        {children}
      </div>
    </div>
  );
}
