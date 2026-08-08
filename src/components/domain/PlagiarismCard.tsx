// VIEW LAYER — originality panel.
//
// FOUR states, not two, and that is the whole point of this file.
//
// This card used to take only `flags` and render "✓ Originality clear — no
// high-similarity matches found by the AST comparison engine" whenever the list
// was empty. The list is ALWAYS empty: stage ⑥'s fingerprints were discarded on
// arrival and no cohort comparison exists, so nothing has ever written a flag.
// Every teacher saw a green all-clear on every student, asserting a negative
// result that was never computed — worse than showing nothing, because a teacher
// with a genuine suspicion got what looked like an authoritative clearance.
//
// An empty list cannot distinguish "compared, nothing found" from "never
// compared", so the answer has to come from the DATA MODEL, not from copy:
// `integrity.comparedAt` is set only by a comparison that actually ran.
import type { IntegrityState, PlagiarismFlag } from "@/models/types";
import { Card } from "@/components/ui";

export function PlagiarismCard({
  flags,
  integrity,
}: {
  flags: PlagiarismFlag[];
  integrity: IntegrityState | null;
}) {
  const flagged = flags.filter((f) => f.status === "FLAGGED");

  if (flagged.length > 0) {
    return (
      <Card className="border-red-200 bg-red-50/50 p-5">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-lg">
            ⚠
          </span>
          <h2 className="text-base font-semibold text-red-800">
            High similarity found
          </h2>
        </div>
        <p className="mt-1 text-xs text-red-700/80">
          Compared against the rest of this assignment&apos;s submissions. Similarity is a
          signal, not a verdict — review the code before drawing a conclusion.
        </p>
        <ul className="mt-3 space-y-2">
          {flagged.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 ring-1 ring-inset ring-red-200"
            >
              <span className="text-sm text-[var(--text-strong)]">
                Matches <strong>{f.comparedStudentName}</strong>
              </span>
              <span className="text-sm font-semibold tabular-nums text-red-700">
                {f.similarity}% similar
              </span>
            </li>
          ))}
        </ul>
      </Card>
    );
  }

  // Stage ⑥ has never reported for this repository — no push yet, or the
  // pipeline could not reach the API.
  if (!integrity) {
    return (
      <Card className="flex items-center gap-3 border-slate-200 bg-slate-50/60 p-4">
        <span aria-hidden="true" className="text-lg text-slate-400">
          —
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-700">No originality data</p>
          <p className="text-xs text-slate-600/80">
            Nothing has been recorded for this repository yet.
          </p>
        </div>
      </Card>
    );
  }

  // Evidence collected, comparison not run. The honest state today, and the one
  // the green card was silently impersonating.
  if (!integrity.comparedAt) {
    return (
      <Card className="flex items-start gap-3 border-amber-200 bg-amber-50/60 p-4">
        <span aria-hidden="true" className="text-lg">
          🕓
        </span>
        <div>
          <p className="text-sm font-semibold text-amber-900">Not yet compared</p>
          <p className="text-xs text-amber-800/80">
            {integrity.files} file{integrity.files === 1 ? "" : "s"} fingerprinted on{" "}
            {new Date(integrity.recordedAt).toLocaleDateString()}. The cohort comparison has
            not run, so <strong>no originality conclusion has been reached</strong> — this is
            not a clean result.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex items-start gap-3 border-emerald-200 bg-emerald-50/50 p-4">
      <span aria-hidden="true" className="text-lg">
        ✓
      </span>
      <div>
        <p className="text-sm font-semibold text-emerald-800">No high similarity found</p>
        <p className="text-xs text-emerald-700/80">
          Compared against this assignment&apos;s other submissions on{" "}
          {new Date(integrity.comparedAt).toLocaleDateString()}. Shared starter code is
          excluded from the comparison.
        </p>
      </div>
    </Card>
  );
}
