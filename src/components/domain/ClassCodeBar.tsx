"use client";
// ============================================================================
// VIEW LAYER — the code entry, above the student's course list.
//
// One field for the whole page rather than one per card. A student types a code
// perhaps twice a day and always knows which class they are in; a box on every
// card would be five identical inputs asking a question they were not wondering
// about. The server resolves which class the code belongs to anyway, so asking
// them to pick one first would be asking for information we do not need.
//
// It hides itself when every class is already open — an input that can only
// produce "that code is not valid" is not worth the space.
// ============================================================================
import { useState } from "react";
import type { ClassCodeVM } from "@/viewmodels/useClassCode";
import type { ClassSection } from "@/viewmodels/useStudentDashboard";
import { Banner, Button, Input } from "@/components/ui";

export function ClassCodeBar({
  vm,
  sections,
}: {
  readonly vm: ClassCodeVM;
  readonly sections: ClassSection[];
}) {
  const [code, setCode] = useState("");

  const waiting = sections.filter((s) => s.access?.state === "needs-code");
  const enrolledInNothing = sections.length === 0;

  // Shown when a class is waiting for a code, OR when the student has no classes
  // at all — on day one a join code goes in this same box, and hiding it would
  // leave a new student with an empty page and nothing to type into.
  if (waiting.length === 0 && !enrolledInNothing) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed) vm.submit(trimmed);
  };

  return (
    <section
      className="animate-fade-up rounded-xl border border-platform-200 bg-platform-50 p-5"
      aria-labelledby="class-code-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2
            id="class-code-heading"
            className="text-sm font-semibold text-[var(--text-strong)]"
          >
            {enrolledInNothing ? "Join your first class" : "Enter your class code"}
          </h2>
          <p className="mt-0.5 max-w-xl text-sm text-[var(--text-muted)]">
            {enrolledInNothing
              ? "Type the code your teacher gave you. It adds you to the class and opens it in one step."
              : `Your teacher has started ${listClasses(waiting.map((s) => s.classInfo.code))}. Type the code they're showing to start working.`}
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
          <Input
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              // Drop the previous failure the moment they start correcting it —
              // an error under a field they have just retyped reads as a
              // rejection of the NEW value.
              if (vm.submitError) vm.clearError();
            }}
            // Deliberately not a format hint: two shapes are valid here
            // ("4KMNPQ" and "CS101-XYZ"), and showing one as the example makes
            // the other look wrong to a student holding it.
            placeholder="Class code"
            aria-label="Class code"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={20}
            disabled={vm.isSubmitting}
            className="w-48 text-center font-mono uppercase tracking-[0.2em]"
          />
          <Button type="submit" loading={vm.isSubmitting} disabled={!code.trim()}>
            Unlock
          </Button>
        </form>
      </div>

      {vm.submitError && (
        <Banner tone="error" className="mt-3">
          {vm.submitError.message}
        </Banner>
      )}

      {vm.justEnrolledIn && !vm.submitError && (
        <Banner tone="success" className="mt-3">
          You&apos;ve joined {vm.justEnrolledIn}. It&apos;s open below.
        </Banner>
      )}
    </section>
  );
}

/** "CS-101", "CS-101 and WEB-200", "CS-101, WEB-200 and DB-110". */
function listClasses(codes: string[]): string {
  if (codes.length === 0) return "a class";
  if (codes.length === 1) return codes[0];
  return `${codes.slice(0, -1).join(", ")} and ${codes[codes.length - 1]}`;
}
