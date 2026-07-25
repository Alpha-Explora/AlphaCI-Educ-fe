// VIEW LAYER — AlphaCI wordmark.
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-platform font-bold text-white shadow-sm">
        α
      </span>
      {!compact && (
        <span className="text-sm font-semibold leading-tight text-[var(--text-strong)]">
          AlphaCI
          <span className="block text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Education Tier
          </span>
        </span>
      )}
    </div>
  );
}
