"use client";
// ============================================================================
// VIEW LAYER — IT Admin: Set up lab PCs.
//
// A web page cannot install software on a lab PC — that is a browser sandbox
// boundary, and the right one. What it CAN do is remove every reason a rollout
// goes wrong: verify the prerequisites against GitHub, and hand IT the exact
// files with this deployment's backend URL and token already inside them.
//
// ORGANISED BY WHAT IS ACTUALLY PER LABORATORY. An earlier version put every
// check under "Server readiness — <lab name>" and titled the installer "Install
// script for this laboratory". Both were misleading: the credentials, the flags
// and the published extension are one set of values for the whole deployment,
// and the generated script differs between labs by a single comment line. Only
// the GitHub App installation is genuinely per lab. Presenting it the old way
// made IT re-verify settings that cannot differ and obscured the one that can.
//
// Presentation only; readiness, grouping, rollout copy and downloads come from
// useLabPcSetup.
// ============================================================================
import { useRef } from "react";
import { useSession } from "@/viewmodels/useSession";
import {
  useLabPcSetup,
  type LabPcSetupVM,
  type RolloutStep,
  type WorkDirPolicy,
} from "@/viewmodels/useLabPcSetup";
import type { LabSetupCheck } from "@/models/types";
import {
  Banner,
  Button,
  Card,
  CopyButton,
  Spinner,
  StateBoundary,
  cn,
} from "@/components/ui";

/* -------------------------------------------------------------------------- */
/* Primitives                                                                  */
/* -------------------------------------------------------------------------- */

function StatusBadge({ ok, okLabel, badLabel }: {
  readonly ok: boolean;
  readonly okLabel: string;
  readonly badLabel: string;
}) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        ok
          ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
          : "bg-amber-50 text-amber-700 ring-amber-600/20",
      )}
    >
      {ok ? okLabel : badLabel}
    </span>
  );
}

function CheckRow({ check }: { readonly check: LabSetupCheck }) {
  const { ok, label, detail, fix } = check;
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
        <p className="mt-0.5 break-words text-sm leading-relaxed text-[var(--text-muted)]">
          {detail}
        </p>
        {/* A failed check without a next action is just bad news. */}
        {!ok && fix && (
          <p className="mt-1.5 break-words rounded-md bg-amber-50 px-2.5 py-1.5 text-sm leading-relaxed text-amber-900">
            <span className="font-semibold">Fix:</span> {fix}
          </p>
        )}
      </div>
    </li>
  );
}

function CommandBlock({ command }: { readonly command: string }) {
  return (
    <div className="mt-2.5 flex items-start gap-2 rounded-lg border border-slate-700/50 bg-slate-900 p-3">
      <pre className="scroll-thin flex-1 overflow-x-auto font-mono text-xs leading-relaxed text-slate-200">
        {command}
      </pre>
      <CopyButton value={command} label="Copy" />
    </div>
  );
}

/** Label/value rows that stay aligned on desktop and stack cleanly on mobile. */
function DefRow({ term, children }: {
  readonly term: string;
  readonly children: React.ReactNode;
}) {
  return (
    <>
      <dt className="text-sm text-[var(--text-muted)] sm:py-1">{term}</dt>
      <dd className="mb-2 min-w-0 text-sm text-[var(--text-strong)] sm:mb-0 sm:py-1">
        {children}
      </dd>
    </>
  );
}

function CardTitle({ title, subtitle, badge }: {
  readonly title: string;
  readonly subtitle?: string;
  readonly badge?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-[var(--text-strong)]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
            {subtitle}
          </p>
        )}
      </div>
      {badge}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sections                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The fleet's extension version — publish once, every lab PC converges.
 *
 * WHAT THIS IS NOT. It is not a button that updates ten PCs when pressed. Nothing
 * in a browser can reach another machine, and building the UI as though it could
 * would leave IT believing a rollout had happened when it had only been requested.
 * So the copy says "publish", names what converges the PCs, and shows what the
 * server currently hands out.
 */
function FleetVersionCard({ vm }: { readonly vm: LabPcSetupVM }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const extension = vm.info?.extension;
  if (!extension) return null;

  return (
    <Card className="p-5 animate-fade-up sm:p-6">
      <CardTitle
        title="Fleet extension version"
        subtitle="Upload the packaged .vsix once. Every lab PC in every laboratory checks this at logon and installs it only if it is newer — you do not touch the machines."
        badge={
          <StatusBadge
            ok={Boolean(extension.fleetVersion)}
            okLabel={`v${extension.fleetVersion}`}
            badLabel="Nothing published"
          />
        }
      />

      {extension.uploadedAt && (
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          Published {extension.uploadedAt.slice(0, 10)}
          {extension.uploadedBy ? ` by ${extension.uploadedBy}` : ""}.
        </p>
      )}

      {/* Reported rather than failed: whether the artifact should be readable by
          anyone with the URL is a deployment decision, not a fault. But it must be
          visible, because the package is the thing every PC installs. */}
      {extension.fleetVersion && !extension.distributionProtected && (
        <Banner tone="warning" className="mt-3">
          Anyone who knows the URL can download this <code>.vsix</code>. Set{" "}
          <code className="font-mono text-xs">LAB_EXTENSION_TOKEN</code> on the server
          to require a token.
        </Banner>
      )}

      {vm.publishError && (
        <Banner
          tone={vm.publishError.isNetworkError ? "network" : "error"}
          className="mt-3"
        >
          {vm.publishError.isNetworkError
            ? "Couldn't reach the backend to publish."
            : vm.publishError.message}
        </Banner>
      )}

      {vm.publishedVersion && !vm.publishError && (
        <Banner tone="success" className="mt-3">
          v{vm.publishedVersion} is now the fleet version. Lab PCs pick it up at their
          next logon.
        </Banner>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {/* A hidden input driven by a real Button, so the control matches every
            other action on this page instead of a bare browser file picker. */}
        <input
          ref={inputRef}
          type="file"
          accept=".vsix"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) vm.publishExtension(file);
            // Cleared so choosing the SAME file again still fires a change event —
            // which is exactly what someone does after a failed upload.
            e.target.value = "";
          }}
        />
        <Button onClick={() => inputRef.current?.click()} loading={vm.isPublishing}>
          <span aria-hidden="true">⬆</span>{" "}
          {extension.fleetVersion ? "Publish a new version" : "Publish the extension"}
        </Button>
      </div>

      <div className="mt-4 space-y-1.5 border-t border-[var(--border-subtle)] pt-3 text-xs leading-relaxed text-[var(--text-muted)]">
        <p>
          Build it with <code className="font-mono">npm run package</code> in
          AlphaCI-Educ-lab-ext. Deploy the backend BEFORE publishing: a new extension
          against an old server is worse than not updating at all.
        </p>
        {/* Learned the hard way on 2026-08-05: a fix to the updater looked like it
            had shipped because the .vsix version went up, while every PC carried on
            running the copy saved at install time. */}
        <p>
          <span className="font-semibold text-[var(--text-strong)]">
            This updates the extension only.
          </span>{" "}
          The updater script itself is saved to each PC during setup and is never
          re-fetched, so a change to it reaches a machine only by re-running
          install-lab-pc.ps1 there.
        </p>
      </div>
    </Card>
  );
}

/** The two files a technician carries to a PC, and the policy that shapes them. */
function DownloadsCard({ vm }: { readonly vm: LabPcSetupVM }) {
  const info = vm.info;
  if (!info) return null;

  return (
    <Card className="p-5 animate-fade-up sm:p-6">
      <CardTitle
        title="Files for every lab PC"
        subtitle="The same two files work on every PC in every laboratory. They are generated with this server's address and token already inside, so there is nothing to type."
      />

      <dl className="mt-4 grid gap-x-6 sm:grid-cols-[10rem,1fr]">
        <DefRow term="Backend URL">
          <span className="break-all font-mono text-xs">{info.backendUrl}</span>
        </DefRow>
        <DefRow term="Extension">
          <span className="font-mono text-xs">{info.extensionId}</span>
        </DefRow>
        {/* Was "Session window — up to N hours". There is no window any more: a lab
            session lasts while the project is open and the class is inside its
            teacher-set hours, so quoting a duration would describe a control that
            no longer exists. */}
        <DefRow term="Access lasts">
          While the project is open and the class is within its scheduled hours
        </DefRow>
      </dl>

      {/* Work-dir policy drives both the generated script and the wording of the
          cleanup step, so it has to be chosen before downloading. */}
      <div className="mt-5">
        <span className="mb-1.5 block text-sm font-medium text-[var(--text-strong)]">
          Workspace policy
        </span>
        <div
          role="tablist"
          aria-label="Workspace policy"
          className="inline-flex rounded-lg border border-[var(--border-subtle)] bg-slate-50 p-1"
        >
          {/*
            LABELLED BY WHO CAN READ THE FOLDER, NOT BY WHAT THE HARDWARE IS.

            The right-hand option used to read "Assigned / VDI", which asked the
            admin to classify the machine. That is a PROXY for the thing that
            actually decides whether `persistent` is safe -- can another student
            log in and read this checkout? -- and the proxy breaks on pooled VDI
            that keeps profiles between students. That configuration answers
            "yes", but "VDI" is in the label, so it lands here and then reads
            guidance telling it to leave the cleanup task off.

            What is left on disk is not only coursework: the work dir holds a
            live `ghs_` GitHub token. See EPHEMERAL_STORAGE.md, which records a
            machine found holding nine checkouts and three token files, one still
            valid, because the wipe had never once run.
          */}
          {(
            [
              ["ephemeral", "Shared PCs"],
              ["persistent", "One student per machine"],
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
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[var(--text-muted)]">
          {vm.policy === "ephemeral"
            ? "Each session clones to a temp folder that is wiped when VS Code closes — the right default for a machine many students share. The cost is a fresh clone and dependency install each session."
            : "The checkout is reused and updated with git pull, so there is no re-clone or dependency install each session. Choose this only when nobody else can log into the machine, or when the whole desktop is discarded at logoff (non-persistent VDI)."}
        </p>
        {/*
          Shown ONLY on the persistent side, and not as a general note: it is the
          one configuration where the choice above is wrong in a way the admin
          cannot see. Pooled VDI that keeps profiles looks like "one student per
          machine" from the desk and behaves like a shared PC on disk.
        */}
        {vm.policy === "persistent" && (
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-[var(--text-strong)]">
            <strong>Virtual desktops:</strong> this is safe on{" "}
            <em>non-persistent</em> VDI, where the profile is rebuilt at every
            logon. If your VDI <em>keeps</em> each profile and students are given
            whatever desktop is free, it is a shared PC — choose{" "}
            <strong>Shared PCs</strong> instead. To check: save a file to the
            desktop, log off, log back on. If it is still there, treat it as
            shared.
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {/* FETCHED, not navigated to. `window.location.assign` cannot carry the
            bearer token this client authenticates with, so it 401s whenever the
            frontend and backend are different sites — fine on localhost, broken on
            Vercel -> Render. */}
        <Button onClick={vm.downloadScript} loading={vm.isDownloading}>
          <span aria-hidden="true">⬇</span> install-lab-pc.ps1
        </Button>
        {vm.canDownloadExtension ? (
          <Button
            variant="secondary"
            onClick={vm.downloadExtension}
            loading={vm.isDownloading}
          >
            <span aria-hidden="true">⬇</span> educ-lab-
            {vm.info?.extension.fleetVersion}.vsix
          </Button>
        ) : (
          <p className="self-center text-xs text-[var(--text-muted)]">
            Publish an extension above to download the .vsix.
          </p>
        )}
      </div>

      {vm.downloadError && (
        <Banner
          tone={vm.downloadError.isNetworkError ? "network" : "error"}
          className="mt-3"
        >
          {vm.downloadError.isNetworkError
            ? "Couldn't reach the backend to download."
            : vm.downloadError.message}
        </Banner>
      )}
    </Card>
  );
}

/** One rollout step. Numbered from position so the list cannot misnumber itself. */
function StepItem({ step, index }: {
  readonly step: RolloutStep;
  readonly index: number;
}) {
  return (
    <li className="flex gap-4">
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold",
          step.optional
            ? "bg-slate-100 text-[var(--text-muted)] ring-1 ring-inset ring-[var(--border-subtle)]"
            : "bg-platform-600 text-white",
        )}
      >
        {index}
      </span>
      <div className="min-w-0 flex-1 pb-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--text-strong)]">
          <span>
            <span className="sr-only">Step {index}: </span>
            {step.title}
          </span>
          {step.optional && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
              Optional
            </span>
          )}
        </p>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-[var(--text-muted)]">
          {step.body}
        </p>
        {step.command && <CommandBlock command={step.command} />}
        {/* The line that matters at 8am in a lab that is not working. Given its own
            treatment so it survives skim-reading. */}
        {step.note && (
          <p className="mt-2.5 max-w-3xl border-l-2 border-amber-300 bg-amber-50/60 py-1.5 pl-3 text-sm leading-relaxed text-amber-900">
            {step.note}
          </p>
        )}
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function AdminLabSetupPage() {
  const { selectedOrgId, labs } = useSession();
  const vm = useLabPcSetup(selectedOrgId);
  const activeLab = labs.find((l) => l.id === selectedOrgId) ?? null;

  return (
    <div className="space-y-6">
      <header className="animate-fade-up">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-strong)]">
          Set up lab PCs
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-[var(--text-muted)]">
          What each PC needs so a student can open an assignment in VS Code and push
          without a GitHub account. Done once per PC by IT — students never install
          anything. Everything here is shared across laboratories except the GitHub App
          check.
        </p>
      </header>

      {!selectedOrgId && (
        <Banner tone="warning" title="No laboratory selected">
          Choose an active laboratory in the header. Only the GitHub App check differs
          per lab — the rest of this page is the same whichever you pick.
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
                <Spinner size="sm" /> Checking this deployment against GitHub…
              </span>
            </Card>
          }
        >
          {vm.info && (
            <div className="space-y-6">
              {/* --- 1. Readiness, split by what it is actually about ------ */}
              <section className="grid gap-4 lg:grid-cols-2">
                <Card className="p-5 animate-fade-up sm:p-6">
                  <CardTitle
                    title="This server"
                    subtitle="Configuration for the whole deployment. Identical for every laboratory — you do not need to re-check it per lab."
                    badge={
                      <StatusBadge
                        ok={vm.serverReady}
                        okLabel="Ready"
                        badLabel={`${vm.serverChecks.filter((c) => !c.ok).length} to fix`}
                      />
                    }
                  />
                  <ul className="mt-3 divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                    {vm.serverChecks.map((c) => (
                      <CheckRow key={c.id} check={c} />
                    ))}
                  </ul>
                </Card>

                <Card className="p-5 animate-fade-up sm:p-6">
                  <CardTitle
                    title={`This laboratory — ${vm.info.org.name}`}
                    subtitle="The only thing that differs per lab. Each laboratory is its own GitHub organization, so the App has to be installed on each one."
                    badge={
                      <StatusBadge
                        ok={vm.labReady}
                        okLabel="Ready"
                        badLabel={`${vm.labChecks.filter((c) => !c.ok).length} to fix`}
                      />
                    }
                  />
                  <ul className="mt-3 divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                    {vm.labChecks.map((c) => (
                      <CheckRow key={c.id} check={c} />
                    ))}
                  </ul>
                  <p className="mt-4 text-xs text-[var(--text-muted)]">
                    Switch the active laboratory in the header to check another one.
                  </p>
                </Card>
              </section>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" size="sm" onClick={vm.refetch}>
                  Check again
                </Button>
                {/* Local time, not `generatedAt.slice(11, 16)`. That slice prints the
                    UTC field of the ISO string, so an admin in UTC+8 reads "16:43"
                    at 00:43 and concludes the checks are stale. Safe against a
                    hydration mismatch because this branch only renders once the
                    client fetch has resolved. */}
                <span className="text-xs text-[var(--text-muted)]">
                  Checked{" "}
                  {new Date(vm.info.generatedAt).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  against this server and GitHub.
                </span>
              </div>

              {/* Was a small caption under the checklist. It is the consequence of
                  everything above, and the lab-token fallback that used to soften it
                  no longer exists — an unfinished checklist now means nobody can open
                  an assignment at all. */}
              {!vm.ready && (
                <Banner tone="error" title="Students cannot open assignments yet">
                  Until every check passes there is no route to their code — the manual
                  token fallback was removed. Finish the items above before a class.
                </Banner>
              )}

              {/* --- 2. Publish, then 3. download: the .vsix must exist ---- */}
              <FleetVersionCard vm={vm} />
              <DownloadsCard vm={vm} />

              {/* --- 4. The procedure ------------------------------------- */}
              <Card className="p-5 animate-fade-up sm:p-6">
                <CardTitle
                  title="Per-PC rollout"
                  subtitle="Do this once on each machine. The same procedure applies in every laboratory."
                />
                <ol className="mt-5 space-y-6">
                  {vm.steps.map((step, i) => (
                    <StepItem key={step.title} step={step} index={i + 1} />
                  ))}
                </ol>
              </Card>
            </div>
          )}
        </StateBoundary>
      )}

      {activeLab && (
        <p className="text-xs text-[var(--text-muted)]">
          GitHub App check shown for <strong>{activeLab.name}</strong>. Everything else
          on this page applies to every laboratory.
        </p>
      )}
    </div>
  );
}
