"use client";
// ============================================================================
// VIEW LAYER — Connect GitHub (/connect-github)
//
// The step that replaced "sign in with GitHub". By the time anyone sees this
// they are already signed in with their email and password; connecting GitHub
// attaches an identity to that existing account and lets Team membership decide
// their real role.
//
// Skipping is allowed on purpose. A teacher who cannot reach GitHub today can
// still read and grade with the role their profile already carries — blocking
// the dashboard behind an external service would strand them.
//
// Presentation only: useConnectGithub owns who belongs here and where each
// button leads.
// ============================================================================
import { Banner, Button, Card, GithubMark, Spinner } from "@/components/ui";
import { Brand } from "@/components/layout/Brand";
import { useConnectGithub } from "@/viewmodels/useConnectGithub";
import { useAuthNotice } from "@/viewmodels/useAuthNotice";

function Step({ n, children }: { readonly n: number; readonly children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-platform-50 text-xs font-semibold text-platform-700"
      >
        {n}
      </span>
      <span className="text-sm text-[var(--text-muted)]">{children}</span>
    </li>
  );
}

export default function ConnectGithubPage() {
  const vm = useConnectGithub();
  const notice = useAuthNotice();

  if (vm.isResolving) {
    return (
      <main className="grid min-h-dvh place-items-center bg-[var(--bg-canvas)]">
        <Spinner size="lg" />
        <span className="sr-only">Checking your account…</span>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      className="grid min-h-dvh place-items-center bg-[var(--bg-canvas)] px-4 py-10"
    >
      <div className="w-full max-w-lg space-y-6">
        <div className="flex justify-center">
          <Brand />
        </div>

        {notice && (
          <Banner tone={notice.tone} title={notice.title}>
            {notice.message}
          </Banner>
        )}

        <Card className="p-6 sm:p-8 animate-fade-up">
          {vm.isLinked ? (
            <>
              <h1 className="text-xl font-semibold text-[var(--text-strong)]">
                GitHub is connected
              </h1>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Your account is linked as{" "}
                <span className="font-mono text-[var(--text-strong)]">
                  {vm.linkedLogin}
                </span>
                . Your access is set by the teams that account belongs to.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={vm.skip}>Continue →</Button>
                <Button variant="secondary" onClick={vm.connect}>
                  Reconnect
                </Button>
              </div>
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                Reconnect if you&rsquo;ve just been added to a different team and
                your access hasn&rsquo;t caught up.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-[var(--text-strong)]">
                Connect your GitHub account
              </h1>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                You&rsquo;re signed in as{" "}
                <span className="font-medium text-[var(--text-strong)]">
                  {vm.fullName}
                </span>{" "}
                ({vm.email}). One more step sets up what you can do.
              </p>

              <ol className="mt-5 space-y-3">
                <Step n={1}>
                  We check which teams your GitHub account belongs to.
                </Step>
                <Step n={2}>
                  That decides your access — teaching staff, IT admin, or platform
                  operator.
                </Step>
                <Step n={3}>
                  You only do this once. Afterwards you sign in with your email and
                  password as usual.
                </Step>
              </ol>

              <div className="mt-6">
                <Button variant="github" className="w-full py-3" onClick={vm.connect}>
                  <GithubMark size={18} /> Connect GitHub
                </Button>
              </div>

              <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
                <button
                  type="button"
                  onClick={vm.skip}
                  className="text-sm font-medium text-platform-600 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform"
                >
                  Skip for now
                </button>
                <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                  You&rsquo;ll keep the access your account already has, but some
                  actions that create repositories may be unavailable until you
                  connect.
                </p>
              </div>
            </>
          )}
        </Card>
      </div>
    </main>
  );
}
