"use client";
// ============================================================================
// VIEW LAYER — global "GitHub is in Simulated mode" note
// Appears whenever any GitHub operation has reported live:false, so simulated
// repos/tokens are never mistaken for real ones. Reads the app-wide GitHub-mode
// store via useGithubMode; renders nothing until a GitHub op has been observed.
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
        <strong>GitHub is in Simulated mode.</strong> Repositories and tokens are mocked by the
        backend — nothing is created on real GitHub yet. Flip the backend env flag to go live.
      </p>
    </div>
  );
}
