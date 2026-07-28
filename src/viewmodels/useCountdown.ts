"use client";
// ============================================================================
// VIEWMODEL LAYER — countdown to a deadline
//
// Ticks once a second toward an epoch-ms deadline and reports the remaining
// time already broken into the pieces a View needs, plus an urgency band so
// every countdown in the app agrees on when "running out" starts.
//
// Deliberately generic: the lab-session panel and the VS Code extension show
// the same deadline, and a student comparing the two must never see them
// disagree about what "12 minutes left" means.
// ============================================================================
import { useEffect, useMemo, useState } from "react";

export type CountdownUrgency = "normal" | "warning" | "critical" | "expired";

/** Under 15 minutes is worth noticing; under 5 is worth acting on. */
const WARNING_MS = 15 * 60 * 1000;
const CRITICAL_MS = 5 * 60 * 1000;

export interface Countdown {
  /** Milliseconds left, never negative. */
  remainingMs: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** "3h 42m" / "42m 05s" — hours dropped once irrelevant, seconds shown only late. */
  label: string;
  urgency: CountdownUrgency;
  isExpired: boolean;
}

/** Format a duration the way a person reads a deadline, not a stopwatch. */
export function formatRemaining(remainingMs: number): string {
  if (remainingMs <= 0) return "expired";
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Seconds only matter in the last few minutes; before that they are noise
  // that makes a calm number look like a stopwatch running out.
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes >= 5) return `${minutes}m`;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

export function useCountdown(deadlineMs: number | null): Countdown | null {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (deadlineMs === null) return;
    // One shared cadence: a second is precise enough for a multi-hour window
    // and cheap enough to leave running while the page is open.
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadlineMs]);

  return useMemo(() => {
    if (deadlineMs === null) return null;
    const remainingMs = Math.max(0, deadlineMs - now);
    const totalSeconds = Math.floor(remainingMs / 1000);

    let urgency: CountdownUrgency = "normal";
    if (remainingMs <= 0) urgency = "expired";
    else if (remainingMs <= CRITICAL_MS) urgency = "critical";
    else if (remainingMs <= WARNING_MS) urgency = "warning";

    return {
      remainingMs,
      hours: Math.floor(totalSeconds / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
      label: formatRemaining(remainingMs),
      urgency,
      isExpired: remainingMs <= 0,
    };
  }, [deadlineMs, now]);
}
