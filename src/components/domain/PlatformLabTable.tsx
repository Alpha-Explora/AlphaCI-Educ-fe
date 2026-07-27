"use client";
// ============================================================================
// VIEW LAYER — every laboratory on the platform, one row each.
//
// Presentation only. Which labs need attention, and in what order they appear,
// is decided by useSuperAdminConsole; this file only knows how to draw the
// verdict it is handed.
// ============================================================================
import { Button, Card, EmptyState, cn } from "@/components/ui";
import type { LabAlert, LabRow } from "@/viewmodels/useSuperAdminConsole";

const ALERT_LABEL: Record<LabAlert, string> = {
  DISCONNECTED: "Source hosting disconnected",
  FAILED_RUNS: "Failing pipelines",
  PLAGIARISM: "Plagiarism flags",
  NO_TEACHERS: "Classes with no teacher",
};

function AlertChip({ alert }: { readonly alert: LabAlert }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-warning" />
      {ALERT_LABEL[alert]}
    </span>
  );
}

function Metric({ label, value, alarm }: { readonly label: string; readonly value: number; readonly alarm?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-lg font-semibold tabular-nums",
          alarm && value > 0 ? "text-danger" : "text-[var(--text-strong)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function PlatformLabTable({
  labs,
  onOpenLab,
  openingLabId,
}: {
  readonly labs: LabRow[];
  readonly onOpenLab: (orgId: string) => void;
  readonly openingLabId: string | null;
}) {
  if (labs.length === 0) {
    return (
      <EmptyState
        icon="🏫"
        title="No laboratories yet"
        description="Labs appear here as soon as a school organization is registered."
      />
    );
  }

  return (
    <div className="space-y-4">
      {labs.map((lab) => (
        <Card key={lab.orgId} className="overflow-hidden animate-fade-up">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-subtle)] px-5 py-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-[var(--text-strong)]">
                  {lab.orgName}
                </h3>
                {lab.needsAttention ? (
                  lab.alerts.map((alert) => <AlertChip key={alert} alert={alert} />)
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" />
                    Healthy
                  </span>
                )}
              </div>
              {/* The customer's GitHub org, shown because the operator IS the
                  vendor — this is the one surface where naming it is correct. */}
              <p className="mt-1 truncate font-mono text-xs text-[var(--text-muted)]">
                {lab.githubOrgName}
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onOpenLab(lab.orgId)}
              disabled={openingLabId !== null}
            >
              {openingLabId === lab.orgId ? "Opening…" : "Open lab →"}
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 p-5 sm:grid-cols-5 lg:grid-cols-8">
            <Metric label="Admins" value={lab.admins} />
            <Metric label="Teachers" value={lab.teachers} />
            <Metric label="Students" value={lab.students} />
            <Metric label="Courses" value={lab.courses} />
            <Metric label="Classes" value={lab.classes} />
            <Metric label="Active" value={lab.activeProjects} />
            <Metric label="Failed runs" value={lab.failedRuns} alarm />
            <Metric label="Flagged" value={lab.flaggedPlagiarism} alarm />
          </div>
        </Card>
      ))}
    </div>
  );
}
