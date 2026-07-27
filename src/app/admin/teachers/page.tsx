"use client";
// ============================================================================
// VIEW LAYER — Admin › Manage Teachers (/admin/teachers)
//
// The admin's in-system way to add a teacher. Adding one here also grants them
// access to the laboratory's source hosting and sends a set-your-password
// email — both handled by the backend, neither named as a provider anywhere on
// this screen.
//
// Presentation only: useTeacherDirectory owns the list, the form, and the
// outcome wording.
// ============================================================================
import { useEffect, useState } from "react";
import { useSession } from "@/viewmodels/useSession";
import { useTeacherDirectory } from "@/viewmodels/useTeacherDirectory";
import {
  Avatar,
  Banner,
  Button,
  Card,
  EmptyState,
  Skeleton,
  StateBoundary,
  cn,
} from "@/components/ui";
import { AddTeacherModal } from "@/components/domain/AddTeacherModal";
import { Modal } from "@/components/ui";
import { formatDate } from "@/components/ui/format";

/**
 * Where this teacher is in the join journey. Three states, not two, because
 * "signed in" and "connected GitHub" became separate events once sign-in moved
 * to email + password — a teacher can be working happily for weeks without ever
 * linking, and an admin chasing an unlinked account needs to see which of the
 * two is actually missing.
 */
function AccessState({
  isArchived,
  hasSignedIn,
  hasLinkedGithub,
}: {
  readonly isArchived: boolean;
  readonly hasSignedIn: boolean;
  readonly hasLinkedGithub: boolean;
}) {
  // Checked first: once revoked, how far they got through the join journey is
  // no longer the useful fact about them.
  if (isArchived) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        Removed
      </span>
    );
  }
  if (hasLinkedGithub) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        Connected
      </span>
    );
  }
  if (hasSignedIn) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-platform-50 px-2.5 py-0.5 text-xs font-medium text-platform-700 ring-1 ring-inset ring-platform-200">
        <span className="h-1.5 w-1.5 rounded-full bg-platform" />
        Signed in
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
      <span className="h-1.5 w-1.5 rounded-full bg-warning" />
      Invited
    </span>
  );
}

/**
 * The GitHub account for this teacher, and whether it is confirmed.
 *
 * `githubUsername` is what the admin EXPECTED (pinned at invite time);
 * `githubLogin` is what actually linked. Showing the expected handle greyed out
 * until it links is what makes "did the right person connect?" answerable at a
 * glance — and if only the expected one is set, the admin knows the invitation
 * is still outstanding rather than wondering whether they typed it wrong.
 */
function GithubIdentity({
  expected,
  linked,
}: {
  readonly expected: string | null;
  readonly linked: string | null;
}) {
  if (!expected && !linked) {
    return <span className="text-xs text-[var(--text-muted)]">No GitHub yet</span>;
  }
  return (
    <span
      className={cn(
        "font-mono text-xs",
        linked ? "text-[var(--text-strong)]" : "text-[var(--text-muted)]",
      )}
      title={linked ? "Connected" : "Invited — not connected yet"}
    >
      @{linked ?? expected}
    </span>
  );
}

export default function AdminTeachersPage() {
  const { user, selectedOrgId } = useSession();
  const orgId = selectedOrgId ?? user?.orgId ?? null;
  const vm = useTeacherDirectory(orgId);
  const [addOpen, setAddOpen] = useState(false);

  /*
    Close the dialog once the add succeeds. Note this deliberately does NOT call
    vm.reset(): the outcome banner lives on the page behind the dialog, and
    resetting would clear it — which matters most in the failure-ish case, where
    the banner is the only place the admin learns that access is still pending.
  */
  useEffect(() => {
    if (vm.outcome) setAddOpen(false);
  }, [vm.outcome]);

  /** Cancel / dismiss — here a full reset IS right, discarding a half-typed form. */
  function closeAdd() {
    setAddOpen(false);
    vm.reset();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-strong)]">Teachers</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Add teaching staff to this laboratory, and see who has signed in and
            connected their GitHub account.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={vm.syncWithOrg}
            disabled={!orgId || vm.isSyncing}
            loading={vm.isSyncing}
          >
            {vm.isSyncing ? "Syncing…" : "Sync with organization"}
          </Button>
          <Button onClick={() => setAddOpen(true)} disabled={!orgId}>
            + Add teacher
          </Button>
        </div>
      </div>

      {/* The outcome of the last add stays on the page after the dialog closes —
          a warning about pending access would otherwise vanish with the modal. */}
      {vm.outcome && (
        <Banner
          tone={vm.outcome.tone}
          title={vm.outcome.title}
          action={
            <Button size="sm" variant="secondary" onClick={vm.dismissOutcome}>
              Dismiss
            </Button>
          }
        >
          {vm.outcome.detail}
        </Banner>
      )}

      {vm.staffOutcome && (
        <Banner
          tone={vm.staffOutcome.tone}
          title={vm.staffOutcome.title}
          action={
            <Button size="sm" variant="secondary" onClick={vm.dismissStaffOutcome}>
              Dismiss
            </Button>
          }
        >
          {vm.staffOutcome.detail}
        </Banner>
      )}

      <StateBoundary
        isLoading={vm.isLoading}
        error={vm.error}
        onRetry={vm.refetch}
        loadingFallback={
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        }
      >
        {vm.teachers.length === 0 ? (
          <EmptyState
            icon="🧑‍🏫"
            title="No teachers yet"
            description="Add your first teacher and they'll be emailed an invitation to join."
            action={<Button onClick={() => setAddOpen(true)}>+ Add teacher</Button>}
          />
        ) : (
          <Card className="overflow-hidden animate-fade-up">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-3.5">
              <h2 className="text-base font-semibold text-[var(--text-strong)]">
                Teaching staff
              </h2>
              <span className="rounded-full bg-platform-50 px-2.5 py-0.5 text-xs font-medium text-platform-700">
                {vm.teachers.length}
              </span>
            </div>
            <ul className="divide-y divide-[var(--border-subtle)]">
              {vm.teachers.map((t) => (
                <li
                  key={t.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 px-5 py-3.5",
                    t.status !== "ACTIVE" && "opacity-60",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={t.fullName} color={t.avatarColor} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text-strong)]">
                        {t.fullName}
                      </p>
                      <p className="truncate text-xs text-[var(--text-muted)]">{t.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
                    <span className="hidden text-xs text-[var(--text-muted)] sm:inline">
                      Added {formatDate(t.createdAt)}
                    </span>
                    <GithubIdentity
                      expected={t.githubUsername}
                      linked={t.githubLogin}
                    />
                    <AccessState
                      isArchived={t.status !== "ACTIVE"}
                      hasSignedIn={Boolean(t.lastSignInAt ?? t.githubLogin)}
                      hasLinkedGithub={Boolean(t.githubLogin)}
                    />
                    {t.status === "ACTIVE" && (
                      <button
                        type="button"
                        onClick={() => vm.askToRemove(t)}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-danger transition-colors hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </StateBoundary>

      <AddTeacherModal open={addOpen} onClose={closeAdd} vm={vm} />

      {/* Destructive, permanent and cross-system, so it is confirmed rather than
          instant — and the copy is explicit that classes and student work go too,
          because that is the part nobody expects from a button labelled Remove. */}
      <Modal
        open={Boolean(vm.pendingRemoval)}
        onClose={vm.cancelRemoval}
        title={`Delete ${vm.pendingRemoval?.fullName ?? ""}?`}
        description="This permanently deletes their account. It cannot be undone."
        size="md"
      >
        <div className="space-y-4">
          <ul className="space-y-1.5 text-sm text-[var(--text-muted)]">
            <li>• Their account is deleted — not hidden.</li>
            <li>• They are removed from the laboratory&rsquo;s organization.</li>
            <li>
              • <strong className="text-[var(--text-strong)]">Any classes they
              teach are deleted too</strong>, along with those classes&rsquo;
              projects and the students&rsquo; submitted work.
            </li>
            <li>• Student accounts and the course catalogue are kept.</li>
          </ul>
          <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
            <Button variant="secondary" onClick={vm.cancelRemoval} disabled={vm.isRemoving}>
              Cancel
            </Button>
            <Button variant="danger" onClick={vm.confirmRemoval} loading={vm.isRemoving}>
              {vm.isRemoving ? "Deleting…" : "Delete permanently"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
