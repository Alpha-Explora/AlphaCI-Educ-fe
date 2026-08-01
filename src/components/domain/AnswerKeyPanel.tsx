"use client";
// ============================================================================
// VIEW LAYER — Answer key (teacher grading surface)
//
// The reference solution for the starter this project was created from.
//
// COLLAPSED, AND IT STAYS COLLAPSED UNTIL ASKED. Three reasons, in order of
// weight:
//   1. A teacher marking student work should read THEIR code, not compare it to
//      a model answer they happened to scroll past.
//   2. Nothing is fetched until it is opened (see useAnswerKey), so the solution
//      is not in the browser at all until somebody wants it.
//   3. Teachers screen-share this page in class. An answer key that is open by
//      default is an answer key on a projector.
//
// One tab per repository shape: a SPLIT project has a backend and a frontend
// solution, in different languages, and showing one would be wrong for half the
// class.
// ============================================================================
import { useState } from "react";
import { useAnswerKey } from "@/viewmodels/useAnswerKey";
import { Banner, Button, Card, GenericPill, Spinner, StateBoundary, cn } from "@/components/ui";

export function AnswerKeyPanel({ assignmentId }: { readonly assignmentId: string }) {
  const vm = useAnswerKey(assignmentId);
  const [buildIndex, setBuildIndex] = useState(0);
  const build = vm.data?.builds[buildIndex];

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-strong)]">
            Answer key
            <span className="ml-2 align-middle text-xs font-normal text-[var(--text-muted)]">
              (staff only)
            </span>
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            The finished version of the starter this project was created from.
            Students never receive it.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={vm.isOpen ? vm.close : vm.open}
          className="shrink-0"
        >
          {vm.isOpen ? "Hide" : "Show answer key"}
        </Button>
      </div>

      {vm.isOpen && (
        <div className="mt-4">
          <StateBoundary
            isLoading={vm.isLoading}
            error={vm.error}
            onRetry={vm.refetch}
            loadingFallback={
              <div className="flex items-center gap-2 py-6 text-sm text-[var(--text-muted)]">
                <Spinner /> Loading the answer key…
              </div>
            }
          >
            {vm.data && vm.data.builds.length === 0 ? (
              <Banner tone="info">
                This project was created before starters existed, or from one with
                no reference solution for its language.
              </Banner>
            ) : (
              vm.data && (
                <>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <GenericPill tone="info">{vm.data.templateLabel}</GenericPill>
                    {/* Only shown when there is a choice to make. */}
                    {vm.data.builds.length > 1 &&
                      vm.data.builds.map((b, i) => (
                        <button
                          key={b.component}
                          type="button"
                          onClick={() => setBuildIndex(i)}
                          className={cn(
                            "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-platform",
                            i === buildIndex
                              ? "border-platform bg-platform-50 text-platform-700"
                              : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-strong)]",
                          )}
                        >
                          {b.component === "BACKEND" ? "Backend" : "Frontend"} · {b.stack}
                        </button>
                      ))}
                  </div>

                  <div className="space-y-4">
                    {build?.files.map((file) => (
                      <div key={file.path}>
                        <p className="mb-1 font-mono text-xs text-[var(--text-muted)]">
                          {file.path}
                        </p>
                        {/* Its own horizontal scroller: source lines are long and
                            the page body must never scroll sideways. */}
                        <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">
                          <code>{file.content}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                </>
              )
            )}
          </StateBoundary>
        </div>
      )}
    </Card>
  );
}
