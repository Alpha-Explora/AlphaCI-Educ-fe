"use client";
// VIEW LAYER — Teacher: what the pipeline runs, per language.
//
// Sits beside /teacher/rubric. That page is the rubric — what is measured and
// what it is worth; this one is the toolchain — which command produced the
// result. Split rather than combined because they are consulted at different
// moments: the rubric when setting an assignment, this when explaining a mark.
import Link from "next/link";
import { PageHeader } from "@/components/domain/PageHeader";
import { LanguageReference } from "@/components/domain/LanguageReference";

export default function TeacherLanguagesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Languages & checks"
        subtitle="Every command the pipeline runs against a student's code, stage by stage, for each language AlphaCI supports."
      />
      <p className="text-sm text-[var(--text-muted)]">
        For what each stage is worth and which failures stop a run, see{" "}
        <Link
          href="/teacher/rubric"
          className="font-medium text-[var(--text-strong)] underline underline-offset-2"
        >
          How grading works
        </Link>
        .
      </p>
      <LanguageReference />
    </div>
  );
}
