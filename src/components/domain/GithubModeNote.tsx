"use client";
// ============================================================================
// VIEW LAYER — global "Simulated mode" note
// Appears whenever a provisioning operation has reported live:false, so
// simulated projects/tokens are never mistaken for real ones. Reads the
// app-wide mode store via useGithubMode; renders nothing until an operation
// has been observed.
//
// The copy names no hosting provider: which service backs provisioning is not
// something a teacher or student is shown. "Ask your IT admin" is the action.
// ============================================================================
import { useGithubMode } from "@/viewmodels/useGithubMode";

export function GithubModeNote() {
  const { isSimulated } = useGithubMode();
  if (isSimulated !== true) return null;

  return (
    <div
      role="status"
      className="mb-5 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900"
    >
      <span aria-hidden="true" className="mt-0.5">
        ⚠
      </span>
      <p>
        <strong>Simulated mode.</strong> Project workspaces and access tokens are mocked by
        the platform — nothing is created for real yet. Ask your IT admin to finish
        connecting source hosting to go live.
      </p>
    </div>
  );
}
