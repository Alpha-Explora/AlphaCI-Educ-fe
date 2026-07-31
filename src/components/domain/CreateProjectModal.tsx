"use client";
// ============================================================================
// VIEW LAYER — Create Project wizard (teacher, ADDENDUM C)
// SOLO (checkbox list of students) or GROUP (group builder, 2–4 each, a student
// in only one group). Form state is local; validation rules + the
// create→provision sequence + cache invalidation live in useCreateProject.
// On success shows the shared ProvisionResultSummary (LIVE/SIMULATED + links).
//
// Three steps rather than one long form. Every field below used to be stacked
// into a single dialog roughly twice the height of a laptop screen, so the
// teacher scrolled past repository scaffolding to reach the student list and
// lost sight of the Create button entirely. Splitting it means each step fits
// the viewport, and the progress bar and actions stay pinned while the middle
// section is the only thing that can ever scroll.
//
// Step order follows what depends on what: the details name the project, the
// student selection decides how many repositories exist, and the repository
// setup describes what each one contains — which is also why the repo-name
// preview can only be shown last.
// ============================================================================
import { useMemo, useState } from "react";
import {
  useCreateProject,
  useLabSessionLimits,
  validateGroup,
  repoNamePreview,
  GROUP_MIN,
  GROUP_MAX,
  DEFAULT_COVERAGE,
  COVERAGE_OPTIONS,
  DEFAULT_POINTS,
  POINTS_OPTIONS,
  rubricSplitsEvenly,
  STACK_OPTIONS,
  BACKEND_STACK_OPTIONS,
  FRONTEND_STACK_OPTIONS,
} from "@/viewmodels/useCreateProject";
import type {
  ClassCohort,
  CreateProjectInput,
  ProjectRepoStructure,
  ProjectType,
  Stack,
  SystemUser,
} from "@/models/types";
import {
  Avatar,
  Banner,
  Button,
  Field,
  GenericPill,
  Input,
  Modal,
  Select,
  Spinner,
  Textarea,
  cn,
} from "@/components/ui";
import { ProvisionResultSummary } from "./ProvisionResultSummary";

interface GroupDraft {
  id: string;
  studentIds: string[];
}

let groupSeq = 0;
const nextGroupId = () => `g${++groupSeq}`;

type StepId = "details" | "students" | "repository";

const STEPS: ReadonlyArray<{ id: StepId; label: string }> = [
  { id: "details", label: "Details" },
  { id: "students", label: "Students" },
  { id: "repository", label: "Repository" },
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
      <path
        d="M5 10.5l3.5 3.5L15 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Progress rail.
 *
 * The connectors are the progress bar — they're what makes "two of three done"
 * readable at a glance, so they stretch to fill the row and change colour with
 * completion rather than being decorative stubs between labels.
 *
 * Completed steps are clickable, so correcting a typo on step 1 from step 3
 * costs one click. Steps ahead stay locked: they can depend on choices not yet
 * made, and jumping forward would skip the validation gate on the way.
 */
function Stepper({
  current,
  onJump,
}: {
  readonly current: number;
  readonly onJump: (index: number) => void;
}) {
  return (
    <ol className="flex items-center">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const isLast = i === STEPS.length - 1;
        return (
          <li
            key={step.id}
            className={cn("flex items-center", !isLast && "flex-1")}
          >
            <button
              type="button"
              disabled={!done}
              onClick={() => onJump(i)}
              aria-current={active ? "step" : undefined}
              className={cn(
                "group flex shrink-0 items-center gap-2 rounded-full py-1 pr-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform",
                done && "cursor-pointer",
                !done && "cursor-default",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold transition-all duration-200",
                  // Filled for anything reached, so the coloured run of circles
                  // reads as distance travelled.
                  (done || active) && "bg-platform text-white",
                  // Halo marks where you actually are within that run.
                  active && "ring-4 ring-platform-100",
                  done && "group-hover:bg-platform-700",
                  !done &&
                    !active &&
                    "border-2 border-[var(--border-subtle)] bg-white text-[var(--text-muted)]",
                )}
              >
                {done ? <CheckIcon /> : i + 1}
              </span>
              {/* Only the current label survives a narrow dialog; the numbered
                  circles still carry the sequence. */}
              <span
                className={cn(
                  "whitespace-nowrap text-sm font-medium transition-colors",
                  active
                    ? "text-[var(--text-strong)]"
                    : "hidden text-[var(--text-muted)] sm:inline",
                  done && "group-hover:text-[var(--text-strong)]",
                )}
              >
                {step.label}
              </span>
            </button>

            {!isLast && (
              <span
                aria-hidden="true"
                className={cn(
                  "mx-2 h-1 flex-1 rounded-full transition-colors duration-300",
                  done ? "bg-platform" : "bg-slate-100",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Sentinel option value — no real total can collide with it. */
const POINTS_CUSTOM = "custom";

/**
 * Total-points picker: a shortcut list plus a free Custom field.
 *
 * Points is not coverage. The total comes from the institution's grading
 * scheme, so the list can only ever be a shortcut — closing it would tell a
 * teacher their 25-point lab is not a thing. What the list buys is a nudge
 * toward totals the rubric can actually divide, which the hint then makes
 * explicit for the ones it can't.
 */
function PointsField({
  value,
  custom,
  onChange,
}: {
  readonly value: string;
  readonly custom: boolean;
  readonly onChange: (next: { value: string; custom: boolean }) => void;
}) {
  const n = Number(value);
  // Silent while the field is empty or nonsense — the step error owns that
  // case, and two complaints about one field is one too many.
  const uneven = value.trim() !== "" && Number.isInteger(n) && n > 0 && !rubricSplitsEvenly(n);

  return (
    <Field
      label="Points"
      required
      hint={
        uneven
          ? `${n} does not divide evenly — stage marks get rounded.`
          : undefined
      }
    >
      {({ id }) => (
        <div className="space-y-2">
          <Select
            id={id}
            value={custom ? POINTS_CUSTOM : value}
            onChange={(e) => {
              const next = e.target.value;
              // Choosing Custom keeps the current total as the starting point
              // rather than blanking the field: the teacher edits a number they
              // can see instead of facing an empty box that is already invalid.
              onChange(
                next === POINTS_CUSTOM
                  ? { value, custom: true }
                  : { value: next, custom: false },
              );
            }}
          >
            {POINTS_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p === DEFAULT_POINTS ? `${p} (default)` : p}
              </option>
            ))}
            <option value={POINTS_CUSTOM}>Custom…</option>
          </Select>
          {custom && (
            // No max here on purpose. This field exists precisely because the
            // institution's scale cannot be predicted, so inventing a ceiling
            // would defeat the one thing it is for.
            <Input
              type="number"
              min={1}
              step={1}
              value={value}
              onChange={(e) => onChange({ value: e.target.value, custom: true })}
              aria-label="Points — custom total"
              // Reached only by picking Custom, so focus follows the teacher's
              // own action rather than stealing it on open.
              autoFocus
            />
          )}
        </div>
      )}
    </Field>
  );
}

/**
 * Minimum-coverage picker.
 *
 * One component for both layouts — SINGLE gives it half a row and SPLIT a
 * third, so only the label shortens. A select rather than a number spinner
 * because the choice is a teaching policy off a known ladder, not a free
 * measurement: see COVERAGE_OPTIONS for why 83 was never a useful answer.
 */
function CoverageField({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
}) {
  return (
    <Field
      label={label}
      required
      // The consequence of 0 is the one thing a teacher can get wrong here, and
      // it is invisible from the word "No minimum" alone.
      hint={
        value === 0
          ? "No gate — CI passes even with no tests."
          : "CI fails below this %."
      }
    >
      {({ id }) => (
        <Select
          id={id}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        >
          {COVERAGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

export function CreateProjectModal({
  open,
  onClose,
  classInfo,
  students,
}: {
  open: boolean;
  onClose: () => void;
  // `term` is here for the repo-name preview: the backend puts the abbreviated
  // term in every repository name, so a preview without it is not the name.
  classInfo: Pick<ClassCohort, "id" | "code" | "section" | "name" | "term">;
  students: SystemUser[];
}) {
  const vm = useCreateProject(classInfo.id);

  const [stepIndex, setStepIndex] = useState(0);
  // Errors for the step being left, shown only once Next is pressed — flagging
  // an empty Title before it has been typed in would be noise, not help.
  const [showStepErrors, setShowStepErrors] = useState(false);

  // ---- form state (View-owned) ----
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  // Still a string: the Custom field is free text, so it has to hold "" and
  // half-typed values on the way to a number.
  const [points, setPoints] = useState(String(DEFAULT_POINTS));
  // Whether Custom is showing, tracked rather than derived from "is `points`
  // one of POINTS_OPTIONS". Deriving it would yank the input away from a
  // teacher who picked Custom and then typed a number that happens to be on
  // the list.
  const [pointsCustom, setPointsCustom] = useState(false);
  const [type, setType] = useState<ProjectType>("SOLO");
  const [soloSelected, setSoloSelected] = useState<Set<string>>(
    () => new Set(students.map((s) => s.id)),
  );
  const [groups, setGroups] = useState<GroupDraft[]>([]);

  // ADDENDUM G — scaffold options
  const [repoStructure, setRepoStructure] = useState<ProjectRepoStructure>("SINGLE");
  // Visibility is no longer a choice — every student repository is PUBLIC.
  // The wizard therefore sends nothing, and the backend's own default (ADDENDUM
  // N, `isPrivate ?? false`) is what provisioning reads. Deliberately not sent
  // as an explicit `isPrivate: false`: a value on the wire implies the caller
  // had an opinion, and this one no longer can.
  const [stack, setStack] = useState<Stack>("nodejs");
  const [backendStack, setBackendStack] = useState<Stack>("nestjs");
  const [frontendStack, setFrontendStack] = useState<Stack>("nextjs");
  // A number, not a string: the picker can only yield values from
  // COVERAGE_OPTIONS, so there is no half-typed intermediate state to hold.
  const [coverage, setCoverage] = useState(DEFAULT_COVERAGE);
  // Lab session length. Empty string = "use the server default", which is a
  // real choice and not the same as typing the default in: a project that never
  // expressed an opinion follows the policy if the operator later changes it.
  const limits = useLabSessionLimits();
  const [sessionHours, setSessionHours] = useState("");

  const step = STEPS[stepIndex].id;
  const isLastStep = stepIndex === STEPS.length - 1;

  const namePreview = useMemo(
    () =>
      repoNamePreview({
        title,
        repoStructure,
        type,
        classCode: classInfo.code,
        section: classInfo.section,
        term: classInfo.term,
      }),
    [title, repoStructure, type, classInfo.code, classInfo.section, classInfo.term],
  );

  // student id → group id (for one-group-only enforcement in the UI)
  const studentGroup = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groups) for (const sid of g.studentIds) map.set(sid, g.id);
    return map;
  }, [groups]);

  const ungrouped = students.filter((s) => !studentGroup.has(s.id));

  /**
   * What each step is responsible for, used only to gate Next.
   *
   * validateCreateProject inside vm.submit stays the authority — a rule added
   * there but not mirrored here can't be bypassed, it just surfaces on the last
   * step instead of the one that owns it.
   */
  const stepErrors = useMemo<string[]>(() => {
    const errors: string[] = [];
    if (step === "details") {
      if (!title.trim()) errors.push("Title is required.");
      // Due date is deliberately absent — it is optional, and an empty one is
      // a valid answer meaning "no deadline".
      // Whole numbers only — mirrors validateCreateProject, which mirrors the
      // DTO's @IsInt(). Reachable via the Custom points field.
      const pts = Number(points);
      if (!Number.isInteger(pts) || pts <= 0)
        errors.push("Points must be a whole number greater than 0.");
    }
    if (step === "students") {
      if (type === "SOLO") {
        if (soloSelected.size === 0)
          errors.push("Select at least one student for a solo project.");
      } else {
        if (groups.length === 0) errors.push("Add at least one group.");
        groups.forEach((g, i) => {
          const v = validateGroup(g.studentIds);
          if (!v.ok) errors.push(`Group ${i + 1}: ${v.message}`);
        });
      }
    }
    if (step === "repository") {
      // Coverage is absent from this list on purpose — it is a picker over
      // COVERAGE_OPTIONS, so it has no invalid state to report. The 0..100 rule
      // still lives in validateCreateProject as the authority on the wire.
      if (sessionHours.trim() !== "") {
        const hrs = Number(sessionHours);
        if (!Number.isInteger(hrs) || hrs < limits.minSessionHours || hrs > limits.maxSessionHours)
          errors.push(
            `Lab session length must be a whole number between ${limits.minSessionHours} and ${limits.maxSessionHours} hours.`,
          );
      }
    }
    return errors;
  }, [
    step,
    title,
    points,
    type,
    soloSelected,
    groups,
    sessionHours,
    limits.minSessionHours,
    limits.maxSessionHours,
  ]);

  function toggleSolo(id: string) {
    setSoloSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleStudentInGroup(groupId: string, studentId: string) {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const has = g.studentIds.includes(studentId);
        return {
          ...g,
          studentIds: has
            ? g.studentIds.filter((s) => s !== studentId)
            : [...g.studentIds, studentId],
        };
      }),
    );
  }

  function buildInput(): CreateProjectInput {
    // ADDENDUM G — scaffold fields: send single stack, or backend+frontend when SPLIT.
    const scaffold =
      repoStructure === "SPLIT"
        ? { repoStructure, backendStack, frontendStack }
        : { repoStructure, stack };
    const base = {
      title: title.trim(),
      description: description.trim(),
      // Omitted rather than sent as "" when the teacher leaves it blank: the
      // DTO validates the shape of a date it is given, so an empty string is a
      // malformed date, not an absent one.
      ...(dueDate !== "" && { dueDate }),
      points: Number(points),
      coverageThreshold: coverage,
      // Omitted entirely when left blank — see the sessionHours state comment.
      ...(sessionHours.trim() !== "" && { labSessionHours: Number(sessionHours) }),
      ...scaffold,
    };
    if (type === "SOLO") {
      return { ...base, type, studentIds: [...soloSelected] };
    }
    return {
      ...base,
      type,
      groups: groups.map((g) => ({ studentIds: g.studentIds })),
    };
  }

  function goTo(index: number) {
    setStepIndex(index);
    setShowStepErrors(false);
  }

  /** Enter and the Next button share this, so Enter advances rather than submits. */
  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (stepErrors.length > 0) {
      setShowStepErrors(true);
      return;
    }
    if (!isLastStep) {
      goTo(stepIndex + 1);
      return;
    }
    vm.submit(buildInput());
  }

  function handleClose() {
    vm.reset();
    onClose();
  }

  const showSuccess = vm.phase === "success" && vm.result;
  // The project exists but its repositories do not. Deliberately NOT rendered
  // as an error: re-submitting the form would only earn a duplicate-title
  // conflict, so the two things worth offering are finishing it or removing it.
  const showPartial = vm.phase === "partial";
  // Blocking problems, whichever layer found them.
  const blockingErrors = showStepErrors ? stepErrors : vm.validationErrors;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        showSuccess
          ? "Project created"
          : showPartial
            ? "Project created — repositories unfinished"
            : "Create project"
      }
      description={
        showSuccess || showPartial
          ? undefined
          : `${classInfo.code} · Section ${classInfo.section} — repositories are created only for students enrolled in this section.`
      }
      size="xl"
      fitViewport
    >
      {showSuccess && vm.result ? (
        // ---- Success view ----
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            <Banner tone="success" title={`“${vm.result.assignment.title}” created`}>
              {vm.result.assignment.isGroup ? "Group project" : "Solo project"} ·{" "}
              {vm.result.assignment.points} pts
            </Banner>
            <ProvisionResultSummary summary={vm.result} />
            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        </div>
      ) : showPartial ? (
        // ---- Partial view: the project is real, its repositories are not ----
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-4">
            <Banner
              tone="warning"
              title={`“${vm.createdAssignment?.title ?? "Project"}” was created, but its repositories were not finished`}
            >
              It is already listed in this class. Nothing was lost — finish it
              below, or delete it if you would rather start over.
            </Banner>

            {vm.error && (
              <Banner
                tone={vm.error.isNetworkError ? "network" : "error"}
                title="What went wrong"
              >
                {vm.error.isNetworkError
                  ? "Couldn't reach the backend to provision the repositories."
                  : vm.error.message}
              </Banner>
            )}

            {/* Per-repo failures on an otherwise successful call — one bad repo
                no longer denies the rest of the class a workspace, so say
                exactly which ones still need attention. */}
            {vm.result && vm.result.failures.length > 0 && (
              <Banner
                tone="warning"
                title={`${vm.result.failures.length} repository${vm.result.failures.length === 1 ? "" : "s"} could not be created`}
              >
                <ul className="ml-4 list-disc space-y-1">
                  {vm.result.failures.map((f) => (
                    <li key={f.repoId}>
                      <code className="font-mono text-xs">{f.repoName}</code> —{" "}
                      {f.reason}
                    </li>
                  ))}
                </ul>
              </Banner>
            )}

            {/* A 401 has one cause and one cure; a link beats a paragraph. */}
            {vm.needsGithubReconnect && (
              <Banner tone="warning" title="Your GitHub connection needs renewing">
                Creating real repositories uses your own GitHub account.{" "}
                {/* New tab, so this dialog — and the project waiting in it — is
                    still here to press Retry on when the handshake finishes.
                    Sending the current tab to GitHub closed the dialog and left
                    the teacher to find the half-made project on their own. */}
                <a
                  href="/connect-github"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-platform-700 underline underline-offset-2"
                >
                  Connect GitHub
                </a>{" "}
                (opens a new tab), then come back here and press Retry.
              </Banner>
            )}

            {/* Whatever DID land is still worth showing. */}
            {vm.result && vm.result.created > 0 && (
              <ProvisionResultSummary summary={vm.result} />
            )}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                variant="ghost"
                onClick={vm.discardCreated}
                loading={vm.isDiscarding}
              >
                Delete project
              </Button>
              <Button variant="secondary" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={vm.retryProvision} loading={vm.isSubmitting}>
                Retry provisioning
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // ---- Stepped form ----
        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          {/* Progress — pinned, so the teacher always knows how much is left. */}
          <div className="shrink-0 border-b border-[var(--border-subtle)] bg-slate-50/60 px-6 py-3">
            <Stepper current={stepIndex} onJump={goTo} />
          </div>

          {/* The only region permitted to scroll, and only when a class has
              more students than fit. */}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {step === "details" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Title" required className="sm:col-span-2">
                  {({ id }) => (
                    <Input
                      id={id}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Python Calculator"
                    />
                  )}
                </Field>
                <Field label="Description" className="sm:col-span-2">
                  {({ id }) => (
                    <Textarea
                      id={id}
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What students need to build…"
                    />
                  )}
                </Field>
                {/* Optional. Not every project has a deadline — ongoing
                    practice work and self-paced labs are real cases, and
                    forcing an invented date made "overdue" mean nothing on
                    the projects that never had one. */}
                <Field label="Due date" hint="Optional — leave blank for no deadline.">
                  {({ id }) => (
                    <Input
                      id={id}
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  )}
                </Field>
                <PointsField
                  value={points}
                  custom={pointsCustom}
                  onChange={({ value, custom }) => {
                    setPoints(value);
                    setPointsCustom(custom);
                  }}
                />
                {/*
                  "Starter template URL" used to sit here. It was never read by
                  provisioning — repository contents come entirely from
                  scaffold-builder.util.ts, driven by the language chosen on the
                  Repository step — so the field promised a starting point it
                  could not deliver. The DTO and column are still there and
                  still accept a value; nothing in this app sets one.
                */}
              </div>
            )}

            {step === "students" && (
              <div className="space-y-5">
                {/* Type toggle — it decides what the rest of this step is, so it
                    leads rather than sitting with the repository options. */}
                <div>
                  <span className="mb-1 block text-sm font-medium text-[var(--text-strong)]">
                    Project type
                  </span>
                  <div
                    role="tablist"
                    aria-label="Project type"
                    className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-slate-50 p-1"
                  >
                    {(["SOLO", "GROUP"] as ProjectType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        role="tab"
                        aria-selected={type === t}
                        onClick={() => setType(t)}
                        className={cn(
                          "rounded-md px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-platform",
                          type === t
                            ? "bg-white text-platform-700 shadow-sm"
                            : "text-[var(--text-muted)] hover:text-[var(--text-strong)]",
                        )}
                      >
                        {t === "SOLO"
                          ? "Solo (one repo per student)"
                          : "Group (shared repo)"}
                      </button>
                    ))}
                  </div>
                </div>

                {students.length === 0 && (
                  <Banner tone="warning" title="No students enrolled">
                    This section has no students yet, so there is nobody to
                    create repositories for. Share the class join code first.
                  </Banner>
                )}

                {/* SOLO — student checkbox list */}
                {type === "SOLO" && students.length > 0 && (
                  <fieldset className="rounded-lg border border-[var(--border-subtle)] p-3">
                    <legend className="flex items-center gap-2 px-1 text-sm font-medium text-[var(--text-strong)]">
                      Students who get a repo
                      <span className="rounded-full bg-platform-50 px-2 py-0.5 text-xs font-medium text-platform-700">
                        {soloSelected.size} of {students.length} selected
                      </span>
                    </legend>
                    <div className="mb-2 flex gap-3 px-1 text-xs">
                      <button
                        type="button"
                        className="font-medium text-platform hover:underline"
                        onClick={() =>
                          setSoloSelected(new Set(students.map((s) => s.id)))
                        }
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        className="font-medium text-[var(--text-muted)] hover:underline"
                        onClick={() => setSoloSelected(new Set())}
                      >
                        Clear
                      </button>
                    </div>
                    <ul className="grid gap-1 sm:grid-cols-2">
                      {students.map((s) => {
                        const checked = soloSelected.has(s.id);
                        return (
                          <li key={s.id}>
                            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSolo(s.id)}
                                className="h-4 w-4 accent-platform"
                              />
                              <Avatar
                                name={s.fullName}
                                color={s.avatarColor}
                                size="sm"
                              />
                              <span className="truncate text-sm text-[var(--text-strong)]">
                                {s.fullName}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </fieldset>
                )}

                {/* GROUP — group builder */}
                {type === "GROUP" && students.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-[var(--text-strong)]">
                        Groups{" "}
                        <span className="font-normal text-[var(--text-muted)]">
                          ({GROUP_MIN}–{GROUP_MAX} students each · a student joins
                          only one group)
                        </span>
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setGroups((prev) => [
                            ...prev,
                            { id: nextGroupId(), studentIds: [] },
                          ])
                        }
                      >
                        + Add group
                      </Button>
                    </div>

                    {groups.length === 0 && (
                      <p className="rounded-lg border border-dashed border-[var(--border-subtle)] px-3 py-4 text-center text-sm text-[var(--text-muted)]">
                        No groups yet. Add a group, then assign 2–4 students to it.
                      </p>
                    )}

                    {groups.map((g, idx) => {
                      const validity = validateGroup(g.studentIds);
                      return (
                        <div
                          key={g.id}
                          className="rounded-lg border border-[var(--border-subtle)] p-3"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--text-strong)]">
                              Group {idx + 1}
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-xs font-medium",
                                  validity.ok
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-amber-50 text-amber-700",
                                )}
                              >
                                {g.studentIds.length} member
                                {g.studentIds.length === 1 ? "" : "s"}
                                {validity.message ? ` · ${validity.message}` : " · ok"}
                              </span>
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                setGroups((prev) => prev.filter((x) => x.id !== g.id))
                              }
                              className="rounded p-1 text-xs font-medium text-danger hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-platform"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {students.map((s) => {
                              const inThis = g.studentIds.includes(s.id);
                              const inOther =
                                studentGroup.has(s.id) &&
                                studentGroup.get(s.id) !== g.id;
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  disabled={inOther}
                                  aria-pressed={inThis}
                                  onClick={() => toggleStudentInGroup(g.id, s.id)}
                                  title={inOther ? "Already in another group" : undefined}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-platform",
                                    inThis
                                      ? "border-platform/50 bg-platform-50 text-platform-700"
                                      : inOther
                                        ? "cursor-not-allowed border-[var(--border-subtle)] bg-slate-50 text-slate-300"
                                        : "border-[var(--border-subtle)] bg-white text-[var(--text-strong)] hover:bg-slate-50",
                                  )}
                                >
                                  {inThis && <span aria-hidden="true">✓</span>}
                                  {s.fullName}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {ungrouped.length > 0 && (
                      <p className="text-xs text-[var(--text-muted)]">
                        Ungrouped: {ungrouped.map((s) => s.fullName).join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ADDENDUM G — repository scaffold options */}
            {step === "repository" && (
              <div className="space-y-4">
                {/* Structure toggle */}
                <div>
                  <span className="mb-1 block text-sm font-medium text-[var(--text-strong)]">
                    Repository structure
                  </span>
                  <div
                    role="tablist"
                    aria-label="Repository structure"
                    className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-slate-50 p-1"
                  >
                    {(
                      [
                        ["SINGLE", "Single repo"],
                        ["SPLIT", "Backend + Frontend"],
                      ] as [ProjectRepoStructure, string][]
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={repoStructure === value}
                        onClick={() => setRepoStructure(value)}
                        className={cn(
                          "rounded-md px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-platform",
                          repoStructure === value
                            ? "bg-white text-platform-700 shadow-sm"
                            : "text-[var(--text-muted)] hover:text-[var(--text-strong)]",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {repoStructure === "SPLIT" && (
                    <p className="mt-1.5 text-xs text-amber-600">
                      2 repos per {type === "GROUP" ? "group" : "student"} will be
                      created (backend + frontend).
                    </p>
                  )}
                </div>

                {/*
                  A "Repository visibility" Public/Private toggle used to sit
                  here. Repositories are always PUBLIC now, so there is nothing
                  left to choose.

                  Worth knowing why that is the safe direction rather than the
                  lazy one: SonarCloud's free plan covers public projects only
                  (docs/SONARCLOUD_SETUP.md §4). Picking Private needed a paid
                  plan, and without one `ensureProject` recorded a
                  `repo.sonarError` and the code-quality component — 35% of the
                  grade — came back unmeasured for the whole class.
                */}

                {/* Language + coverage (kept on one row for a tidy layout) */}
                {repoStructure === "SINGLE" ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Language" required>
                      {({ id }) => (
                        <Select
                          id={id}
                          value={stack}
                          onChange={(e) => setStack(e.target.value as Stack)}
                        >
                          {STACK_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Field>
                    <CoverageField
                      label="Minimum test coverage (%)"
                      value={coverage}
                      onChange={setCoverage}
                    />
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Backend language" required>
                      {({ id }) => (
                        <Select
                          id={id}
                          value={backendStack}
                          onChange={(e) => setBackendStack(e.target.value as Stack)}
                        >
                          {BACKEND_STACK_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Field>
                    <Field label="Frontend language" required>
                      {({ id }) => (
                        <Select
                          id={id}
                          value={frontendStack}
                          onChange={(e) => setFrontendStack(e.target.value as Stack)}
                        >
                          {FRONTEND_STACK_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Field>
                    <CoverageField
                      label="Min. coverage (%)"
                      value={coverage}
                      onChange={setCoverage}
                    />
                  </div>
                )}

                {/* Lab session length.
                    Sits with the repository settings because it governs how
                    long a student may keep pushing to these repositories from
                    a lab PC. */}
                <div className="rounded-lg border border-[var(--border-subtle)] p-3">
                  <Field
                    label="Lab session length (hours)"
                    hint={`Leave blank for the default (${limits.defaultSessionHours}h). Maximum ${limits.maxSessionHours}h, set by your IT administrator.`}
                  >
                    {({ id }) => (
                      <Input
                        id={id}
                        type="number"
                        min={limits.minSessionHours}
                        max={limits.maxSessionHours}
                        step={1}
                        value={sessionHours}
                        onChange={(e) => setSessionHours(e.target.value)}
                        placeholder={`${limits.defaultSessionHours} (default)`}
                        className="sm:max-w-[12rem]"
                      />
                    )}
                  </Field>
                  {/* The single most misunderstood thing about this feature.
                      GitHub fixes its token at 60 minutes and offers no way to
                      change it; the extension simply replaces the token as it
                      goes. Saying so here stops teachers from setting a long
                      window believing it lengthens the token, and from setting
                      a short one believing an hour is all students get. */}
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    How long a student can keep working on a lab PC before they
                    have to press Start again. Their GitHub access is renewed
                    automatically every {limits.tokenLifetimeMinutes} minutes
                    behind the scenes — that interval is fixed by GitHub and is
                    not what this sets.
                  </p>
                </div>

                {/* Repo name preview */}
                <div>
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    Repo name preview
                  </span>
                  <ul className="flex flex-wrap gap-2">
                    {namePreview.map((p) => (
                      <li
                        key={p.component}
                        className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-slate-50 px-2 py-1"
                      >
                        {p.component !== "SINGLE" && (
                          <GenericPill
                            tone={p.component === "BACKEND" ? "info" : "success"}
                          >
                            {p.component === "BACKEND" ? "BE" : "FE"}
                          </GenericPill>
                        )}
                        <code className="font-mono text-xs text-[var(--text-strong)]">
                          {p.name}
                        </code>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Errors + actions — pinned below the scroll region so a blocked
              Next always explains itself without the teacher hunting for it. */}
          <div className="shrink-0 space-y-3 border-t border-[var(--border-subtle)] px-6 py-4">
            {blockingErrors.length > 0 && (
              <Banner tone="warning" title="Please fix the following">
                <ul className="ml-4 list-disc space-y-0.5">
                  {blockingErrors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              </Banner>
            )}
            {vm.error && (
              <Banner tone={vm.error.isNetworkError ? "network" : "error"}>
                {vm.error.isNetworkError
                  ? "Couldn't reach the backend to create the project."
                  : vm.error.message}
              </Banner>
            )}

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-[var(--text-muted)]">
                {vm.phase === "creating" && (
                  <span className="inline-flex items-center gap-2">
                    <Spinner size="sm" /> Creating assignment…
                  </span>
                )}
                {vm.phase === "provisioning" && (
                  <span className="inline-flex items-center gap-2">
                    <Spinner size="sm" /> Provisioning real repositories…
                  </span>
                )}
                {vm.phase !== "creating" && vm.phase !== "provisioning" && (
                  <>
                    Step {stepIndex + 1} of {STEPS.length}
                  </>
                )}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={stepIndex === 0 ? handleClose : () => goTo(stepIndex - 1)}
                  disabled={vm.isSubmitting}
                >
                  {stepIndex === 0 ? "Cancel" : "Back"}
                </Button>
                <Button type="submit" loading={vm.isSubmitting}>
                  {isLastStep ? "Create & provision" : "Next"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
