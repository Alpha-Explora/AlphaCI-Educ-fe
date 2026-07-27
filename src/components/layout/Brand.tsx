// VIEW LAYER — the wordmark.
// Pure presentation: no props beyond display variants, no data access.
//
// The name, monogram and tagline are read from src/config/brand.ts rather than
// typed here, because this component renders on nearly every page and a school
// renaming the product should not have to find it.
import { cn } from "@/components/ui/cn";
import { brand } from "@/config/brand";

/** Mark only — a rounded blue tile with the alpha glyph. */
export function BrandMark({
  size = 32,
  className,
}: {
  size?: number;
  /** Extra classes for the tile (e.g. a lighter treatment on dark panels). */
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.56 }}
      className={cn(
        "grid shrink-0 place-items-center rounded-xl bg-platform font-bold leading-none text-white shadow-sm",
        className,
      )}
    >
      {brand.monogram}
    </span>
  );
}

export function Brand({
  compact = false,
  /** Inverted treatment for use on the blue auth panel. */
  onDark = false,
  size = 32,
  className,
}: {
  compact?: boolean;
  onDark?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandMark
        size={size}
        className={onDark ? "bg-white/15 text-white ring-1 ring-white/25" : undefined}
      />
      {!compact && (
        <span
          className={cn(
            "text-sm font-semibold leading-tight",
            onDark ? "text-white" : "text-[var(--text-strong)]",
          )}
        >
          {brand.nameNoWrap}
          <span
            className={cn(
              "block text-[10px] font-medium uppercase tracking-wide",
              onDark ? "text-white/70" : "text-[var(--text-muted)]",
            )}
          >
            {brand.tagline}
          </span>
        </span>
      )}
    </div>
  );
}
