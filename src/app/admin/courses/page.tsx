"use client";
// VIEW LAYER — IT Admin: manage the school's course catalog for the ACTIVE lab.
// Create courses and assign instructors. Scoped to the lab selected in the top
// bar, so the same admin can manage each laboratory separately.
import { useSession } from "@/viewmodels/useSession";
import { CourseCatalogCard } from "@/components/domain/CourseCatalogCard";

export default function AdminCoursesPage() {
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

      {orgId && <CourseCatalogCard orgId={orgId} />}
    </div>
  );
}
