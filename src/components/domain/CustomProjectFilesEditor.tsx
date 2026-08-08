"use client";
// ============================================================================
// VIEW LAYER — the three file groups of a custom project, per language.
//
// THIS COMPONENT IS THE SAFETY MODEL MADE VISIBLE. A teacher writes three kinds
// of file and exactly one kind is committed to a repository the whole class can
// read. Get that wrong and the answer key is published, silently, to a public
// repository — and nothing afterwards says so.
//
// So the distinction is carried by four independent cues rather than by a label:
//
//   1. COLOUR      — the shipped group is brand blue, the two secret ones are
//                    amber and rose. Blue is this product's "normal", so the
//                    warm pair read as exceptions to it.
//   2. MATERIAL    — the secret groups are drawn on a hatched surface. It is the
//                    only place in the app with a texture, and it survives being
//                    scrolled past at speed in a way a word does not.
//   3. GLYPH       — an open eye against a padlock, repeated on every file row,
//                    so a file seen out of the context of its own header still
//                    says which it is.
//   4. SENTENCE    — each header states the CONSEQUENCE, not the category:
//                    "committed to the student's repository, which is public".
//
// Redundant on purpose. Colour alone fails for a colour-blind teacher; a glyph
// alone fails at a glance; a sentence alone fails on the second read, when
// nobody reads it any more. The four together fail only together.
//
// The recovery action matters as much as the warning: a file in the wrong group
// can be MOVED, keeping its path and contents. Discovering the mistake and then
// being asked to retype the file is how a teacher decides to leave it.
// ============================================================================
import { useId, useState } from "react";
import {
  FILE_GROUPS,
  type FileGroupDescriptor,
  type FileGroupId,
} from "@/models/customProjects";
import { STACK_OPTIONS } from "@/viewmodels/useCreateProject";
import {
  fileCountFor,
  suspiciousStarterPaths,
  withFileAdded,
  withFileChanged,
  withFileMoved,
  withFileRemoved,
  withStackEnabled,
  type CustomProjectDraft,
} from "@/viewmodels/useCustomProjects";
import type { CustomProjectFile, Stack } from "@/models/types";
import {
  Banner,
  Button,
  EmptyState,
  Input,
  Select,
  Tabs,
  Textarea,
  cn,
  type TabItem,
} from "@/components/ui";

// ---------------------------------------------------------------------------
// Group styling
//
// Kept here rather than on the model's FileGroupDescriptor: what a group MEANS
// is a product fact and belongs with the contract; what colour it is drawn in is
// this view's business. Every class is a literal string — an assembled one
// (`border-${tone}-200`) compiles to nothing in this codebase.
// ---------------------------------------------------------------------------
interface GroupStyle {
  /** The vertical rail. The single strongest at-a-glance cue. */
  rail: string;
  header: string;
  title: string;
  badge: string;
  /** Drawn under the file list of the two groups that never ship. */
  hatched: boolean;
}

const GROUP_STYLE: Record<FileGroupId, GroupStyle> = {
  starter: {
    rail: "border-l-4 border-l-platform",
    header: "bg-platform-50",
    title: "text-platform-800",
    badge: "bg-white text-platform-700 ring-1 ring-inset ring-platform-200",
    hatched: false,
  },
  solution: {
    rail: "border-l-4 border-l-amber-400",
    header: "bg-amber-50",
    title: "text-amber-900",
    badge: "bg-white text-amber-800 ring-1 ring-inset ring-amber-200",
    hatched: true,
  },
  hiddenTests: {
    rail: "border-l-4 border-l-rose-400",
    header: "bg-rose-50",
    title: "text-rose-900",
    badge: "bg-white text-rose-800 ring-1 ring-inset ring-rose-200",
    hatched: true,
  },
};

/**
 * The "different material" surface.
 *
 * An inline style rather than a Tailwind arbitrary value: this codebase drops
 * arbitrary values containing commas, and every useful gradient has several.
 */
const HATCH: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(135deg, rgb(148 163 184 / 0.10) 0px, rgb(148 163 184 / 0.10) 5px, transparent 5px, transparent 11px)",
};

function EyeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M1.7 10S4.6 4.6 10 4.6 18.3 10 18.3 10 15.4 15.4 10 15.4 1.7 10 1.7 10Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <rect
        x="4"
        y="8.6"
        width="12"
        height="7.6"
        rx="1.6"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M6.9 8.6V6.5a3.1 3.1 0 0 1 6.2 0v2.1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GroupGlyph({ shipped }: { readonly shipped: boolean }) {
  return shipped ? <EyeIcon /> : <LockIcon />;
}

/**
 * The legend, stated once above the groups.
 *
 * Reads as one sentence with a break in it — "students see / students never
 * see" — because the split is binary and three equal chips would present it as
 * a choice between three peers.
 */
function AudienceLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-4 py-3">
      <span className="inline-flex items-center gap-2 text-sm">
        <span className="text-platform-700">
          <EyeIcon />
        </span>
        <span className="font-medium text-[var(--text-strong)]">
          Students get the starter files
        </span>
      </span>
      <span aria-hidden="true" className="text-[var(--border-strong)]">
        |
      </span>
      <span className="inline-flex items-center gap-2 text-sm">
        <span className="text-rose-700">
          <LockIcon />
        </span>
        <span className="text-[var(--text-muted)]">
          Your solution and hidden tests never leave AlphaCI
        </span>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// One file
// ---------------------------------------------------------------------------

function FileRow({
  file,
  group,
  suspicious,
  onChange,
  onMove,
  onRemove,
}: {
  readonly file: CustomProjectFile;
  readonly group: FileGroupDescriptor;
  /** This path reads like it belongs in a group that does not ship. */
  readonly suspicious: boolean;
  readonly onChange: (patch: Partial<CustomProjectFile>) => void;
  readonly onMove: (to: FileGroupId) => void;
  readonly onRemove: () => void;
}) {
  const pathId = useId();
  const contentId = useId();
  const style = GROUP_STYLE[group.id];

  return (
    <li className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label
            htmlFor={pathId}
            className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]"
          >
            {/* The glyph repeats per row rather than only in the header: with a
                group scrolled past, the row is all that is on screen. */}
            <span className={style.title}>
              <GroupGlyph shipped={group.shipped} />
            </span>
            Path in the project
          </label>
          <Input
            id={pathId}
            value={file.path}
            onChange={(e) => onChange({ path: e.target.value })}
            placeholder={group.examplePath}
            className="font-mono"
            spellCheck={false}
          />
        </div>

        {/* The recovery action. A select rather than a button because there are
            two possible destinations and naming them is the whole point. */}
        <div className="w-44">
          <Select
            value=""
            aria-label={`Move ${file.path || "this file"} to another group`}
            onChange={(e) => {
              if (e.target.value) onMove(e.target.value as FileGroupId);
            }}
          >
            <option value="">Move to…</option>
            {FILE_GROUPS.filter((g) => g.id !== group.id).map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </Select>
        </div>

        <Button type="button" size="sm" variant="ghost" onClick={onRemove}>
          Remove
        </Button>
      </div>

      {/* Named, not decorative: this is the one mistake with a public and
          irreversible consequence, so it is called out on the row that has it
          rather than summarised at the bottom of the form. */}
      {suspicious && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700">
          <span aria-hidden="true">!</span>
          <span>
            That name reads like an answer. Starter files are committed to a
            public repository — if this is your solution, move it.
          </span>
        </p>
      )}

      <label htmlFor={contentId} className="sr-only">
        Contents of {file.path || "this file"}
      </label>
      <Textarea
        id={contentId}
        value={file.content}
        onChange={(e) => onChange({ content: e.target.value })}
        rows={7}
        spellCheck={false}
        // Tabs are 8 columns wide by default in a textarea, which makes any
        // tab-indented source look broken in a box a teacher is proofreading.
        className="mt-2 font-mono text-xs leading-relaxed"
        style={{ tabSize: 2 }}
        placeholder={
          group.shipped
            ? "The code students start from…"
            : "This never reaches the student…"
        }
      />
    </li>
  );
}

// ---------------------------------------------------------------------------
// One group
// ---------------------------------------------------------------------------

function FileGroupSection({
  group,
  files,
  onAdd,
  onChange,
  onMove,
  onRemove,
}: {
  readonly group: FileGroupDescriptor;
  readonly files: CustomProjectFile[];
  readonly onAdd: () => void;
  readonly onChange: (index: number, patch: Partial<CustomProjectFile>) => void;
  readonly onMove: (index: number, to: FileGroupId) => void;
  readonly onRemove: (index: number) => void;
}) {
  const style = GROUP_STYLE[group.id];
  const suspicious = new Set(
    group.id === "starter" ? suspiciousStarterPaths(files) : [],
  );

  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--border-subtle)]",
        style.rail,
      )}
      aria-labelledby={`file-group-${group.id}`}
    >
      <header className={cn("px-4 py-3", style.header)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4
            id={`file-group-${group.id}`}
            className={cn("flex items-center gap-2 text-sm font-semibold", style.title)}
          >
            <GroupGlyph shipped={group.shipped} />
            {group.label}
            <span className="font-normal text-[var(--text-muted)]">
              ({files.length})
            </span>
          </h4>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
              style.badge,
            )}
          >
            <GroupGlyph shipped={group.shipped} />
            {group.audience}
          </span>
        </div>
        <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-[var(--text-muted)]">
          {group.consequence}
        </p>
      </header>

      <div
        className="border-t border-[var(--border-subtle)] p-3"
        style={style.hatched ? HATCH : undefined}
      >
        {files.length === 0 ? (
          // The empty state is where the group is explained for the FIRST time,
          // which is the only time anyone reads it — so it says what happens if
          // the group stays empty rather than "no files".
          <div className="rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-5 text-center">
            <p className="text-xs text-[var(--text-muted)]">{group.emptyHint}</p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onAdd}
              className="mt-3"
            >
              Add a file
            </Button>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {files.map((file, index) => (
                <FileRow
                  // Index: an authored file has no id until it is saved, and two
                  // blank rows are genuinely indistinguishable. Values come from
                  // props, so a removal re-renders correctly either way.
                  key={index}
                  file={file}
                  group={group}
                  suspicious={suspicious.has(file.path.trim())}
                  onChange={(patch) => onChange(index, patch)}
                  onMove={(to) => onMove(index, to)}
                  onRemove={() => onRemove(index)}
                />
              ))}
            </ul>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={onAdd}
              className="mt-3"
            >
              + Add file
            </Button>
          </>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Language selection + the three groups
// ---------------------------------------------------------------------------

/**
 * Which languages this project can be set in.
 *
 * A multi-select, because the point of authoring a project once is using it for
 * more than one class — and a teacher who runs the same exercise in Python and
 * in Java is writing two sets of files for one brief, not two projects.
 *
 * Turning a language OFF discards its files, so it asks first. Everything else
 * in this form is recoverable by not saving; this is the one control that can
 * throw away half an hour of typing in a single click.
 */
function StackToggles({
  draft,
  onChange,
}: {
  readonly draft: CustomProjectDraft;
  readonly onChange: (next: CustomProjectDraft) => void;
}) {
  const [confirming, setConfirming] = useState<Stack | null>(null);

  function toggle(stack: Stack, enabled: boolean) {
    if (!enabled && fileCountFor(draft.stacks[stack]) > 0 && confirming !== stack) {
      setConfirming(stack);
      return;
    }
    setConfirming(null);
    onChange(withStackEnabled(draft, stack, enabled));
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-[var(--text-strong)]">
        Languages this project can be set in{" "}
        <span aria-hidden="true" className="text-rose-500">
          *
        </span>
      </span>
      <div className="flex flex-wrap gap-2">
        {STACK_OPTIONS.map(({ value, label }) => {
          const on = Boolean(draft.stacks[value]);
          const count = fileCountFor(draft.stacks[value]);
          return (
            <button
              key={value}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(value, !on)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-platform",
                on
                  ? "border-platform bg-platform-50 text-platform-700"
                  : "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-strong)] hover:bg-slate-50",
              )}
            >
              {on && <span aria-hidden="true">✓</span>}
              {label}
              {count > 0 && (
                <span className="text-xs font-normal text-[var(--text-muted)]">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {confirming && (
        <Banner tone="warning" className="mt-3" title="Turn this language off?">
          <p>
            {STACK_OPTIONS.find((o) => o.value === confirming)?.label} has{" "}
            {fileCountFor(draft.stacks[confirming])} file
            {fileCountFor(draft.stacks[confirming]) === 1 ? "" : "s"}, which will
            be discarded.
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="danger"
              onClick={() => toggle(confirming, false)}
            >
              Discard them
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setConfirming(null)}
            >
              Keep
            </Button>
          </div>
        </Banner>
      )}
    </div>
  );
}

export function CustomProjectFilesEditor({
  draft,
  onChange,
}: {
  readonly draft: CustomProjectDraft;
  readonly onChange: (next: CustomProjectDraft) => void;
}) {
  const enabled = Object.keys(draft.stacks) as Stack[];
  const [active, setActive] = useState<Stack | null>(null);

  // The active language is DERIVED rather than corrected in an effect: a tab
  // whose language was just switched off has to fall back within the same
  // render, or the panel below renders against a language that no longer exists.
  const current: Stack | undefined =
    active && enabled.includes(active) ? active : enabled[0];

  const tabs: TabItem<Stack>[] = enabled.map((stack) => {
    const count = fileCountFor(draft.stacks[stack]);
    const label = STACK_OPTIONS.find((o) => o.value === stack)?.label ?? stack;
    return { id: stack, label: count > 0 ? `${label} · ${count}` : label };
  });

  const files = current ? draft.stacks[current] : undefined;

  return (
    <div className="space-y-5">
      <StackToggles draft={draft} onChange={onChange} />

      {!current ? (
        <EmptyState
          icon="🧩"
          title="Pick a language to start writing"
          description="A project is a brief plus the files that go with it, and the files are different in every language. Choose the ones you teach — you can add another later."
        />
      ) : (
        <>
          <AudienceLegend />

          {/* Only shown once there is a second language: with one, a tab strip
              of one tab is chrome that explains nothing. */}
          {tabs.length > 1 && (
            <Tabs
              items={tabs}
              value={current}
              onChange={setActive}
              label="Languages in this project"
              idPrefix="custom-project-stack"
            />
          )}

          <div
            id={`custom-project-stack-panel-${current}`}
            role={tabs.length > 1 ? "tabpanel" : undefined}
            aria-labelledby={
              tabs.length > 1 ? `custom-project-stack-tab-${current}` : undefined
            }
            className="space-y-4"
          >
            {FILE_GROUPS.map((group) => (
              <FileGroupSection
                key={group.id}
                group={group}
                files={files?.[group.id] ?? []}
                onAdd={() => onChange(withFileAdded(draft, current, group.id))}
                onChange={(index, patch) =>
                  onChange(withFileChanged(draft, current, group.id, index, patch))
                }
                onMove={(index, to) =>
                  onChange(withFileMoved(draft, current, group.id, index, to))
                }
                onRemove={(index) =>
                  onChange(withFileRemoved(draft, current, group.id, index))
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
