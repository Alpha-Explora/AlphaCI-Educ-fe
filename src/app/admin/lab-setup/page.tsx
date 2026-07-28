"use client";
// ============================================================================
// VIEW LAYER — IT Admin: Set up lab PCs.
//
// A web page cannot install software on a lab PC — that is a browser sandbox
// boundary, and the right one. What it CAN do is remove every reason a rollout
// goes wrong: verify the server-side prerequisites against GitHub, and hand IT
// an install script with this deployment's backend URL already in it.
//
// Presentation only; readiness, the rollout copy and the download URL come from
// useLabPcSetup.
// ============================================================================
import { useSession } from "@/viewmodels/useSession";
import { useLabPcSetup, type WorkDirPolicy } from "@/viewmodels/useLabPcSetup";
import {
  Banner,
  Button,
  Card,
  CopyButton,
  Spinner,
  StateBoundary,
  cn,
} from "@/components/ui";

function CheckRow({
  ok,
  label,
  detail,
  fix,
}: {
  readonly ok: boolean;
  readonly label: string;
  readonly detail: string;
  readonly fix?: string;
}) {
  return (
    <li className="flex gap-3 py-3">
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold text-white",
          ok ? "bg-emerald-500" : "bg-amber-500",
        )}
      >
        {ok ? "✓" : "!"}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-[var(--text-strong)]">
          {label}
          <span className="sr-only">{ok ? " — ready" : " — needs attention"}</span>
        </p>
        <p className="mt-0.5 break-words text-sm text-[var(--text-muted)]">{detail}</p>
        {/* A failed check without a next action is just bad news. */}
        {!ok && fix && (
          <p className="mt-1 break-words text-sm text-[var(--text-strong)]">
            <span className="font-medium">Fix:</span> {fix}
          </p>
        )}
      </div>
    </li>
  );
}

function CommandBlock({ command }: { readonly command: string }) {
  return (
    <div className="mt-2 flex items-start gap-2 rounded-lg border border-[var(--border-subtle)] bg-slate-900 p-3">
      <pre className="scroll-thin flex-1 overflow-x-auto font-mono text-xs leading-relaxed text-slate-200">
        {command}
      </pre>
      <CopyButton value={command} label="Copy" />
    </div>
  );
}

export default function AdminLabSetupPage() {
  const { selectedOrgId, labs } = useSession();
  const vm = useLabPcSetup(selectedOrgId);
  const activeLab = labs.find((l) => l.id === selectedOrgId) ?? null;

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-semibold text-[var(--text-strong)]">Set up lab PCs</h1>
        <p className="mt-1 max-w-3xl text-sm text-[var(--text-muted)]">
          What each lab PC needs so students can open an assignment in VS Code and push
          without a GitHub account. Students never install anything — this is done once
          per PC by IT.
        </p>
      </div>

      {!selectedOrgId && (
        <Banner tone="warning" title="No laboratory selected">
          Choose an active laboratory first — the checks below are per lab, because the
          GitHub App is installed per organization.
        </Banner>
      )}

      {selectedOrgId && (
        <StateBoundary
          isLoading={vm.isLoading}
          error={vm.error}
          onRetry={vm.refetch}
          loadingFallback={
            <Card className="p-5">
              <span className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <Spinner size="sm" /> Checking this laboratory against GitHub…
              </span>
            </Card>
          }
        >
          {vm.info && (
            <>
              {/* --- Readiness ------------------------------------------- */}
              <Card className="p-5 animate-fade-up">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-[var(--text-strong)]">
                      Server readiness — {vm.info.org.name}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      Checked against this server and GitHub just now. Every item here
                      fails silently on the PC, so it is worth confirming before you
                      touch a machine.
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                      vm.ready
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                        : "bg-amber-50 text-amber-700 ring-amber-600/20",
                    )}
                  >
                    {vm.ready ? "Ready" : `${vm.blocking.length} to fix`}
                  </span>
                </div>

                <ul className="mt-3 divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                  {vm.info.checks.map((c) => (
                    <CheckRow
                      key={c.id}
                      ok={c.ok}
                      label={c.label}
                      detail={c.detail}
                      fix={c.fix}
                    />
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button variant="secondary" size="sm" onClick={vm.refetch}>
                    Check again
                  </Button>
                  {!vm.ready && (
                    <p className="text-xs text-[var(--text-muted)]">
                      Students are not blocked meanwhile — the manual lab-token fallback
                      keeps working.
                    </p>
                  )}
                </div>
              </Card>

              {/* --- The install artifact -------------------------------- */}
              <Card className="p-5 animate-fade-up">
                <h2 className="text-base font-semibold text-[var(--text-strong)]">
                  Install script for this laboratory
                </h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Downloaded with this server&rsquo;s address already in it, so there is
                  nothing to type. A wrong or missing backend URL is the most common
                  reason a prepared PC does nothing.
                </p>

                <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto,1fr]">
                  <dt className="text-[var(--text-muted)]">Backend URL</dt>
                  <dd className="break-all font-mono text-xs text-[var(--text-strong)]">
                    {vm.info.backendUrl}
                  </dd>
                  <dt className="text-[var(--text-muted)]">Extension</dt>
                  <dd className="font-mono text-xs text-[var(--text-strong)]">
                    {vm.info.extensionId}
                  </dd>
                  <dt className="text-[var(--text-muted)]">Session window</dt>
                  <dd className="text-[var(--text-strong)]">
                    up to {vm.info.session.maxSessionHours} hours
                  </dd>
                </dl>

                {/* Work-dir policy drives both the download and step 4. */}
                <div className="mt-4">
                  <span className="mb-1 block text-sm font-medium text-[var(--text-strong)]">
                    Workspace policy
                  </span>
                  <div
                    role="tablist"
                    aria-label="Workspace policy"
                    className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-slate-50 p-1"
                  >
                    {(
                      [
                        ["ephemeral", "Shared PCs"],
                        ["persistent", "Assigned / VDI"],
                      ] as [WorkDirPolicy, string][]
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={vm.policy === value}
                        onClick={() => vm.setPolicy(value)}
                        className={cn(
                          "rounded-md px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-platform",
                          vm.policy === value
                            ? "bg-white text-platform-700 shadow-sm"
                            : "text-[var(--text-muted)] hover:text-[var(--text-strong)]",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                    {vm.policy === "ephemeral"
                      ? "Each session clones to a temp folder that is wiped when VS Code closes — the right default for a machine many students use."
                      : "The checkout is reused and updated with git pull, which is faster on a machine one student keeps."}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {vm.scriptUrl && (
                    // Navigation rather than fetch: the response carries
                    // Content-Disposition: attachment, so the browser shows a
                    // real Save dialog and stays on this page — and the session
                    // cookie rides along to satisfy the ADMIN check.
                    <Button onClick={() => window.location.assign(vm.scriptUrl as string)}>
                      <span aria-hidden="true">⬇</span> Download install-lab-pc.ps1
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => window.location.assign(vm.info!.extensionInstallUrl)}
                  >
                    Open extension in VS Code
                  </Button>
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  The second button only works once the extension is published to a
                  gallery. Until then, deploy the packaged <code>.vsix</code> alongside
                  the script.
                </p>
              </Card>

              {/* --- The procedure --------------------------------------- */}
              <Card className="p-5 animate-fade-up">
                <h2 className="text-base font-semibold text-[var(--text-strong)]">
                  Per-PC rollout
                </h2>
                <ol className="mt-3 space-y-5">
                  {vm.steps.map((step) => (
                    <li key={step.title}>
                      <p className="text-sm font-semibold text-[var(--text-strong)]">
                        {step.title}
                      </p>
                      <p className="mt-1 max-w-3xl text-sm text-[var(--text-muted)]">
                        {step.body}
                      </p>
                      {step.command && <CommandBlock command={step.command} />}
                    </li>
                  ))}
                </ol>
              </Card>
            </>
          )}
        </StateBoundary>
      )}

      {activeLab && (
        <p className="text-xs text-[var(--text-muted)]">
          Showing setup for <strong>{activeLab.name}</strong>. Switch the active
          laboratory in the header to prepare a different one.
        </p>
      )}
    </div>
  );
}
