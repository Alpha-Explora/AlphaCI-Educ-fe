"use client";
// ============================================================================
// VIEW LAYER — one class's projects (student).
//
// The level the Courses page used to try to be. That page now lists classes; this
// page holds the projects for ONE of them, so its length is bounded by what a
// single teacher published rather than by everything every teacher published.
//
// NO NEW REQUEST. It reads the same `useStudentDashboard` payload the hub reads
// and picks out one section by classId. The dashboard already returns every class
// with its projects, so fetching a per-class endpoint would be a second call for
// bytes React Query is holding — and it would flicker on navigation where this
// renders instantly from cache.
//
// The cost of that choice, stated plainly: a student with twenty classes loads all
// twenty here. That is the same payload the hub loads, so this page adds nothing;
// if it ever becomes a problem it is the DASHBOARD that needs paginating, and both
// screens would change together.
// ============================================================================
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/viewmodels/useSession";
import { useStudentDashboard } from "@/viewmodels/useStudentDashboard";
import {
  Banner,
  EmptyState,
  GenericPill,
  SkeletonCard,
  StateBoundary,
} from "@/components/ui";
import { PageHeader } from "@/components/domain/PageHeader";
import { StudentAssignmentCard } from "@/components/domain/StudentAssignmentCard";
import { manilaMoment } from "@/models/manila";

export default function StudentClassPage() {
  const params = useParams<{ id: string }>();
  const classId = params?.id ?? null;
  const { user } = useSession();
  const vm = useStudentDashboard(user?.id ?? null);

  const section = vm.sections.find((s) => s.classInfo.id === classId) ?? null;
  const locked = section?.access ? !section.access.inSession : false;

  return (
    <div className="space-y-8">
      <PageHeader
        backHref="/student"
        backLabel="Courses"
        title={section ? `${section.classInfo.code} — ${section.classInfo.name}` : "Class"}
        subtitle={undefined}
        meta={
          section && (
            <>
              <GenericPill>{section.classInfo.term}</GenericPill>
              {section.active.length > 0 && (
                <GenericPill tone="warning">{section.active.length} to do</GenericPill>
              )}
              {locked && <GenericPill>🔒 Closed</GenericPill>}
            </>
          )
        }
      />

      <StateBoundary
        isLoading={vm.isLoading}
        error={vm.error}
        onRetry={vm.refetch}
        // Loaded, but this id is not one of the student's classes: they followed a
        // stale link, or were unenrolled. Said as its own case rather than shown as
        // an empty project list, which would read as "your teacher removed the
        // work" instead of "you are not in this class".
        isEmpty={!vm.isLoading && !section}
        emptyFallback={
          <EmptyState
            icon="🔍"
            title="Class not found"
            description="You're not enrolled in this class, or it no longer exists."
            action={
              <Link
                href="/student"
                className="text-sm font-medium text-platform-700 underline underline-offset-2"
              >
                Back to Courses
              </Link>
            }
          />
        }
        loadingFallback={
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        }
      >
        {section && (
          <div className="space-y-8">
            {/* The schedule gate, said once at the top of the class it applies to.
                Projects stay readable below it — the server refuses the ACTIONS
                (start a session, take a token, submit), not the reading. */}
            {locked && section.access && (
              <Banner tone="warning">
                <span className="font-medium">This class is closed right now.</span>{" "}
                {section.access.window ?? "Outside scheduled hours"}
                {section.access.opensAt && <> · Opens {manilaMoment(section.access.opensAt)}</>}
                <span className="mt-1 block text-xs">
                  You can still read your projects and past results. Starting work,
                  getting a token and submitting resume when the class opens.
                </span>
              </Banner>
            )}

            {section.total === 0 ? (
              <EmptyState
                icon="📝"
                title="No projects yet"
                description="When your teacher publishes one, your repository appears here automatically."
              />
            ) : (
              <>
                {section.active.length > 0 && (
                  <section className="space-y-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      To do ({section.active.length})
                    </h2>
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                      {section.active.map((row, i) => (
                        <StudentAssignmentCard
                          key={row.assignment.id}
                          row={row}
                          index={i}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Past work stays reachable but visually demoted — it is
                    reference, not something to act on. */}
                {section.past.length > 0 && (
                  <section className="space-y-4">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Past ({section.past.length})
                    </h2>
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                      {section.past.map((row, i) => (
                        <StudentAssignmentCard
                          key={row.assignment.id}
                          row={row}
                          index={i}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}
      </StateBoundary>
    </div>
  );
}
