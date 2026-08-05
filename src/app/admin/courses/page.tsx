"use client";
// VIEW LAYER — IT Admin: manage the school's course catalog for the ACTIVE lab.
// Create courses and assign instructors. Scoped to the lab selected in the top
// bar, so the same admin can manage each laboratory separately.
import { useSession } from "@/viewmodels/useSession";
import { useState } from "react";
import { CourseCatalogCard } from "@/components/domain/CourseCatalogCard";
import { AdminCreateSectionModal } from "@/components/domain/AdminCreateSectionModal";
import { Button } from "@/components/ui";

export default function AdminCoursesPage() {
  const [createOpen, setCreateOpen] = useState(false);
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
          <strong>{activeLab?.name ?? "the active laboratory"}</strong>. Teachers can
          then create class sections under the courses you assign them.
        </p>
      </div>

      {orgId && (
        <>
          {/*
            Sections are created HERE, not by the teacher. A section's hours book
            a teacher and a laboratory, so the person who can see the whole
            timetable is the one who should be placing it.
          */}
          <div className="flex justify-end animate-fade-up">
            <Button onClick={() => setCreateOpen(true)}>
              <span aria-hidden="true">＋</span> Create class section
            </Button>
          </div>

          <CourseCatalogCard orgId={orgId} />

          {createOpen && (
            <AdminCreateSectionModal
              open
              onClose={() => setCreateOpen(false)}
              orgId={orgId}
            />
          )}
        </>
      )}
    </div>
  );
}
