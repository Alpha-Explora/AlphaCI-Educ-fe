// ============================================================================
// VIEWMODEL LAYER — presence policy (single source of truth)
//
// "Is this person online?" is a product rule, not markup and not a server
// concern. It lives here, in the ViewModel layer, because two consoles ask it —
// the per-lab student monitor and the platform-wide operator console — and a
// second copy would inevitably drift, leaving the same person reported Online
// on one screen and Offline on the other.
//
// The API deliberately ships raw `lastSeenAt` / `lastSignInAt` timestamps and
// classifies nothing, which is what makes one shared rule possible at all.
// ============================================================================

/**
 * Presence windows — tune these two numbers to change what "online" means.
 *
 * The API stamps `lastSeenAt` on every authenticated request, so someone with a
 * dashboard open refreshes it continuously while an idle tab goes quiet. The
 * window must therefore be wider than any console's refetch interval, or a
 * genuinely-present person flickers to Offline between polls.
 */
export const ONLINE_WINDOW_MS = 3 * 60 * 1000; // seen in the last 3 minutes
export const IDLE_WINDOW_MS = 30 * 60 * 1000; // seen in the last 30 minutes

export type Presence = "ONLINE" | "IDLE" | "OFFLINE" | "NEVER";

/** The minimum shape presence can be computed from. */
export interface PresenceSignals {
  lastSignInAt: string | null;
  lastSeenAt: string | null;
}

export function classifyPresence(signals: PresenceSignals, now: number): Presence {
  // "Never signed in" is a different fact from "signed in once, gone now", and
  // it is the one worth acting on — the account was issued but never used.
  if (!signals.lastSignInAt && !signals.lastSeenAt) return "NEVER";
  if (!signals.lastSeenAt) return "OFFLINE";

  const since = now - new Date(signals.lastSeenAt).getTime();
  if (Number.isNaN(since)) return "OFFLINE";
  if (since <= ONLINE_WINDOW_MS) return "ONLINE";
  if (since <= IDLE_WINDOW_MS) return "IDLE";
  return "OFFLINE";
}

/** How often a presence-bearing console re-fetches while the tab is focused. */
export const PRESENCE_REFRESH_INTERVAL_MS = 30 * 1000;
