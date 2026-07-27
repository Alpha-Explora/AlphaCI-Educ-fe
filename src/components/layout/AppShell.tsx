"use client";
// ============================================================================
// VIEW LAYER — AppShell
// Left sidebar + top bar chrome for the three role areas. Guards the session:
// if there is no user (or the user's role doesn't match this area) it routes
// back to the landing role switcher. Presentational only — all state comes
// from the useSession ViewModel.
// ============================================================================
import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/viewmodels/useSession";
import { canEnterArea } from "@/viewmodels/authRoutes";
import { isStaffRole, type UserRole } from "@/models/types";
import { Avatar, Button, Spinner, cn } from "@/components/ui";
import { GithubModeNote } from "@/components/domain/GithubModeNote";
import { Brand } from "./Brand";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const ROLE_LABEL: Record<UserRole, string> = {
  TEACHER: "Teacher",
  STUDENT: "Student",
  ADMIN: "IT Admin",
  SUPER_ADMIN: "Platform operator",
};

export function AppShell({
  role,
  nav,
  children,
}: {
  role: UserRole;
  nav: NavItem[];
  children: ReactNode;
}) {
  const {
    user,
    isReady,
    logout,
    isGithubSession,
    labs,
    selectedOrgId,
    selectLab,
    labsReady,
    needsLabSelection,
  } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isStaff = isStaffRole(role);
  // A platform operator is admitted to the IT-Admin area too (see canEnterArea).
  const mayEnter = user ? canEnterArea(user.role, role) : false;

  // Session guard: redirect when unauthenticated, role mismatch, or (ADDENDUM K)
  // a staff user hasn't yet chosen which lab to work in.
  useEffect(() => {
    if (!isReady) return;
    if (!user || !mayEnter) {
      router.replace("/");
      return;
    }
    if (!labsReady) return;
    if (needsLabSelection) router.replace("/select-lab");
  }, [isReady, labsReady, user, mayEnter, needsLabSelection, router]);

  // Hold the chrome until we know the session AND (for staff) the lab picture,
  // so the dashboard never flashes unscoped data before a lab is resolved.
  const waitingOnLabs = isStaff && !labsReady;
  if (
    !isReady ||
    !user ||
    !mayEnter ||
    waitingOnLabs ||
    needsLabSelection
  ) {
    return (
      <div className="grid min-h-dvh place-items-center text-platform">
        <Spinner size="lg" />
      </div>
    );
  }

  const activeLab = labs.find((l) => l.id === selectedOrgId) ?? null;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <aside className="hidden border-r border-[var(--border-subtle)] bg-white lg:flex lg:flex-col">
        <div className="flex h-16 items-center border-b border-[var(--border-subtle)] px-5">
          <Link href={`/${role.toLowerCase()}`} className="rounded-md">
            <Brand />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Primary">
          {nav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== `/${role.toLowerCase()}` &&
                pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-platform-50 text-platform-700"
                    : "text-[var(--text-muted)] hover:bg-slate-50 hover:text-[var(--text-strong)]",
                )}
              >
                <span aria-hidden="true" className="text-base">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--border-subtle)] p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => {
              logout();
              router.replace("/");
            }}
          >
            <span aria-hidden="true">🚪</span> Logout
          </Button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-[var(--border-subtle)] bg-white/85 px-4 backdrop-blur-sm sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex items-center gap-3 lg:hidden">
              <Brand compact />
            </div>
            <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-[var(--text-muted)] lg:inline">
              {ROLE_LABEL[role]} workspace
            </span>

            {/* ADDENDUM K — active laboratory + switcher (staff only). */}
            {isStaff && labs.length > 0 && (
              <div className="flex min-w-0 items-center gap-1.5">
                <span aria-hidden="true" className="text-base">
                  🔬
                </span>
                {labs.length > 1 ? (
                  <>
                    <label htmlFor="lab-switch" className="sr-only">
                      Active laboratory
                    </label>
                    <select
                      id="lab-switch"
                      value={selectedOrgId ?? ""}
                      onChange={(e) => void selectLab(e.target.value)}
                      className="max-w-[12rem] truncate rounded-lg border border-[var(--border-subtle)] bg-white px-2.5 py-1.5 text-sm font-medium text-[var(--text-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform"
                    >
                      {labs.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <span className="truncate text-sm font-medium text-[var(--text-strong)]">
                    {activeLab?.name ?? labs[0].name}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium leading-tight text-[var(--text-strong)]">
                {user.fullName}
              </p>
              {/*
                Every role now shows the same thing: role · email. Staff used to
                get a mark and their linked account handle here instead, which
                was the one identifier visible on every single screen.
              */}
              <p className="text-xs leading-tight text-[var(--text-muted)]">
                {ROLE_LABEL[user.role]} · {user.email}
              </p>
            </div>
            {/* Staff keep their profile photo — it's just an avatar image, and
                carries no organization or handle. */}
            {isGithubSession && user.githubAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.githubAvatarUrl}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 rounded-full ring-2 ring-[var(--border-subtle)]"
              />
            ) : (
              <Avatar name={user.fullName} color={user.avatarColor} />
            )}
            {isGithubSession && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  logout();
                  router.replace("/");
                }}
              >
                Logout
              </Button>
            )}
          </div>
        </header>

        {/* Mobile nav */}
        <nav
          className="flex gap-1 overflow-x-auto border-b border-[var(--border-subtle)] bg-white px-3 py-2 lg:hidden"
          aria-label="Primary mobile"
        >
          {nav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== `/${role.toLowerCase()}` &&
                pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium",
                  active
                    ? "bg-platform-50 text-platform-700"
                    : "text-[var(--text-muted)]",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main
          id="main-content"
          className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8"
        >
          <GithubModeNote />
          {children}
        </main>
      </div>
    </div>
  );
}
