"use client";
// ============================================================================
// VIEW LAYER — Student: Report.
//
// Replaced a ComingSoonPage. Ordered by the two questions a student actually
// opens it with, in the order they ask them:
//
//   how am I doing?  ->  tiles, then marks per class
//   what do I owe?   ->  the outstanding list, last
//
// "How am I doing" goes first deliberately, even though "what do I owe" is the
// more actionable half. A student who opens a report and is shown a to-do list
// has been handed homework; one who is shown their standing has been answered.
// The hub at /student already exists to drive the doing.
//
// NO MARK APPEARS THAT THE TEACHER HAS NOT PUBLISHED. The server blanks those
// before they reach the browser, and this page renders the difference between
// "marked, not published" and "not marked" rather than flattening both to a
// dash — see useStudentReport for why that distinction is available at all.
//
// All derivation lives in the ViewModel. This file positions things.
// ============================================================================
import { useSession } from "@/viewmodels/useSession";
import {
  useStudentReport,
  type ClassReportSection,
  type MarkRow,
  type ProjectRow,
} from "@/viewmodels/useStudentReport";
import { PageHeader } from "@/components/domain/PageHeader";
import {
  Banner,
  Card,
  EmptyState,
  ProgressBar,
  SectionHeading,
  SkeletonCard,
  Stat,
  StateBoundary,
  cn,
} from "@/components/ui";

/** The mark, or an honest account of why there isn't one. */
function MarkValue({ row }: { readonly row: MarkRow }) {
  if (row.state === "PUBLISHED") {
    return (
      <span className="font-semibold text-[var(--text-strong)]">
        {row.grade}
        <span className="text-[var(--text-muted)]"> / {row.outOf}</span>
      </span>
    );
  }

  if (row.state === "AWAITING_RELEASE") {
    return (
      <span className="text-xs font-medium text-amber-700">
        Marked — not published yet
      </span>
    );
  }

  return (
    <span className="text-xs text-[var(--text-muted)]">
      {row.submitted ? "Submitted, not marked" : "Not marked"}
    </span>
  );
}

function ProjectBlock({ project }: { readonly project: ProjectRow }) {
  return (
    <div className="border-t border-[var(--border-subtle)] py-3 first:border-t-0 first:pt-0">
      <p className="text-sm font-medium text-[var(--text-strong)]">
        {project.assignment.title}
      </p>

      {project.rows.length === 0 ? (
        // Not an error state. The teacher has published the project and the
        // repositories have not been created yet, which the student can do
        // nothing about and should not be alarmed by.
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Not set up yet — your teacher has not created the repository.
        </p>
      ) : (
        <ul className="mt-1.5 space-y-1">
          {project.rows.map((row) => (
            <li
              key={row.repoId}
              className="flex flex-wrap items-baseline justify-between gap-2"
            >
              <span className="text-xs text-[var(--text-muted)]">
                {row.half ?? "Your work"}
              </span>
              <MarkValue row={row} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ClassBlock({ section }: { readonly section: ClassReportSection }) {
  return (
    <Card className="p-5">
      <SectionHeading
        title={section.classInfo.name}
        subtitle={
          section.average === null
            ? "No marks published yet."
            : `${section.average}% across ${section.publishedCount} published ${
                section.publishedCount === 1 ? "mark" : "marks"
              }.`
        }
      />

      {section.average !== null && (
        <ProgressBar
          className="mt-3"
          value={section.average}
          tone={section.average >= 50 ? "success" : "warning"}
        />
      )}

      <div className="mt-4">
        {section.projects.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">
            No projects in this class yet.
          </p>
        ) : (
          section.projects.map((project) => (
            <ProjectBlock key={project.assignment.id} project={project} />
          ))
        )}
      </div>
    </Card>
  );
}

export default function StudentReportsPage() {
  const { user } = useSession();
  const vm = useStudentReport(user?.id ?? null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report"
        subtitle="Your marks and what is still open, across every class."
      />

      <StateBoundary
        isLoading={vm.isLoading}
        error={vm.error}
        onRetry={vm.refetch}
        isEmpty={!vm.hasAnything}
        loadingFallback={<SkeletonCard />}
        emptyFallback={
          <EmptyState
            icon="📈"
            title="Nothing to report yet"
            description="Once you join a class and your teacher sets a project, your marks and progress will appear here."
          />
        }
      >
        <div className="space-y-6">
          {/*
            Stated once at the top rather than repeated beside every project it
            affects. A student whose teacher has marked six things and published
            none would otherwise read six identical warnings and no summary.
          */}
          {vm.totals.awaitingRelease > 0 && (
            <Banner tone="warning" title="Some marks are not published yet">
              {vm.totals.awaitingRelease}{" "}
              {vm.totals.awaitingRelease === 1
                ? "piece of work has been marked"
                : "pieces of work have been marked"}{" "}
              but your teacher has not released the {
                vm.totals.awaitingRelease === 1 ? "mark" : "marks"
              } yet. They are not counted in your averages below.
            </Banner>
          )}

          <Card className="p-5">
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
              <Stat
                label="Average"
                value={vm.overallAverage === null ? "—" : `${vm.overallAverage}%`}
                hint={
                  vm.overallAverage === null
                    ? "No published marks"
                    : "Published marks only"
                }
              />
              <Stat label="Classes" value={vm.totals.classes} />
              <Stat label="Projects" value={vm.totals.projects} />
              <Stat label="Submitted" value={vm.totals.submitted} />
              <Stat label="Marks published" value={vm.totals.published} />
            </div>
          </Card>

          {vm.sections.map((section) => (
            <ClassBlock key={section.classInfo.id} section={section} />
          ))}

          <Card className={cn("p-5")}>
            <SectionHeading
              title="Still open"
              subtitle="Projects with work that has not been submitted yet."
            />
            {vm.outstanding.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--text-strong)]">
                Nothing outstanding — everything you have been set is submitted.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {vm.outstanding.map((project) => (
                  <li
                    key={project.assignment.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 border-t border-[var(--border-subtle)] pt-2 first:border-t-0 first:pt-0"
                  >
                    <span className="text-sm text-[var(--text-strong)]">
                      {project.assignment.title}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {project.className}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </StateBoundary>
    </div>
  );
}
