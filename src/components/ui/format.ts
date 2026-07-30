// VIEW LAYER — display formatting helpers.
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function relativeDue(iso: string | null | undefined): string {
  if (!iso) return "";
  const due = new Date(iso).getTime();
  if (Number.isNaN(due)) return "";
  const diff = due - Date.now();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Due today";
  if (days > 0) return `Due in ${days} day${days === 1 ? "" : "s"}`;
  return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
}

/**
 * "3 minutes ago" — how CI activity is read.
 *
 * Anything older than a week falls back to a date: "9 days ago" is a worse
 * answer than "Jul 21" once you are no longer counting in sittings.
 *
 * Only safe inside client-fetched output. Rendering it from server data would
 * bake the server's clock into the HTML and mismatch on hydration.
 */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";

  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 0) return formatDateTime(iso); // clock skew — don't say "-2m ago"
  if (seconds < 45) return "just now";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.round(hours / 24);
  if (days <= 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  return formatDate(iso);
}

/**
 * How long a CI run took, from its two timestamps: "1m 42s".
 *
 * Returns null rather than "0s" when either end is missing — a run that has not
 * started has no duration, and printing one would be an invented fact.
 */
export function formatDuration(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
): string | null {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;

  const totalSeconds = Math.round((end - start) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
