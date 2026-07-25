"use client";
// ============================================================================
// VIEW LAYER — Create Project modal (teacher, ADDENDUM C)
// SOLO (checkbox list of students) or GROUP (group builder, 2–4 each, a student
// in only one group). Form state is local; validation rules + the
// create→provision sequence + cache invalidation live in useCreateProject.
// On success shows the shared ProvisionResultSummary (LIVE/SIMULATED + links).
// ============================================================================
import { useMemo, useState } from "react";
import {
  useCreateProject,
  validateGroup,
  repoNamePreview,
  GROUP_MIN,
  GROUP_MAX,
  DEFAULT_COVERAGE,
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

export function CreateProjectModal({
  open,
  onClose,
  classInfo,
  students,
}: {
  open: boolean;
  onClose: () => void;
  classInfo: Pick<ClassCohort, "id" | "code" | "section" | "name">;
  students: SystemUser[];
}) {
  const vm = useCreateProject(classInfo.id);

  // ---- form state (View-owned) ----
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [points, setPoints] = useState("100");
  const [templateUrl, setTemplateUrl] = useState("");
  const [type, setType] = useState<ProjectType>("SOLO");
  const [soloSelected, setSoloSelected] = useState<Set<string>>(
    () => new Set(students.map((s) => s.id)),
  );
  const [groups, setGroups] = useState<GroupDraft[]>([]);

  // ADDENDUM G — scaffold options
  const [repoStructure, setRepoStructure] = useState<ProjectRepoStructure>("SINGLE");
  const [isPrivate, setIsPrivate] = useState(false); // ADDENDUM N — default PUBLIC
  const [stack, setStack] = useState<Stack>("nodejs");
  const [backendStack, setBackendStack] = useState<Stack>("nestjs");
  const [frontendStack, setFrontendStack] = useState<Stack>("nextjs");
  const [coverage, setCoverage] = useState(String(DEFAULT_COVERAGE));

  const namePreview = useMemo(
    () => repoNamePreview({ title, repoStructure, type }),
    [title, repoStructure, type],
  );

  // student id → group id (for one-group-only enforcement in the UI)
  const studentGroup = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groups) for (const sid of g.studentIds) map.set(sid, g.id);
    return map;
  }, [groups]);

  const ungrouped = students.filter((s) => !studentGroup.has(s.id));

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
      templateGithubUrl: templateUrl.trim() || undefined,
      dueDate,
      points: Number(points),
      coverageThreshold: Number(coverage),
      isPrivate,
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

  function handleClose() {
    vm.reset();
    onClose();
  }

  const showSuccess = vm.phase === "success" && vm.result;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={showSuccess ? "Project created" : "Create project"}
      description={
        showSuccess
          ? undefined
          : "Create a solo or group project for this class. Real GitHub repositories are provisioned on submit."
      }
      size="xl"
    >
      {showSuccess && vm.result ? (
        // ---- Success view ----
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
      ) : (
        // ---- Form ----
        <form
          onSubmit={(e) => {
            e.preventDefault();
            vm.submit(buildInput());
          }}
          noValidate
          className="space-y-5"
        >
          <Banner
            tone="info"
            title={`${classInfo.code} · Section ${classInfo.section}`}
          >
            Repositories will be created only for students enrolled in this section.
            {` ${students.length} student${students.length === 1 ? "" : "s"} available.`}
          </Banner>

          {/* Common fields */}
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
            <Field label="Due date" required>
              {({ id }) => (
                <Input
                  id={id}
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              )}
            </Field>
            <Field label="Points" required>
              {({ id }) => (
                <Input
                  id={id}
                  type="number"
                  min={1}
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                />
              )}
            </Field>
            <Field
              label="Template repository URL"
              hint="Optional starter template."
              className="sm:col-span-2"
            >
              {({ id }) => (
                <Input
                  id={id}
                  type="url"
                  value={templateUrl}
                  onChange={(e) => setTemplateUrl(e.target.value)}
                  placeholder="https://github.com/org/template"
                />
              )}
            </Field>
          </div>

          {/* Type toggle */}
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
                  {t === "SOLO" ? "Solo (one repo per student)" : "Group (shared repo)"}
                </button>
              ))}
            </div>
          </div>

          {/* ADDENDUM G — repository scaffold options */}
          <fieldset className="space-y-4 rounded-lg border border-[var(--border-subtle)] p-4">
            <legend className="px-1 text-sm font-semibold text-[var(--text-strong)]">
              Repository setup
            </legend>

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
                  2 repos per {type === "GROUP" ? "group" : "student"} will be created
                  (backend + frontend).
                </p>
              )}
            </div>

            {/* Visibility — PUBLIC by default; teacher may set private */}
            <div>
              <span className="mb-1 block text-sm font-medium text-[var(--text-strong)]">
                Repository visibility
              </span>
              <div
                role="tablist"
                aria-label="Repository visibility"
                className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-slate-50 p-1"
              >
                {([[false, "🌐 Public"], [true, "🔒 Private"]] as [boolean, string][]).map(
                  ([value, label]) => (
                    <button
                      key={String(value)}
                      type="button"
                      role="tab"
                      aria-selected={isPrivate === value}
                      onClick={() => setIsPrivate(value)}
                      className={cn(
                        "rounded-md px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-platform",
                        isPrivate === value
                          ? "bg-white text-platform-700 shadow-sm"
                          : "text-[var(--text-muted)] hover:text-[var(--text-strong)]",
                      )}
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
              <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                {isPrivate
                  ? "Private — only invited collaborators can view these repositories."
                  : "Public (default) — anyone can view; great for student portfolios."}
              </p>
            </div>

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
                <Field label="Minimum test coverage (%)" required hint="CI fails below this %.">
                  {({ id }) => (
                    <Input
                      id={id}
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={coverage}
                      onChange={(e) => setCoverage(e.target.value)}
                    />
                  )}
                </Field>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
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
                </div>
                <Field
                  label="Minimum test coverage (%)"
                  required
                  hint="CI fails below this %."
                  className="sm:max-w-xs"
                >
                  {({ id }) => (
                    <Input
                      id={id}
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={coverage}
                      onChange={(e) => setCoverage(e.target.value)}
                    />
                  )}
                </Field>
              </>
            )}

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
                      <GenericPill tone={p.component === "BACKEND" ? "info" : "success"}>
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
          </fieldset>

          {/* SOLO — student checkbox list */}
          {type === "SOLO" && (
            <fieldset className="rounded-lg border border-[var(--border-subtle)] p-3">
              <legend className="flex items-center gap-2 px-1 text-sm font-medium text-[var(--text-strong)]">
                Students who get a repo
                <span className="rounded-full bg-platform-50 px-2 py-0.5 text-xs font-medium text-platform-700">
                  {soloSelected.size} selected
                </span>
              </legend>
              <div className="mb-2 flex gap-3 px-1 text-xs">
                <button
                  type="button"
                  className="font-medium text-platform hover:underline"
                  onClick={() => setSoloSelected(new Set(students.map((s) => s.id)))}
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
                        <Avatar name={s.fullName} color={s.avatarColor} size="sm" />
                        <span className="truncate text-sm text-[var(--text-strong)]">
                          {s.fullName}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              {students.length === 0 && (
                <p className="px-1 text-sm text-[var(--text-muted)]">
                  No enrolled students in this class.
                </p>
              )}
            </fieldset>
          )}

          {/* GROUP — group builder */}
          {type === "GROUP" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--text-strong)]">
                  Groups{" "}
                  <span className="font-normal text-[var(--text-muted)]">
                    ({GROUP_MIN}–{GROUP_MAX} students each · a student joins only one group)
                  </span>
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setGroups((prev) => [...prev, { id: nextGroupId(), studentIds: [] }])
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
                          {g.studentIds.length} member{g.studentIds.length === 1 ? "" : "s"}
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
                          studentGroup.has(s.id) && studentGroup.get(s.id) !== g.id;
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

          {/* Validation + submit errors */}
          {vm.validationErrors.length > 0 && (
            <Banner tone="warning" title="Please fix the following">
              <ul className="ml-4 list-disc space-y-0.5">
                {vm.validationErrors.map((err) => (
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

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
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
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" loading={vm.isSubmitting}>
                Create &amp; provision
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
