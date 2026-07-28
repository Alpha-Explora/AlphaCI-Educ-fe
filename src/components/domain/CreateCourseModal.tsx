"use client";
// ============================================================================
// VIEW LAYER — Create course dialog (IT Admin, ADDENDUM H)
//
// The catalog form used to sit open above the course list, taking the top of
// the page whether or not anyone was adding a course. It lives here now and is
// opened from a button, so the page leads with the catalog itself.
//
// Presentation + local form state only — useCourseCatalog owns the mutation and
// the error wording.
// ============================================================================
import { useEffect, useState } from "react";
import { Banner, Button, Field, Input, Modal, cn } from "@/components/ui";
import type { CourseCatalogVM } from "@/viewmodels/useCourseCatalog";

export function CreateCourseModal({
  open,
  onClose,
  vm,
  orgId,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly vm: CourseCatalogVM;
  /** The lab being viewed — pre-ticked, since that's the usual target. */
  readonly orgId: string | null;
}) {
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedLabIds, setSelectedLabIds] = useState<string[]>([]);
  const [triedSubmit, setTriedSubmit] = useState(false);

  // The lab being viewed starts ticked — a starting point, not a floor, so the
  // admin can untick it and put the course somewhere else entirely.
  useEffect(() => {
    setSelectedLabIds(orgId ? [orgId] : []);
  }, [orgId]);

  /**
   * Labs whose catalog already carries this code. Course codes are unique per
   * organization, so these would be rejected — and because this page only lists
   * the ACTIVE lab's catalog, the offending copy is otherwise invisible here.
   * Marking them up front turns a post-submit rejection into a visible state.
   */
  const normalisedCode = code.trim().toUpperCase();
  const conflictsWith = (labId: string) =>
    normalisedCode.length > 0 &&
    (vm.codesByLab.get(labId)?.has(normalisedCode) ?? false);

  // Never submit a lab that already has the code — including one that just
  // succeeded moments ago, which is what made a retry after a partial failure
  // report "already exists" for the lab that had actually worked.
  useEffect(() => {
    setSelectedLabIds((prev) => prev.filter((id) => !conflictsWith(id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalisedCode, vm.codesByLab]);

  const allLabsTaken =
    vm.labOptions.length > 0 && vm.labOptions.every((l) => conflictsWith(l.id));
  const canSubmit =
    code.trim().length > 0 && title.trim().length > 0 && selectedLabIds.length > 0;
  const labsError =
    triedSubmit && selectedLabIds.length === 0
      ? "Pick at least one laboratory that doesn't already have this code."
      : undefined;

  function toggleLab(labId: string) {
    if (conflictsWith(labId)) return;
    setSelectedLabIds((prev) =>
      prev.includes(labId) ? prev.filter((id) => id !== labId) : [...prev, labId],
    );
  }

  function resetFields() {
    setCode("");
    setTitle("");
    setDescription("");
    setSelectedLabIds(orgId ? [orgId] : []);
    setTriedSubmit(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTriedSubmit(true);
    if (!canSubmit || selectedLabIds.length === 0) return;
    vm.createCourse(
      { code: code.trim(), title: title.trim(), description: description.trim() },
      selectedLabIds,
      // Only when every ticked lab took it: a rejection keeps the form as it was
      // so the admin can fix the one field (or untick the one lab) that was
      // wrong, rather than retyping all three.
      () => {
        resetFields();
        onClose();
      },
    );
  }

  /** Discard the draft AND any error, so the next open starts clean. */
  function handleClose() {
    resetFields();
    vm.resetCreate();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create a course"
      description="Added to the catalog of every laboratory you tick. You can assign teachers to it once it exists."
      size="md"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {vm.createError && <Banner tone="error">{vm.createError}</Banner>}

        <div className="grid gap-4 sm:grid-cols-[10rem,1fr]">
          <Field label="Course code" required hint="e.g. CS-301">
            {({ id }) => (
              <Input
                id={id}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="CS-301"
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
                disabled={vm.isCreating}
              />
            )}
          </Field>
          <Field label="Title" required hint="e.g. Algorithms">
            {({ id }) => (
              <Input
                id={id}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Algorithms"
                autoComplete="off"
                disabled={vm.isCreating}
              />
            )}
          </Field>
        </div>

        <Field label="Description" hint="Optional">
          {({ id }) => (
            <Input
              id={id}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this course covers"
              autoComplete="off"
              disabled={vm.isCreating}
            />
          )}
        </Field>

        {/* Which laboratories get this course. Checkboxes rather than a single
            picker because an IT Admin administers every laboratory, and the same
            course commonly runs at more than one — each keeps its own catalog,
            so the same code in two labs is legitimate. */}
        {vm.labOptions.length > 0 && (
          <fieldset className="space-y-2" disabled={vm.isCreating}>
            <legend className="text-sm font-medium text-[var(--text-strong)]">
              Laboratories
            </legend>
            <p className="text-xs text-[var(--text-muted)]">
              Tick every laboratory whose catalog should carry this course. Each gets
              its own copy, with its own instructors and class sections.
            </p>

            <div
              className={cn(
                "max-h-44 space-y-0.5 overflow-y-auto rounded-lg border p-1.5",
                labsError ? "border-danger" : "border-[var(--border-subtle)]",
              )}
            >
              {vm.labOptions.map((lab) => {
                const taken = conflictsWith(lab.id);
                return (
                  <label
                    key={lab.id}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-1.5",
                      taken
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer hover:bg-slate-50",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedLabIds.includes(lab.id)}
                      onChange={() => toggleLab(lab.id)}
                      disabled={taken}
                      className="h-4 w-4 shrink-0 accent-platform"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-strong)]">
                      {lab.name}
                    </span>
                    {taken ? (
                      <span className="shrink-0 text-xs font-medium text-amber-700">
                        already has {code.trim()}
                      </span>
                    ) : (
                      lab.id === orgId && (
                        <span className="shrink-0 text-xs text-[var(--text-muted)]">
                          currently viewing
                        </span>
                      )
                    )}
                  </label>
                );
              })}
            </div>

            {/* The dead end this dialog used to walk an admin into: every lab
                already has the code, so there is nothing to submit. Say what to
                do about it — the blocking copy lives in a lab whose catalog
                this page doesn't show. */}
            {allLabsTaken && (
              <p className="text-xs text-amber-700">
                Every laboratory already has a course with code{" "}
                <strong>{code.trim()}</strong>. Use a different code, or switch to
                that laboratory in the top bar to delete its copy first.
              </p>
            )}

            {labsError && !allLabsTaken && (
              <p className="text-xs font-medium text-danger">{labsError}</p>
            )}
          </fieldset>
        )}

        <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={vm.isCreating}
          >
            Cancel
          </Button>
          <Button type="submit" loading={vm.isCreating} disabled={!canSubmit}>
            {(() => {
              if (vm.isCreating) return "Creating…";
              if (selectedLabIds.length > 1)
                return `Create in ${selectedLabIds.length} laboratories`;
              return "Create course";
            })()}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
