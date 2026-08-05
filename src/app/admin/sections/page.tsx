"use client";
// ============================================================================
// VIEW LAYER — every class section in this laboratory, and its hours.
//
// The admin creates sections and books their slots, so they need somewhere to
// see and change them afterwards. Creation stays on the course card, where the
// course is the thing you are standing on; this is the page for everything that
// already exists.
//
// A TABLE, not a calendar. The calendar answers what the week looks like, which
// the teacher's Schedule tab already does. This answers which sections exist and
// whether any are unscheduled — and the row that matters most is the one with no
// hours at all, which is invisible on a grid by definition.
// ============================================================================
import { useState } from "react";
import { useSession } from "@/viewmodels/useSession";
import { useAdminSections, type AdminSectionRow } from "@/viewmodels/useAdminSections";
import { EditSectionHoursModal } from "@/components/domain/EditSectionHoursModal";
import {
  Banner,
  Button,
  Card,
  EmptyState,
  GenericPill,
  Skeleton,
  StateBoundary,
} from "@/components/ui";

export default function AdminSectionsPage() {
  const { selectedOrgId, labs } = useSession();
  const vm = useAdminSections(selectedOrgId);
  const [editing, setEditing] = useState<AdminSectionRow | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const activeLab = labs.find((l) => l.id === selectedOrgId);
  const unscheduled = vm.sections.filter((s) => !s.window).length;

  return (
    <div className="space-y-6">
      <header className="animate-fade-up">
        <h1 className="text-2xl font-semibold text-[var(--text-strong)]">
          Class sections
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
          Every section in{" "}
          <strong>{activeLab?.name ?? "the active laboratory"}</strong>. You set the
          hours, and a section never double-books a teacher or a laboratory. Create
          new ones from their course on Manage school courses.
        </p>
      </header>

      {/* Surfaced rather than left to be noticed: a section with no hours is
          workable at ANY time once its teacher starts the class, which is
          usually not what an admin intended to leave behind. */}
      {unscheduled > 0 && (
        <Banner tone="warning" className="animate-fade-up">
          {unscheduled} {unscheduled === 1 ? "section has" : "sections have"} no hours
          yet. Students can work on them at any time once their teacher starts the
          class.
        </Banner>
      )}

      {vm.removeError && <Banner tone="error">{vm.removeError.message}</Banner>}

      <StateBoundary
        isLoading={vm.isLoading}
        error={vm.error}
        onRetry={vm.refetch}
        isEmpty={vm.sections.length === 0}
        emptyFallback={
          <EmptyState
            icon="🏫"
            title="No class sections yet"
            description="Open Manage school courses, choose a course, and create its first section."
          />
        }
        loadingFallback={<Skeleton className="h-64 w-full rounded-xl" />}
      >
        <Card className="overflow-hidden animate-fade-up">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-slate-50/70 text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Section
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Term
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Class hours
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {vm.sections.map((row) => (
                  <tr
                    key={row.classInfo.id}
                    className="transition-colors hover:bg-slate-50/60"
                  >
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      <p className="font-medium text-[var(--text-strong)]">{row.label}</p>
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        {row.classInfo.name}
                      </p>
                    </th>
                    <td className="px-4 py-3 text-[var(--text-muted)]">
                      {row.classInfo.term}
                    </td>
                    <td className="px-4 py-3">
                      {row.window ? (
                        <span className="tabular-nums text-[var(--text-strong)]">
                          {row.window}
                        </span>
                      ) : (
                        <GenericPill tone="warning">No hours set</GenericPill>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {confirmingDelete === row.classInfo.id ? (
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {/* Named, because "delete this section" is abstract
                              until you see which one — and it takes the
                              section's projects and student work with it. */}
                          <span className="text-xs text-red-700">
                            Delete {row.label} and its work?
                          </span>
                          <Button
                            variant="danger"
                            size="sm"
                            loading={vm.isRemoving && vm.removingId === row.classInfo.id}
                            onClick={() => {
                              vm.remove(row.classInfo.id);
                              setConfirmingDelete(null);
                            }}
                          >
                            Delete
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmingDelete(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              // Clear a previous failure so the modal does not
                              // open showing an error about a different section.
                              vm.resetHours();
                              setEditing(row);
                            }}
                          >
                            {row.window ? "Edit hours" : "Set hours"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => setConfirmingDelete(row.classInfo.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </StateBoundary>

      {editing && (
        <EditSectionHoursModal
          row={editing}
          isSaving={vm.isSavingHours}
          error={vm.hoursError}
          onClose={() => setEditing(null)}
          onSave={(schedule) => {
            vm.setHours(editing.classInfo.id, schedule);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
