// VIEW LAYER — plagiarism (AST / MOSS) flag panel.
import type { PlagiarismFlag } from "@/models/types";
import { Card } from "@/components/ui";

export function PlagiarismCard({ flags }: { flags: PlagiarismFlag[] }) {
  const flagged = flags.filter((f) => f.status === "FLAGGED");
  if (flagged.length === 0) {
    return (
      <Card className="flex items-center gap-3 border-emerald-200 bg-emerald-50/50 p-4">
        <span aria-hidden="true" className="text-lg">
          ✓
        </span>
        <div>
          <p className="text-sm font-semibold text-emerald-800">Originality clear</p>
          <p className="text-xs text-emerald-700/80">
            No high-similarity matches found by the AST comparison engine.
          </p>
        </div>
      </Card>
    );
  }
  return (
    <Card className="border-red-200 bg-red-50/50 p-5">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="text-lg">
          ⚠
        </span>
        <h2 className="text-base font-semibold text-red-800">
          Plagiarism flagged by AST engine
        </h2>
      </div>
      <p className="mt-1 text-xs text-red-700/80">
        Logic compared across the cohort (variable renaming ignored), MOSS-style.
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
