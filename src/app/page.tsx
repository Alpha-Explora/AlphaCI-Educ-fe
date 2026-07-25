"use client";
// ============================================================================
// VIEW LAYER — Landing (two auth paths, ADDENDUM B/I/J)
//   • Faculty & IT Staff — "Sign in with GitHub" → real OAuth redirect; the
//     GitHub team (IT-Staff vs Teacher) decides the dashboard (loginWithGithub).
//   • Student — mock system-account switcher (loginAs({ userId })). There is no
//     mock admin/teacher path anymore — staff use real GitHub only.
// Session + login live in useSession; persona lists come from useRoleSwitcher.
// If /auth/me already resolved a session, we route straight into the role area.
// ============================================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/viewmodels/useSession";
import { useRoleSwitcher } from "@/viewmodels/useRoleSwitcher";
import type { SystemUser, UserRole } from "@/models/types";
import { Avatar, Banner, Button, GithubMark, Spinner, cn } from "@/components/ui";
import { Brand } from "@/components/layout/Brand";

function destinationFor(role: UserRole): string {
  return role === "TEACHER" ? "/teacher" : role === "STUDENT" ? "/student" : "/admin";
}

// ADDENDUM I — the backend redirects back with ?auth=<reason> when GitHub
// sign-in can't complete. Map each reason to a friendly notice.
function authNoticeFor(reason: string | null): string | null {
  switch (reason) {
    case "not_authorized":
      return "That GitHub account isn't on the IT-Staff or Teacher team for this organization. Ask an IT Admin to add you to the right team.";
    case "unavailable":
      return "GitHub sign-in isn't configured on this server yet. Use a mock account below for the demo.";
    case "invalid_state":
    case "failed":
      return "GitHub sign-in didn't complete. Please try again.";
    default:
      return null;
  }
}

// Mock roles shown as account switchers. Students only — teachers and IT
// admins authenticate with real GitHub (ADDENDUM I/J).
const MOCK_ROLES: Array<{
  role: Extract<UserRole, "STUDENT">;
  title: string;
  blurb: string;
  icon: string;
  accent: string;
}> = [
  {
    role: "STUDENT",
    title: "Student",
    blurb: "Work on assignments, read CI feedback, and view your grades.",
    icon: "💻",
    accent: "from-emerald-50 to-white",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const {
    user,
    isReady,
    loginAs,
    loginWithGithub,
    isLoading,
    error: sessionError,
  } = useSession();
  const { usersByRole, isLoading: usersLoading, error: usersError, hasUsers } =
    useRoleSwitcher();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  // If a session already exists (GitHub staff or mock student/admin), route in.
  useEffect(() => {
    if (isReady && user) router.replace(destinationFor(user.role));
  }, [isReady, user, router]);

  // ADDENDUM I — surface any ?auth=<reason> the OAuth callback bounced back with.
  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("auth");
    setAuthNotice(authNoticeFor(reason));
  }, []);

  async function signInUser(u: SystemUser) {
    setPendingKey(u.id);
    const logged = await loginAs({ userId: u.id });
    if (logged) router.push(destinationFor(logged.role));
    else setPendingKey(null);
  }

  async function signInByRole(role: UserRole) {
    setPendingKey(role);
    const logged = await loginAs({ role });
    if (logged) router.push(destinationFor(logged.role));
    else setPendingKey(null);
  }

  // Brief spinner while the initial me() resolves (avoids a flash of the
  // logged-out landing when a session cookie/token is already present).
  if (!isReady || user) {
    return (
      <main
        id="main-content"
        className="grid min-h-dvh place-items-center bg-[var(--bg-canvas)] text-platform"
      >
        <Spinner size="lg" />
      </main>
    );
  }

  return (
    <main
      id="main-content"
      className="relative min-h-dvh overflow-hidden bg-[var(--bg-canvas)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60rem 40rem at 15% -10%, rgba(14,118,168,0.10), transparent 60%), radial-gradient(50rem 40rem at 100% 0%, rgba(36,41,46,0.06), transparent 55%)",
        }}
      />

      <div className="relative mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-10 sm:px-6">
        <header className="flex items-center justify-between">
          <Brand />
          <span className="rounded-full border border-[var(--border-subtle)] bg-white px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
            Prototype · GitHub OAuth + mock SSO
          </span>
        </header>

        <div className="mt-14 max-w-2xl animate-fade-up">
          <p className="text-sm font-semibold uppercase tracking-wide text-platform">
            State University
          </p>
          <h1 className="mt-2 text-4xl font-semibold leading-tight text-[var(--text-strong)] sm:text-5xl">
            Sign in to the AlphaCI Education Tier
          </h1>
          <p className="mt-4 text-base text-[var(--text-muted)]">
            Faculty and IT staff sign in with their real GitHub account — your GitHub team
            decides which dashboard you land on. Students use mock system accounts for the demo.
          </p>
        </div>

        {authNotice && (
          <Banner tone="warning" className="mt-6 max-w-2xl" title="GitHub sign-in">
            {authNotice}
          </Banner>
        )}

        {sessionError && (
          <Banner tone="error" className="mt-6 max-w-2xl" title="Could not sign in">
            {sessionError}
          </Banner>
        )}

        {usersError?.isNetworkError && (
          <Banner tone="network" className="mt-6 max-w-2xl" title="Backend not reachable">
            The API at <code className="font-mono">{usersError.baseUrl}</code> is offline, so
            mock personas can&rsquo;t load and sign-in can&rsquo;t complete. Start the backend
            (<code className="font-mono">AlphaCI-Educ-be</code>) on port 4000.
          </Banner>
        )}

        <section className="mt-8 grid gap-5 lg:grid-cols-2" aria-label="Choose how to sign in">
          {/* Faculty & IT Staff — real GitHub OAuth (team decides the dashboard) */}
          <div
            className="flex flex-col overflow-hidden rounded-2xl border border-github/25 bg-white shadow-card animate-fade-up"
            style={{ animationDelay: "0ms" }}
          >
            <div className="bg-github px-5 pb-5 pt-5 text-white">
              <div className="flex items-center gap-2">
                <GithubMark size={22} />
                <span className="text-xs font-semibold uppercase tracking-wide text-white/60">
                  Faculty &amp; IT Staff
                </span>
              </div>
              <h2 className="mt-3 text-lg font-semibold">Sign in with GitHub</h2>
              <p className="mt-1 text-sm text-white/70">
                Teachers and IT admins both sign in here. Your GitHub team — IT-Staff or
                Teacher — routes you to the right dashboard automatically.
              </p>
            </div>
            <div className="flex flex-1 flex-col justify-end p-4">
              <Button variant="github" className="w-full" onClick={loginWithGithub}>
                <GithubMark size={18} /> Continue with GitHub
              </Button>
              <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
                Redirects to GitHub, then to your role&rsquo;s dashboard.
              </p>
            </div>
          </div>

          {/* Student — mock account switcher (staff use GitHub above) */}
          {usersLoading ? (
            <div className="grid place-items-center py-16 text-platform">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="grid gap-5">
              {MOCK_ROLES.map((meta, idx) => {
                const people = usersByRole[meta.role];
                return (
                  <div
                    key={meta.role}
                    className="flex flex-col rounded-2xl border border-[var(--border-subtle)] bg-white shadow-card animate-fade-up"
                    style={{ animationDelay: `${(idx + 1) * 60}ms` }}
                  >
                    <div
                      className={cn(
                        "rounded-t-2xl bg-gradient-to-br px-5 pb-4 pt-5",
                        meta.accent,
                      )}
                    >
                      <span aria-hidden="true" className="text-2xl">
                        {meta.icon}
                      </span>
                      <h2 className="mt-2 text-lg font-semibold text-[var(--text-strong)]">
                        {meta.title}
                      </h2>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">{meta.blurb}</p>
                    </div>

                    <div className="flex flex-1 flex-col gap-2 p-4">
                      {hasUsers && people.length > 0 ? (
                        people.map((u) => {
                          const isPending = pendingKey === u.id;
                          return (
                            <button
                              key={u.id}
                              onClick={() => signInUser(u)}
                              disabled={isLoading}
                              className="group flex items-center gap-3 rounded-lg border border-transparent px-2.5 py-2 text-left transition-colors hover:border-[var(--border-subtle)] hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform disabled:opacity-60"
                            >
                              <Avatar name={u.fullName} color={u.avatarColor} size="sm" />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-[var(--text-strong)]">
                                  {u.fullName}
                                </span>
                                <span className="block truncate text-xs text-[var(--text-muted)]">
                                  {u.email}
                                </span>
                              </span>
                              {isPending ? (
                                <Spinner size="sm" className="text-platform" />
                              ) : (
                                <span
                                  aria-hidden="true"
                                  className="text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5"
                                >
                                  →
                                </span>
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <Button
                          variant="secondary"
                          className="mt-auto w-full"
                          loading={pendingKey === meta.role}
                          disabled={isLoading}
                          onClick={() => signInByRole(meta.role)}
                        >
                          Continue as {meta.title}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <footer className="mt-auto pt-12 text-xs text-[var(--text-muted)]">
          AlphaCI · Teachers via GitHub OAuth · Students zero-footprint · Single GitHub Org per university
        </footer>
      </div>
    </main>
  );
}
