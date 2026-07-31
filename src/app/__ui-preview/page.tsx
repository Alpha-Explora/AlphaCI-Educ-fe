"use client";
// TEMPORARY — visual check for the new card/header/modal work. Delete after.
import { useState } from "react";
import { Button, Field, GenericPill, Input, Modal, Stat } from "@/components/ui";
import { PageHeader } from "@/components/domain/PageHeader";
import { CourseCard } from "@/components/domain/CourseCard";
import { ClassCard } from "@/components/domain/ClassCard";
import type { CourseBoardEntry, TeacherClass } from "@/viewmodels/useTeacherCourseBoard";

const cls = (id: string, section: string, name: string): TeacherClass => ({
  id,
  orgId: "org-1",
  courseId: "course-1",
  name,
  code: "AT1234",
  section,
  term: "1st Semester",
  githubTeamSlug: "lab/at1234",
  createdAt: new Date().toISOString(),
  magicJoinCode: "AT1234-3H60",
  joinCodeExpiresAt: null,
  joinCodeActive: true,
  studentCount: 24,
  assignmentCount: 3,
  pendingGrading: 2,
});

const entry = (id: string, code: string, title: string): CourseBoardEntry => ({
  course: {
    id,
    orgId: "org-1",
    code,
    title,
    description: "This course is a testing grounds for project workflows",
    createdAt: new Date().toISOString(),
  } as CourseBoardEntry["course"],
  label: `${code} — ${title}`,
  classes: [{ classInfo: cls(`${id}-a`, "A", title), sharedFromLabName: null }],
  studentCount: 24,
  pendingGrading: 0,
});

export default function Preview() {
  const [open, setOpen] = useState(true);
  return (
    <div className="mx-auto max-w-6xl space-y-10 p-8">
      <PageHeader
        backHref="/teacher"
        backLabel="AT1234 — classes"
        title="AT1234 — AlphaTest"
        meta={
          <>
            <GenericPill tone="info">Section A</GenericPill>
            <GenericPill>1st Semester</GenericPill>
          </>
        }
        actions={<Button variant="secondary">＋ Create class</Button>}
      />

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-[var(--border-subtle)] bg-white p-5 shadow-card sm:grid-cols-4">
        <Stat label="Students" value={24} tone="platform" />
        <Stat label="Submitted" value={9} tone="warning" />
        <Stat label="Graded" value={4} tone="success" />
        <Stat label="Class avg" value="78%" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[
          entry("c1", "AT1234", "AlphaTest"),
          entry("c2", "IS-2601", "Web Applications 2"),
          entry("c3", "CS-101", "Programming 1"),
          entry("c4", "MA-220", "Discrete Mathematics"),
          entry("c5", "SE-330", "Software Engineering"),
          entry("c6", "DB-210", "Database Systems"),
        ].map((e, i) => (
          <CourseCard key={e.course.id} entry={e} index={i} />
        ))}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[
          cls("k1", "A", "AlphaTest"),
          cls("k2", "B", "Web Applications 2"),
          cls("k3", "C", "Programming 1"),
        ].map((c, i) => (
          <ClassCard key={c.id} classInfo={c} index={i} />
        ))}
      </div>

      <Button onClick={() => setOpen(true)}>Open modal</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create class"
        description="Set the section and term for this class. A join code is generated automatically."
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--border-subtle)] bg-slate-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Course
            </p>
            <p className="mt-0.5 text-sm font-medium text-[var(--text-strong)]">
              AT1234 — AlphaTest
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Section" required hint="e.g. A">
              {({ id }) => <Input id={id} placeholder="A" />}
            </Field>
            <Field label="Term" required hint="e.g. Fall 2026">
              {({ id }) => <Input id={id} placeholder="Fall 2026" />}
            </Field>
          </div>
          <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button>Create class</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
