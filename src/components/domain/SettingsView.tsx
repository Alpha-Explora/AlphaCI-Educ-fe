"use client";
// VIEW LAYER — shared Settings page for all three roles. Shows the signed-in
// identity (and, for staff, the active laboratory) and offers Logout. State
// comes from useSession; this component holds no data of its own.
import { useRouter } from "next/navigation";
import { useSession } from "@/viewmodels/useSession";
import { Avatar, Button, Card } from "@/components/ui";

function Row({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
      <span className="text-sm font-medium text-[var(--text-strong)]">{value}</span>
    </div>
  );
}

export function SettingsView() {
  const { user, labs, selectedOrgId, isGithubSession, logout } = useSession();
  const router = useRouter();

  if (!user) return null;

  const isStaff = user.role === "TEACHER" || user.role === "ADMIN";
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
          <Row
            label="Sign-in method"
            value={isGithubSession ? "GitHub" : "School account"}
          />
          {user.githubLogin && <Row label="GitHub" value={`@${user.githubLogin}`} />}
          {isStaff && (
            <Row label="Active laboratory" value={activeLab?.name ?? "None selected"} />
          )}
          {isStaff && activeLab && (
            <Row label="GitHub organization" value={activeLab.githubOrgName} />
          )}
        </div>
      </Card>

      <Card className="p-5 animate-fade-up sm:max-w-2xl">
        <h2 className="text-base font-semibold text-[var(--text-strong)]">Session</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Sign out of AlphaCI on this device.
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
