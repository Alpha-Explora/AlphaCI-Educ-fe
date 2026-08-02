"use client";
// ============================================================================
// VIEW LAYER — Teacher: the hidden test suite for one assignment.
//
// CLOSED BY DEFAULT. This panel is repeated once per project in the Assignments
// tab, and it used to sit open: a file picker, a two-option security decision,
// two checkboxes and a hints box, on every project, whether or not the teacher
// had anything to do here. That is a form asking to be filled in — but there is
// nothing to fill in, because creating a project from a starter already seeds
// its suite (ClassesService.attachTemplateGradingSuite) and a project with no
// suite is marked correctly anyway, on the other three stages.
//
// So the resting state is one sentence saying which of those two situations the
// teacher is in, and the form is behind a button for the minority of times they
// want to change it.
//
// The mode choice is a SECURITY decision, so it is explained at the point it is
// made rather than in documentation a teacher would have to go and find. The
// difference between the two modes is not a preference — one of them can be
// defeated by a determined student and the other cannot, and a teacher setting
// up an exam needs to know that without reading a schema.
// ============================================================================
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useHiddenTests } from "@/viewmodels/useHiddenTests";
import type {
  HiddenTestFile,
  HiddenTestMode,
  HiddenTestSuiteSummary,
} from "@/models/types";
import {
  Banner,
  Button,
  Card,
  GenericPill,
  SectionHeading,
  Spinner,
  Textarea,
  cn,
} from "@/components/ui";
import { formatDateTime } from "@/components/ui/format";

const MAX_FILES = 50;
const MAX_TOTAL_BYTES = 512 * 1024;

function ModeChoice({
  mode,
  onChange,
  disabled,
}: {
  mode: HiddenTestMode;
  onChange: (mode: HiddenTestMode) => void;
  disabled?: boolean;
}) {
  const options: { value: HiddenTestMode; title: string; body: string }[] = [
    {
      value: "ci",
      title: "Fast feedback",
      body:
        "Your tests run inside the student's own pipeline, so results arrive in about a minute. Because their code runs on the same machine, a determined student can read the test files — AlphaCI detects and reports that, but cannot prevent it. Right for practice work.",
    },
    {
      value: "secure",
      title: "Exam mode",
      body:
        "Your tests never reach the student's machine. AlphaCI checks their code out on its own infrastructure and grades there, then posts the result. Extraction is impossible. Results take longer and depend on the grading queue.",
    },
  ];

  return (
    <fieldset disabled={disabled} className="mt-4">
      <legend className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
        How your tests run
      </legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const selected = mode === option.value;
          return (
            <label
              key={option.value}
              className={cn(
                "cursor-pointer rounded-lg border p-3 transition-colors",
                selected
                  ? "border-platform bg-platform-50/60"
                  : "border-[var(--border-subtle)] hover:border-platform/40",
              )}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="hidden-test-mode"
                  value={option.value}
                  checked={selected}
                  onChange={() => onChange(option.value)}
                  className="accent-[var(--platform)]"
                />
                <span className="text-sm font-medium">{option.title}</span>
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-[var(--text-muted)]">
                {option.body}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/**
 * The resting state, in one sentence: what is graded, and whether the teacher
 * needs to do anything. Both branches are meant to end the visit.
 *
 * The no-suite branch says the project is marked ANYWAY, with the number, since
 * "None uploaded" beside a form reads as an outstanding task and this is not
 * one — the rubric drops the hidden-test share instead of failing the student
 * (see CiService.defaultRubric).
 */
function SuiteStatus({
  suite,
}: Readonly<{ suite: HiddenTestSuiteSummary | null }>) {
  if (!suite) {
    return (
      <p className="mt-3 text-sm text-[var(--text-muted)]">
        None — and none are needed. This project is marked on its code quality,
        lint and the tests students can see. Add your own only if you want to
        check something those cannot.
      </p>
    );
  }

  const visibility = suite.revealed
    ? "shown to students"
    : suite.revealAfterDue
      ? "shown to students after the due date"
      : "never shown to students";

  return (
    <p className="mt-3 text-sm text-[var(--text-muted)]">
      <span className="font-medium text-[var(--text-strong)]">
        Ready — {suite.fileCount} file{suite.fileCount === 1 ? "" : "s"}, worth
        25% of the mark.
      </span>{" "}
      Running in{" "}
      {suite.mode === "secure" ? "exam mode" : "fast feedback"} mode, and{" "}
      {visibility}. Updated {formatDateTime(suite.uploadedAt)}.
    </p>
  );
}

export function HiddenTestsPanel({ assignmentId }: { assignmentId: string }) {
  const vm = useHiddenTests(assignmentId);
  const fileInput = useRef<HTMLInputElement>(null);

  const [staged, setStaged] = useState<HiddenTestFile[]>([]);
  const [hintText, setHintText] = useState("");
  const [mode, setMode] = useState<HiddenTestMode>("ci");
  const [revealAfterDue, setRevealAfterDue] = useState(true);
  const [showFailureHints, setShowFailureHints] = useState(true);
  const [readError, setReadError] = useState<string | null>(null);
  // The form. Closed until the teacher says they have something to change —
  // see the header note.
  const [editing, setEditing] = useState(false);

  const suite = vm.summary;

  // Adopt the saved settings once the suite loads. Without this the form sits
  // on its defaults, and a teacher who uploads a corrected test file to an
  // exam-mode assignment would silently downgrade it to fast-feedback — the
  // one mistake here with a real security consequence.
  //
  // Keyed on version so a later upload re-syncs, but a teacher mid-edit is not
  // interrupted by a background refetch returning the same suite.
  const loadedVersion = suite?.version ?? null;
  useEffect(() => {
    if (!suite) return;
    setMode(suite.mode);
    setRevealAfterDue(suite.revealAfterDue);
    setShowFailureHints(suite.showFailureHints);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedVersion]);

  // Hints only arrive once the teacher opens "View current tests", so they are
  // adopted separately from the settings above.
  const loadedHints = vm.hints.join("\n");
  useEffect(() => {
    if (loadedHints) setHintText(loadedHints);
  }, [loadedHints]);

  async function onFilesPicked(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    setReadError(null);
    if (picked.length === 0) return;

    if (picked.length > MAX_FILES) {
      setReadError(`Select at most ${MAX_FILES} files.`);
      return;
    }

    const read = await Promise.all(
      picked.map(async (file) => ({
        // webkitRelativePath preserves folder structure when a directory is
        // chosen; the plain name is the fallback for individually picked files.
        path: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
        content: await file.text(),
      })),
    );

    const bytes = read.reduce((sum, f) => sum + new Blob([f.content]).size, 0);
    if (bytes > MAX_TOTAL_BYTES) {
      setReadError("That suite is over the 512 KB limit.");
      return;
    }

    setStaged(read);
    // Clearing lets the same file be re-picked after an edit; without it the
    // change event never fires a second time.
    if (fileInput.current) fileInput.current.value = "";
  }

  function publish() {
    vm.upload({
      files: staged,
      hints: hintText.split("\n").map((h) => h.trim()).filter(Boolean),
      mode,
      revealAfterDue,
      showFailureHints,
    });
    setStaged([]);
    // Back to the one-line summary, which will now describe what was just
    // uploaded. Leaving the form open would suggest there is more to do.
    setEditing(false);
  }

  /** Closing throws away a staged pick, so reopening starts from the truth. */
  function cancelEditing() {
    setStaged([]);
    setReadError(null);
    setEditing(false);
  }

  return (
    <Card className="p-5">
      <SectionHeading
        title="Hidden tests"
        subtitle="Optional. Tests only you can see, which catch code written to satisfy the visible tests rather than the problem. Starter projects come with a set already."
        action={
          suite ? (
            <GenericPill tone="success">
              v{suite.version} · {suite.fileCount} file{suite.fileCount === 1 ? "" : "s"}
            </GenericPill>
          ) : (
            // "Not used" rather than "None uploaded": the second names an
            // absence, which invites the teacher to fill it.
            <GenericPill tone="neutral">Not used</GenericPill>
          )
        }
      />

      {vm.error && <Banner tone="error" className="mt-3">{vm.error.message}</Banner>}
      {vm.uploadError && <Banner tone="error" className="mt-3">{vm.uploadError}</Banner>}
      {vm.removeError && <Banner tone="error" className="mt-3">{vm.removeError}</Banner>}
      {readError && <Banner tone="warning" className="mt-3">{readError}</Banner>}

      {vm.isLoading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <Spinner /> Loading…
        </div>
      ) : (
        <>
          <SuiteStatus suite={suite} />

          {/* The resting-state controls. "View current tests" stays out here:
              it reads, it does not change anything, and a teacher checking what
              their class is being marked against should not have to open an
              upload form to do it. */}
          {!editing && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditing(true)}
                aria-expanded={false}
              >
                {suite ? "Change these tests…" : "Add hidden tests…"}
              </Button>

              {suite && !vm.files && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={vm.loadContent}
                  disabled={vm.isLoadingContent}
                >
                  {vm.isLoadingContent ? "Loading…" : "View current tests"}
                </Button>
              )}
            </div>
          )}

          {editing && (
            <>
              <div className="mt-4">
                <input
                  ref={fileInput}
                  type="file"
                  multiple
                  onChange={onFilesPicked}
                  className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-platform-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-platform-700 hover:file:bg-platform-100"
                />
                <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                  Uploading replaces the whole suite. Up to {MAX_FILES} files, 512 KB total.
                </p>
              </div>

              {staged.length > 0 && (
                <ul className="mt-3 space-y-1 rounded-md border border-[var(--border-subtle)] p-3 text-xs">
                  {staged.map((file) => (
                    <li key={file.path} className="font-mono text-[var(--text-strong)]">
                      {file.path}
                    </li>
                  ))}
                </ul>
              )}

              <ModeChoice mode={mode} onChange={setMode} disabled={vm.isUploading} />

              <div className="mt-4 space-y-2">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={revealAfterDue}
                    onChange={(e) => setRevealAfterDue(e.target.checked)}
                    className="mt-0.5 accent-[var(--platform)]"
                  />
                  <span>
                    Show the tests to students after the due date
                    <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                      Recommended. Seeing what their code was measured against is where most of
                      the learning happens, and it removes any reason to try to extract them early.
                    </span>
                  </span>
                </label>

                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showFailureHints}
                    onChange={(e) => setShowFailureHints(e.target.checked)}
                    className="mt-0.5 accent-[var(--platform)]"
                  />
                  <span>
                    Show my hints when a hidden test fails
                    <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                      Students always see the error their own code produced. This adds the hint
                      text below; assertions and expected values are never shown either way.
                    </span>
                  </span>
                </label>
              </div>

              <div className="mt-4">
                <label
                  htmlFor="hidden-test-hints"
                  className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]"
                >
                  Hints — one per line
                </label>
                <Textarea
                  id="hidden-test-hints"
                  rows={3}
                  value={hintText}
                  onChange={(e) => setHintText(e.target.value)}
                  placeholder={"check how you handle an empty list\nwhat happens when the denominator is zero?"}
                  className="mt-1.5"
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Write these to point a student somewhere without giving the case away.
                </p>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button onClick={publish} disabled={staged.length === 0 || vm.isUploading}>
                  {vm.isUploading
                    ? "Uploading…"
                    : suite
                      ? `Replace suite (v${suite.version + 1})`
                      : "Upload suite"}
                </Button>

                <Button variant="ghost" onClick={cancelEditing} disabled={vm.isUploading}>
                  Cancel
                </Button>

                <span className="flex-1" />

                {/* Pushed to the far end, away from the primary action: removing
                    the suite forfeits a quarter of the assignment's marks for
                    every student, and it sat one button away from Upload. */}
                {suite && (
                  <Button variant="ghost" onClick={vm.remove} disabled={vm.isRemoving}>
                    {vm.isRemoving ? "Removing…" : "Remove suite"}
                  </Button>
                )}
              </div>
            </>
          )}

          {vm.files && (
            <div className="mt-4 space-y-3">
              {vm.files.map((file) => (
                <details key={file.path} className="rounded-md border border-[var(--border-subtle)]">
                  <summary className="cursor-pointer px-3 py-2 font-mono text-xs">
                    {file.path}
                  </summary>
                  <pre className="overflow-x-auto border-t border-[var(--border-subtle)] p-3 text-xs">
                    {file.content}
                  </pre>
                </details>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
