"use client";
// VIEW LAYER — shared Settings page for all three roles. Shows the signed-in
// identity (and, for staff, the active laboratory) and offers Logout. State
// comes from useSession; this component holds no data of its own.
import { useRouter } from "next/navigation";
import { useSession } from "@/viewmodels/useSession";
import { useGithubConnection, type ConnectionTone } from "@/viewmodels/useGithubConnection";
import { isStaffRole } from "@/models/types";
import { Avatar, Button, Card, Spinner, cn } from "@/components/ui";
import { brand } from "@/config/brand";

function Row({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
      <span className="text-sm font-medium text-[var(--text-strong)]">{value}</span>
    </div>
  );
}

const TONE_PILL: Record<ConnectionTone, string> = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  warning: "bg-amber-50 text-amber-700 ring-amber-600/20",
  error: "bg-red-50 text-red-700 ring-red-600/20",
  neutral: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

const TONE_LABEL: Record<ConnectionTone, string> = {
  success: "Active",
  warning: "Needs attention",
  error: "Disconnected",
  neutral: "Not connected",
};

/**
 * GitHub connection — staff only.
 *
 * Every word here comes from a check made against GitHub on load. The page it
 * replaces reported "Sign-in method: Connected account" from `user.githubLogin`,
 * a flag that only ever meant "a link happened once" and therefore kept saying
 * "connected" while repository creation was failing with 401.
 */
function GithubConnectionCard() {
  const vm = useGithubConnection();

  return (
    <Card className="p-5 animate-fade-up sm:max-w-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[var(--text-strong)]">
            GitHub connection
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Used to create student workspaces under your own GitHub account.
          </p>
        </div>
        {!vm.isLoading && (
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
              TONE_PILL[vm.tone],
            )}
          >
            {TONE_LABEL[vm.tone]}
          </span>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-[var(--border-subtle)] bg-slate-50/60 p-4">
        {vm.isLoading ? (
          <span className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Spinner size="sm" /> Checking your GitHub connection…
          </span>
        ) : (
          <>
            <p className="text-sm font-medium text-[var(--text-strong)]">{vm.headline}</p>
            {vm.detail && (
              <p className="mt-1 text-sm text-[var(--text-muted)]">{vm.detail}</p>
            )}
            {/* Verification time, so "Active" is visibly a measurement rather
                than a claim the page is making on its own. */}
            {vm.status?.checkedAt && (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Checked {new Date(vm.status.checkedAt).toLocaleTimeString()}
                {vm.status.scopes.length > 0 && (
                  <> · access granted: {vm.status.scopes.join(", ")}</>
                )}
              </p>
            )}
          </>
        )}
      </div>

      {vm.error && (
        <p className="mt-3 text-sm text-danger">
          {vm.error.isNetworkError
            ? "Couldn't reach the backend to check your GitHub connection."
            : vm.error.message}
        </p>
      )}

      {!vm.isLoading && vm.canConnect && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={vm.connect}>{vm.actionLabel}</Button>
          <Button variant="secondary" onClick={vm.recheck} loading={vm.isChecking}>
            Check again
          </Button>
        </div>
      )}
    </Card>
  );
}

export function SettingsView() {
  const { user, labs, selectedOrgId, logout } = useSession();
  const router = useRouter();

  if (!user) return null;

  const isStaff = isStaffRole(user.role);
  const activeLab = labs.find((l) => l.id === selectedOrgId) ?? null;

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-semibold text-[var(--text-strong)]">Settings</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Your account and workspace details.
        </p>
      </div>

      <Card className="p-5 animate-fade-up sm:max-w-2xl">
        <div className="flex items-center gap-3">
          <Avatar name={user.fullName} color={user.avatarColor} />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-[var(--text-strong)]">
              {user.fullName}
            </p>
            <p className="truncate text-sm text-[var(--text-muted)]">{user.email}</p>
          </div>
        </div>

        <div className="mt-4 divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] pt-1">
          <Row label="Role" value={user.role} />
          {/*
            "Sign-in method" used to read `isGithubSession`, i.e.
            Boolean(user.githubLogin), and print "Connected account". That is an
            identity flag, not a sign-in method and not a connection: everyone
            signs in with email and password now, and the flag stayed true long
            after the GitHub credential had gone. It said "connected" on this
            very page while provisioning was returning 401. The GitHub card
            below answers that question properly, with a verified check.
          */}
          <Row label="Sign-in method" value="School account (email and password)" />
          {/*
            The lab's underlying GitHub organization is still not listed. Where
            the platform hosts source is not something any role needs on a
            profile page.
          */}
          {isStaff && (
            <Row label="Active laboratory" value={activeLab?.name ?? "None selected"} />
          )}
        </div>
      </Card>

      {/* Staff only — students are zero-footprint and hold no External account
          by design, so a "not connected" card would read as a fault. */}
      {isStaff && <GithubConnectionCard />}

      <Card className="p-5 animate-fade-up sm:max-w-2xl">
        <h2 className="text-base font-semibold text-[var(--text-strong)]">Session</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Sign out of {brand.name} on this device.
        </p>
        <Button
          className="mt-4"
          variant="secondary"
          onClick={() => {
            logout();
            router.replace("/");
          }}
        >
          <span aria-hidden="true">🚪</span> Logout
        </Button>
      </Card>
    </div>
  );
}
