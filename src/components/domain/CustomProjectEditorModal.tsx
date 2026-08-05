"use client";
// ============================================================================
// VIEW LAYER — write (or edit) a reusable project of your own.
//
// Reached from the starter gallery, and a SIBLING of it rather than a child:
// two dialogs open at once would each hold their own Escape handler and their
// own backdrop, so the gallery is unmounted while this is open and comes back
// afterwards. See CreateProjectModal, which owns both.
//
// TWO TABS, NOT A STEPPER. The create-project wizard is stepped because each of
// its steps depends on the one before — you cannot preview a repository name
// before there is a title. Authoring has no such order: a teacher writes half a
// brief, remembers a file, comes back and finishes the wording. Gating that
// behind Next would be a rule invented by the form.
//
// What the tabs DO carry is where the unfinished work is. Pressing Save with
// problems does not fail silently or dump every message into one list: it counts
// them per tab, opens the first tab that has any, and says so.
//
// The brief is deliberately the first tab even though the files are the
// substance. A project whose summary is blank is unpickable — it renders as an
// empty card in the gallery beside nine described ones — and the fields that
// prevent that take a minute, where the files take an hour.
// ============================================================================
import { useEffect, useState } from "react";
import {
  DIFFICULTY_HINTS,
  draftFrom,
  emptyDraft,
  offerableStacks,
  toInput,
  useCustomProjectEditor,
  validateDraft,
  withNoteAdded,
  withNoteChanged,
  withNoteRemoved,
  withTaskAdded,
  withTaskChanged,
  withTaskMoved,
  withTaskRemoved,
  type CustomProjectDraft,
  type EditorStepId,
} from "@/viewmodels/useCustomProjects";
import type { CustomProject } from "@/models/types";
import type { PresentableError } from "@/viewmodels/errors";
import {
  Banner,
  Button,
  Field,
  GenericPill,
  Input,
  Modal,
  Spinner,
  Tabs,
  Textarea,
  type TabItem,
} from "@/components/ui";
import { DifficultyMeter, DifficultyPicker } from "./DifficultyMeter";
import { CustomProjectFilesEditor } from "./CustomProjectFilesEditor";

// ---------------------------------------------------------------------------
// The brief
// ---------------------------------------------------------------------------

/**
 * What the teacher choosing this project will actually see.
 *
 * Three of the fields above it — summary, teaches, difficulty — exist only to
 * be read in the picker, months later, by someone who has forgotten writing
 * them. Showing the card as it is typed is the only way that audience is
 * present while the fields are being filled in; without it "Summary" is just
 * another box, and it gets one word.
 */
function PickerPreview({ draft }: { readonly draft: CustomProjectDraft }) {
  const stacks = offerableStacks(draft);

  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        How it will look in the picker
      </span>
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-[var(--text-strong)]">
            {draft.name.trim() || "Untitled project"}
          </span>
          <span className="shrink-0">
            <GenericPill tone="info">Yours</GenericPill>
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">
          {draft.summary.trim() || "No summary yet — this line is what a teacher reads first."}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <DifficultyMeter level={draft.difficulty} />
          <span className="text-xs text-[var(--text-muted)]">
            {stacks.length === 0
              ? "No language ready yet"
              : `${stacks.length} language${stacks.length === 1 ? "" : "s"}`}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * The numbered steps of the brief.
 *
 * Repeatable AND reorderable. The order is the teaching sequence a student reads
 * top to bottom, so an append-only list would make inserting a forgotten first
 * step mean retyping every one after it.
 */
function TaskList({
  draft,
  onChange,
}: {
  readonly draft: CustomProjectDraft;
  readonly onChange: (next: CustomProjectDraft) => void;
}) {
  const tasks = draft.brief.tasks;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <span className="block text-sm font-medium text-[var(--text-strong)]">
            Tasks{" "}
            <span aria-hidden="true" className="text-rose-500">
              *
            </span>
          </span>
          <p className="text-xs text-[var(--text-muted)]">
            Numbered for the student, in this order.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => onChange(withTaskAdded(draft))}
        >
          + Add task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--border-subtle)] px-3 py-4 text-center text-sm text-[var(--text-muted)]">
          No tasks yet. A brief with no steps is a paragraph — add the first thing
          they should build.
        </p>
      ) : (
        <ol className="space-y-2">
          {tasks.map((task, index) => (
            <li
              // Index: an unsaved task has no identity of its own, and two blank
              // rows are genuinely the same thing.
              key={index}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3"
            >
              <div className="flex items-start gap-2">
                <span className="mt-2 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-platform-50 text-xs font-semibold text-platform-700">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <Input
                    value={task.name}
                    onChange={(e) =>
                      onChange(withTaskChanged(draft, index, { name: e.target.value }))
                    }
                    placeholder="What they build — e.g. Add the divide operation"
                    aria-label={`Task ${index + 1} name`}
                  />
                  <Textarea
                    value={task.detail}
                    rows={2}
                    onChange={(e) =>
                      onChange(withTaskChanged(draft, index, { detail: e.target.value }))
                    }
                    placeholder="How they will know it works, and anything they must handle…"
                    aria-label={`Task ${index + 1} detail`}
                  />
                </div>
                {/* Buttons rather than drag handles: a two-item reorder is one
                    press either way, and this stays operable from a keyboard
                    without a library. */}
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => onChange(withTaskMoved(draft, index, -1))}
                    aria-label={`Move task ${index + 1} up`}
                    className="rounded p-1 text-[var(--text-muted)] transition-colors hover:bg-slate-100 hover:text-[var(--text-strong)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-platform"
                  >
                    <span aria-hidden="true">↑</span>
                  </button>
                  <button
                    type="button"
                    disabled={index === tasks.length - 1}
                    onClick={() => onChange(withTaskMoved(draft, index, 1))}
                    aria-label={`Move task ${index + 1} down`}
                    className="rounded p-1 text-[var(--text-muted)] transition-colors hover:bg-slate-100 hover:text-[var(--text-strong)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-platform"
                  >
                    <span aria-hidden="true">↓</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(withTaskRemoved(draft, index))}
                    aria-label={`Remove task ${index + 1}`}
                    className="rounded p-1 text-danger transition-colors hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-platform"
                  >
                    <span aria-hidden="true">✕</span>
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function NoteList({
  draft,
  onChange,
}: {
  readonly draft: CustomProjectDraft;
  readonly onChange: (next: CustomProjectDraft) => void;
}) {
  const notes = draft.brief.notes ?? [];

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <span className="block text-sm font-medium text-[var(--text-strong)]">
            Notes
          </span>
          <p className="text-xs text-[var(--text-muted)]">
            Optional. Constraints and reminders that belong to no single task.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => onChange(withNoteAdded(draft))}
        >
          + Add note
        </Button>
      </div>

      {notes.length > 0 && (
        <ul className="space-y-2">
          {notes.map((note, index) => (
            <li key={index} className="flex items-center gap-2">
              <Input
                value={note}
                onChange={(e) => onChange(withNoteChanged(draft, index, e.target.value))}
                placeholder="e.g. Do not use a third-party maths library"
                aria-label={`Note ${index + 1}`}
              />
              <button
                type="button"
                onClick={() => onChange(withNoteRemoved(draft, index))}
                aria-label={`Remove note ${index + 1}`}
                className="shrink-0 rounded p-1.5 text-danger transition-colors hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-platform"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BriefEditor({
  draft,
  onChange,
}: {
  readonly draft: CustomProjectDraft;
  readonly onChange: (next: CustomProjectDraft) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" required className="sm:col-span-2">
          {({ id }) => (
            <Input
              id={id}
              value={draft.name}
              onChange={(e) => onChange({ ...draft, name: e.target.value })}
              placeholder="e.g. Library Loan Tracker"
            />
          )}
        </Field>

        <Field
          label="Summary"
          required
          className="sm:col-span-2"
          hint="One line. This is what you will read in the picker when you have forgotten writing it."
        >
          {({ id }) => (
            <Input
              id={id}
              value={draft.summary}
              onChange={(e) => onChange({ ...draft, summary: e.target.value })}
              placeholder="Track book loans and returns with due-date rules."
            />
          )}
        </Field>

        <Field
          label="Teaches"
          required
          className="sm:col-span-2"
          hint="The skill this practises, so a colleague — or you, next year — can tell it apart from the one beside it."
        >
          {({ id }) => (
            <Input
              id={id}
              value={draft.teaches}
              onChange={(e) => onChange({ ...draft, teaches: e.target.value })}
              placeholder="Dates, state transitions, and validating input"
            />
          )}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-[var(--text-strong)]">
            Difficulty
          </span>
          <DifficultyPicker
            value={draft.difficulty}
            name="custom-project-difficulty"
            onChange={(difficulty) => onChange({ ...draft, difficulty })}
          />
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">
            {DIFFICULTY_HINTS[draft.difficulty]}
          </p>
        </div>
        <PickerPreview draft={draft} />
      </div>

      <div className="border-t border-[var(--border-subtle)] pt-5">
        <Field
          label="Overview"
          required
          hint="What the student reads first. Describe the problem, not the solution."
        >
          {({ id }) => (
            <Textarea
              id={id}
              rows={4}
              value={draft.brief.overview}
              onChange={(e) =>
                onChange({
                  ...draft,
                  brief: { ...draft.brief, overview: e.target.value },
                })
              }
              placeholder="A small library needs to keep track of which books are out…"
            />
          )}
        </Field>
      </div>

      <TaskList draft={draft} onChange={onChange} />
      <NoteList draft={draft} onChange={onChange} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// The dialog
// ---------------------------------------------------------------------------

const STEP_LABEL: Record<EditorStepId, string> = {
  brief: "1 · Brief",
  files: "2 · Files",
};

const OTHER_STEP: Record<EditorStepId, EditorStepId> = {
  brief: "files",
  files: "brief",
};

/**
 * What is still wrong, and where.
 *
 * Two banners rather than one list, because a problem the teacher can SEE a
 * field for and one parked on the other tab need different things said about
 * them. Listing both together produces the worst outcome: a message naming a
 * field that is not on screen, with nothing saying where it is.
 */
function ProblemBanners({
  visible,
  total,
  step,
  onStep,
}: {
  readonly visible: string[];
  readonly total: number;
  readonly step: EditorStepId;
  readonly onStep: (step: EditorStepId) => void;
}) {
  if (visible.length > 0) {
    return (
      <Banner tone="warning" title="Please fix the following">
        <ul className="ml-4 list-disc space-y-0.5">
          {visible.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      </Banner>
    );
  }

  if (total === 0) return null;

  return (
    <Banner tone="warning">
      {total} thing{total === 1 ? "" : "s"} still to fix on the{" "}
      <button
        type="button"
        onClick={() => onStep(OTHER_STEP[step])}
        className="font-medium underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform"
      >
        {STEP_LABEL[OTHER_STEP[step]]}
      </button>{" "}
      tab.
    </Banner>
  );
}

/**
 * Delete, behind one confirmation press.
 *
 * Owns its own confirming state so the dialog above does not have to reset it:
 * the control is unmounted whenever there is nothing to delete, which is the
 * only reset it needs.
 *
 * Two presses rather than a third stacked dialog — this is already the second
 * dialog deep, and a confirm that covers the thing being confirmed is worse
 * than one that does not.
 */
function DeleteControl({
  onRemove,
  isRemoving,
  disabled,
}: {
  readonly onRemove: () => void;
  readonly isRemoving: boolean;
  readonly disabled: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setConfirming(true)}
        disabled={disabled}
      >
        Delete project
      </Button>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-[var(--text-muted)]">Delete for good?</span>
      <Button
        type="button"
        size="sm"
        variant="danger"
        onClick={onRemove}
        loading={isRemoving}
      >
        Delete
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setConfirming(false)}
      >
        Keep
      </Button>
    </span>
  );
}

/** A failed write, said in the words of what the teacher was trying to do. */
function WriteErrorBanner({
  error,
  networkMessage,
}: {
  readonly error: PresentableError | null;
  readonly networkMessage: string;
}) {
  if (!error) return null;
  return (
    <Banner tone={error.isNetworkError ? "network" : "error"}>
      {error.isNetworkError ? networkMessage : error.message}
    </Banner>
  );
}

export function CustomProjectEditorModal({
  open,
  projectId,
  onClose,
  onSaved,
  onRemoved,
}: {
  readonly open: boolean;
  /** null creates; an id edits that project. */
  readonly projectId: string | null;
  readonly onClose: () => void;
  /** The saved project — the caller decides whether to select it. */
  readonly onSaved: (project: CustomProject) => void;
  readonly onRemoved: () => void;
}) {
  const vm = useCustomProjectEditor(projectId, { onSaved, onRemoved });

  const [draft, setDraft] = useState<CustomProjectDraft>(emptyDraft);
  const [step, setStep] = useState<EditorStepId>("brief");
  // Problems stay hidden until Save is pressed. Telling a teacher their name is
  // required before they have typed one is noise, and this form opens with every
  // required field empty by definition.
  const [showProblems, setShowProblems] = useState(false);

  /**
   * Adopt the saved project once it arrives.
   *
   * Keyed on `updatedAt` rather than on the object: React Query hands back a new
   * object reference on every background refetch, and adopting on identity would
   * throw away whatever the teacher had typed since. A changed `updatedAt` means
   * the document really is different, which is the only case worth reloading for.
   */
  const loadedAt = vm.project?.updatedAt ?? null;
  useEffect(() => {
    if (vm.project) setDraft(draftFrom(vm.project));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedAt]);

  const problems = validateDraft(draft);
  const problemsByStep: Record<EditorStepId, string[]> = {
    brief: problems.filter((p) => p.step === "brief").map((p) => p.message),
    files: problems.filter((p) => p.step === "files").map((p) => p.message),
  };

  const tabs: TabItem<EditorStepId>[] = (["brief", "files"] as EditorStepId[]).map(
    (id) => {
      const count = problemsByStep[id].length;
      return {
        id,
        // The count only appears once Save has been pressed, for the same reason
        // the banner does.
        label: showProblems && count > 0 ? `${STEP_LABEL[id]} · ${count} to fix` : STEP_LABEL[id],
      };
    },
  );

  function save() {
    if (problems.length > 0) {
      setShowProblems(true);
      // Land on the tab that has the work, rather than reporting a problem the
      // teacher cannot see the field for.
      setStep(problemsByStep.brief.length > 0 ? "brief" : "files");
      return;
    }
    vm.save(toInput(draft));
  }

  const visibleProblems = showProblems ? problemsByStep[step] : [];
  const busy = vm.isSaving || vm.isRemoving;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={projectId ? "Edit your project" : "New custom project"}
      description={
        projectId
          ? "Repositories already created from this project keep the files they were made with — editing changes what the next class gets."
          : "Write it once, then pick it for any class. Only you can see it."
      }
      size="xl"
      fitViewport
    >
      {vm.isLoading ? (
        <div className="flex flex-1 items-center justify-center gap-2 px-6 py-16 text-sm text-[var(--text-muted)]">
          <Spinner /> Loading your project…
        </div>
      ) : vm.loadError ? (
        // No form at all on this path: an editor seeded with an empty draft
        // would look like a project whose contents had been wiped, and saving
        // it would make that true.
        <div className="space-y-4 px-6 py-5">
          <Banner
            tone={vm.loadError.isNetworkError ? "network" : "error"}
            title="Couldn't open this project"
          >
            {vm.loadError.isNetworkError
              ? "Couldn't reach the backend to load it. Nothing has been changed."
              : vm.loadError.message}
          </Banner>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>
              Back to starters
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* The wrapper deliberately carries NO border: Tabs draws its own
              bottom rule, and `cn` here is a plain joiner — passing
              `border-b-0` alongside its `border-b` would leave both classes on
              the element and let stylesheet order decide which wins. */}
          <div className="shrink-0 px-6 pt-3">
            <Tabs
              items={tabs}
              value={step}
              onChange={setStep}
              label="Project editor sections"
              idPrefix="custom-project-editor"
            />
          </div>

          {/* The only region permitted to scroll, so the tabs and the actions
              stay put while a long file is being written. */}
          <div
            id={`custom-project-editor-panel-${step}`}
            role="tabpanel"
            aria-labelledby={`custom-project-editor-tab-${step}`}
            className="min-h-0 flex-1 overflow-y-auto px-6 py-5"
          >
            {step === "brief" ? (
              <BriefEditor draft={draft} onChange={setDraft} />
            ) : (
              <CustomProjectFilesEditor draft={draft} onChange={setDraft} />
            )}
          </div>

          {/* Errors + actions — pinned below the scroll region, so a Save that
              did nothing always explains itself where it was pressed. */}
          <div className="shrink-0 space-y-3 border-t border-[var(--border-subtle)] px-6 py-4">
            {showProblems && (
              <ProblemBanners
                visible={visibleProblems}
                total={problems.length}
                step={step}
                onStep={setStep}
              />
            )}
            <WriteErrorBanner
              error={vm.saveError}
              networkMessage="Couldn't reach the backend to save. Nothing you have typed is lost — try again."
            />
            <WriteErrorBanner
              error={vm.removeError}
              networkMessage="Couldn't reach the backend to delete this project."
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Delete sits at the far end from Save rather than beside it. */}
              <div>
                {projectId && (
                  <DeleteControl
                    onRemove={vm.remove}
                    isRemoving={vm.isRemoving}
                    disabled={busy}
                  />
                )}
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
                  Cancel
                </Button>
                {/* Never disabled on invalid input. A dead Save button is the
                    one control that cannot explain why it is dead; pressing
                    this one opens the tab that has the answer. */}
                <Button type="button" onClick={save} loading={vm.isSaving}>
                  {projectId ? "Save changes" : "Create project"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
