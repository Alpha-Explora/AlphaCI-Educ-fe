"use client";
// VIEW LAYER — IT Admin: manage the school's course catalog for the ACTIVE lab.
// Create courses and assign instructors. Scoped to the lab selected in the top
// bar, so the same admin can manage each laboratory separately.
import { useSession } from "@/viewmodels/useSession";
import { useState } from "react";
import { CourseCatalogCard } from "@/components/domain/CourseCatalogCard";
import { AdminCreateSectionModal } from "@/components/domain/AdminCreateSectionModal";

export default function AdminCoursesPage() {
  // The course a section is being created under, or null when the builder is closed.
  const [sectionCourseId, setSectionCourseId] = useState<string | null>(null);
  const { user, labs, selectedOrgId } = useSession();
  const orgId = selectedOrgId ?? user?.orgId ?? null;
  const activeLab = labs.find((l) => l.id === orgId) ?? null;

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-semibold text-[var(--text-strong)]">
          Manage school courses
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Create courses and assign teachers for{" "}
          <strong>{activeLab?.name ?? "the active laboratory"}</strong>, then create
          the class sections under each course and set their hours. A section never
          double-books a teacher or a laboratory.
        </p>
      </div>

      {orgId && (
        <>
          {/*
            Sections are created per COURSE, from each course's own card — a
            section is always a section OF a course, so a page-level button
            would have to open with a course picker just to establish what it
            was creating. The admin owns the timetable, not the teacher: a
            section's hours book a person and a room.
          */}
          <CourseCatalogCard orgId={orgId} onCreateSection={setSectionCourseId} />

          {sectionCourseId && (
            <AdminCreateSectionModal
              open
              onClose={() => setSectionCourseId(null)}
              orgId={orgId}
              courseId={sectionCourseId}
            />
          )}
        </>
      )}
    </div>
  );
}
