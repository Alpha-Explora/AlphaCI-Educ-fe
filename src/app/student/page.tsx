"use client";
// ============================================================================
// VIEW LAYER — Courses (student): the CLASSES a student is enrolled in.
//
// ONE CARD PER CLASS, and the projects live one level down at
// /student/classes/[id].
//
// This page used to render each class as a panel with all of that class's project
// cards inside it. That works for the one-class demo and fails for a real
// timetable: five or six classes means twenty-odd project cards on a single page,
// growing every time any teacher publishes anything, with nothing to tell a
// student which of them to open. A page whose job is orientation should not get
// longer as the term goes on.
//
// So the hub answers "which class?" and nothing else. It mirrors the teacher's
// My Courses grid deliberately — a student and a teacher saying "the AT1234 page"
// should mean the same kind of screen.
//
// Everything on a card comes from the dashboard payload this page already loads,
// so summarising a class costs no extra request. See StudentClassCard.
// ============================================================================
import { useState } from "react";
import { useSession } from "@/viewmodels/useSession";
import { useStudentDashboard } from "@/viewmodels/useStudentDashboard";
import { Button, EmptyState, SkeletonCard, StateBoundary } from "@/components/ui";
import { JoinClassModal } from "@/components/domain/JoinClassModal";
import { StudentClassCard } from "@/components/domain/StudentClassCard";

export default function StudentHubPage() {
  const { user } = useSession();
  const vm = useStudentDashboard(user?.id ?? null);
  const [joinOpen, setJoinOpen] = useState(false);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3 animate-fade-up">
        <div>
          {/* "Courses", not "Assignment Hub". The page lists courses now and the
              assignments live inside them, so the old title named something that
              is no longer on the screen. It also matches the rail's own label and
              the word the teacher side uses for the same level. */}
          <h1 className="text-2xl font-semibold text-[var(--text-strong)]">Courses</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Your classes. Open one to see its projects.
          </p>
        </div>
        <Button onClick={() => setJoinOpen(true)}>
          <span aria-hidden="true">＋</span> Join Class
        </Button>
      </div>

      <StateBoundary
        isLoading={vm.isLoading}
        error={vm.error}
        onRetry={vm.refetch}
        // A student enrolled in classes that have no work yet is NOT empty: the
        // cards say "No projects yet" themselves, which is more useful than one
        // blank page standing in for every class at once.
        isEmpty={!vm.hasClasses}
        emptyFallback={
          <EmptyState
            icon="🎓"
            title="You're not in any classes yet"
            description="Ask your teacher for the class code from the whiteboard, then join to see your assignments."
            action={
              <Button onClick={() => setJoinOpen(true)}>
                <span aria-hidden="true">＋</span> Join Class
              </Button>
            }
          />
        }
        loadingFallback={
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vm.sections.map((section, i) => (
            <StudentClassCard key={section.classInfo.id} section={section} index={i} />
          ))}
        </div>
      </StateBoundary>

      {/* + Join Class (whiteboard code flow) */}
      {joinOpen && (
        <JoinClassModal
          open
          onClose={() => setJoinOpen(false)}
          studentId={user?.id ?? null}
        />
      )}
    </div>
  );
}
