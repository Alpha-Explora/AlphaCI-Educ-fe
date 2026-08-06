"use client";
// VIEW LAYER — Teacher: how grading works.
//
// The general reference, rendered without an assignment rubric. The same
// component takes a `rubric` prop to show one assignment's configured values
// beside each explanation — see AssignmentSubmissions for that usage.
import { PageHeader } from "@/components/domain/PageHeader";
import { RubricDocumentation } from "@/components/domain/RubricDocumentation";

export default function TeacherRubricPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        // Teacher area: title at the right of the band. See PageHeader's titleAlign.
        titleAlign="end"
        title="How grading works"
        subtitle="What each pipeline stage measures, how points are awarded, and which failures stop a student's run."
      />
      <RubricDocumentation />
    </div>
  );
}
