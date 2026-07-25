"use client";
// ============================================================================
// VIEWMODEL LAYER — GitHub mode (simulated vs live)
// A tiny app-wide store. Every GitHub operation reports its `live` flag here
// (via reportGithubLive), so any View can show a global "Simulated mode" note
// when the backend is running GitHub in SIMULATED mode. Uses an external store
// (no provider needed); null = unknown until the first GitHub op returns.
// ============================================================================
import { useSyncExternalStore } from "react";

// null = no GitHub op observed yet; true/false = last observed simulated state.
let simulated: boolean | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Called by GitHub-touching ViewModels on a successful response. */
export function reportGithubLive(live: boolean) {
  const next = !live; // simulated when NOT live
  if (next !== simulated) {
    simulated = next;
    emit();
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot() {
  return simulated;
}

function getServerSnapshot() {
  return null; // consistent server render; avoids hydration mismatch
}

export interface GithubModeVM {
  /** true = confirmed simulated, false = confirmed live, null = not yet known */
  isSimulated: boolean | null;
}

export function useGithubMode(): GithubModeVM {
  const isSimulated = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  return { isSimulated };
}
