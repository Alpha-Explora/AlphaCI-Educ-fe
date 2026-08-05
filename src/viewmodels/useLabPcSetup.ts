"use client";
// ============================================================================
// VIEWMODEL LAYER — Lab PC setup (IT Admin)
//
// Turns "is the one-click VS Code handoff going to work on our lab PCs?" into a
// checklist with next actions, and hands IT the exact artifacts to deploy.
//
// Exists because every prerequisite in this chain fails SILENTLY at the point of
// use: with the GitHub App not installed on a lab org, tokens come back
// simulated and the extension bails with "GitHub is not enabled" — which reads
// like a broken extension install. IT would then debug the PC, which is fine.
//
// The rollout copy lives here rather than in the page because it is policy, not
// markup: which command to run, and the two mistakes that silently produce a
// dead PC.
// ============================================================================
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { organizationsApi, saveBlob } from "@/models/api";
import type { LabSetupInfo } from "@/models/types";
import { toPresentableError, type PresentableError } from "./errors";

export type WorkDirPolicy = "ephemeral" | "persistent";

export interface RolloutStep {
  title: string;
  body: string;
  /** Shell/PowerShell to copy, when the step is a command. */
  command?: string;
  /**
   * The mistake this step prevents, or how to tell it went wrong.
   *
   * Separated from `body` because these are the lines that matter at 8am in a lab
   * that is not working, and burying them mid-paragraph is how they get skipped.
   */
  note?: string;
  /** Real but skippable — the view de-emphasises it rather than hiding it. */
  optional?: boolean;
}

export interface LabPcSetupVM {
  isLoading: boolean;
  error: PresentableError | null;
  info: LabSetupInfo | null;
  /**
   * Publish a .vsix as the fleet's version.
   *
   * The button an admin presses cannot reach a lab PC — nothing in a browser can —
   * so this sets DESIRED STATE and each PC's logon task converges on it. The naming
   * says "publish" rather than "update" for that reason: calling it an update would
   * promise something the web can't deliver.
   */
  publishExtension: (file: File) => void;
  isPublishing: boolean;
  publishError: PresentableError | null;
  /** Version accepted by the last successful upload, for immediate confirmation. */
  publishedVersion: string | null;

  /**
   * Save the install script / the published .vsix.
   *
   * Both FETCH and then save a Blob rather than navigating to a URL. A navigation
   * cannot carry the bearer token this client authenticates with, so it 401s on any
   * deployment where the frontend and backend are different sites — which is what
   * happened on Vercel -> Render while working fine on localhost.
   */
  downloadScript: () => void;
  downloadExtension: () => void;
  isDownloading: boolean;
  downloadError: PresentableError | null;
  /** False until something is published — nothing to download before that. */
  canDownloadExtension: boolean;
  /** True only when EVERY check passes, server-wide and per lab. */
  ready: boolean;
  /**
   * The same checks split by what they are actually about.
   *
   * The page used to present all of them under "Server readiness — <lab name>",
   * which read as though every one were a property of the selected laboratory. Four
   * of the five are deployment-wide and identical whichever lab is chosen; only the
   * GitHub App installation is per lab. Showing them in one list made IT re-verify
   * settings that cannot differ, and obscured the single item that can.
   */
  serverChecks: LabSetupInfo["checks"];
  labChecks: LabSetupInfo["checks"];
  /** True when every deployment-wide check passes. */
  serverReady: boolean;
  /** True when this laboratory's own checks pass. */
  labReady: boolean;
  policy: WorkDirPolicy;
  setPolicy: (p: WorkDirPolicy) => void;
  /** The per-PC rollout, in order, for the chosen policy. */
  steps: RolloutStep[];
  refetch: () => void;
}

/**
 * The per-PC procedure.
 *
 * Steps are NOT numbered in their titles — the view numbers them from position, so
 * inserting or removing one cannot leave the list saying "4, 5, 5, 7".
 *
 * Every `note` here is a failure that is INVISIBLE at the time it happens: the
 * script reports success and no student sees the extension until a class walks in.
 * They are separated from the body so they survive skim-reading.
 */
function buildSteps(info: LabSetupInfo | null, policy: WorkDirPolicy): RolloutStep[] {
  if (!info) return [];
  const version = info.extension.fleetVersion;
  return [
    {
      title: "Install VS Code with the System Installer",
      body:
        "Use the “System Installer” build, which installs for every account on the " +
        "machine. Git and Node must be on PATH as well.",
      note:
        "Not the User Installer. It registers the vscode:// handler under HKCU only, " +
        "so the one-click handoff works for the account that installed it and silently " +
        "does nothing for every other student on that PC.",
    },
    {
      title: "Put both downloads in one folder on the PC",
      body:
        `Download install-lab-pc.ps1 and ${version ? `educ-lab-${version}.vsix` : "the .vsix"} ` +
        String.raw`from this page and drop them in the same folder — C:\LabTools\ by default. ` +
        `The script already carries this server's address (${info.backendUrl}) and the ` +
        "extension token, so there is nothing to type and nothing to configure per lab.",
      note:
        "The script installs whichever educ-lab-*.vsix sits beside it. If the folder has " +
        "several, it takes the highest version.",
    },
    {
      title: "Run it as Administrator, signed in as the account students use",
      body:
        "Shared lab account: run it once during imaging while logged in as that account " +
        "and the PC is done. Individual Windows accounts: register it as a USER LOGON " +
        "task instead — it is idempotent, so it costs about a second on profiles that " +
        "already have it.",
      command: String.raw`powershell -ExecutionPolicy Bypass -File C:\LabTools\install-lab-pc.ps1`,
      note:
        "Elevation is required: without it the scheduled tasks cannot be registered and " +
        "the run ends in “Access is denied”. Never register it as a machine STARTUP " +
        "script either — that executes as SYSTEM and installs into a profile no student " +
        "can see, while still reporting success.",
    },
    {
      title: "Register logoff cleanup",
      optional: true,
      body:
        policy === "ephemeral"
          ? "Not required with the shared-PC policy you selected: clones and token files " +
            "live under %TEMP% and are already wiped when VS Code closes. Add this only as " +
            "a belt-and-braces measure for machines that get killed or lose power mid-session."
          : "Recommended with the persistent policy you selected, because checkouts survive " +
            "between sessions. Leave it off only where nobody else can log in, or where the " +
            "whole desktop is discarded at logoff (non-persistent VDI). If another student " +
            "could ever log into this machine — including pooled VDI that keeps profiles — " +
            "add -WipePersistent, so the next student cannot read the previous student's work " +
            "or their GitHub token.",
      command:
        policy === "ephemeral"
          ? String.raw`powershell -ExecutionPolicy Bypass -File "C:\LabTools\logoff-cleanup.ps1"`
          : String.raw`powershell -ExecutionPolicy Bypass -File "C:\LabTools\logoff-cleanup.ps1" -WipePersistent`,
      note:
        "logoff-cleanup.ps1 is not downloadable from this page — it ships in the " +
        "AlphaCI-Educ-lab-ext repository under deploy/. Copy it next to install-lab-pc.ps1 " +
        "BEFORE running that script and it registers the task for you.",
    },
    {
      title: "Verify on one PC before rolling out",
      body:
        "Sign in as a student, open an assignment and press “Start assignment in VS Code”. " +
        "VS Code should open on the repository with “✓ AlphaCI” in the status bar — that is " +
        "a state, not a countdown; there is no session timer. git push should succeed with " +
        "no prompt.",
      command: String.raw`Select-String -Path .git\config -Pattern "ghs_"   # expect: no matches`,
      note:
        "The command confirms no credential was left on disk: .git/config should name a " +
        "credential helper and contain no ghs_ token.",
    },
    {
      title: "Confirm the PC can update itself",
      body:
        "The installer also registers “AlphaCI Extension Update (logon)”, which reads the " +
        "version published above and installs it only when it is newer. Once this task " +
        "exists you never touch the PC again to change the extension.",
      command:
        "Get-ScheduledTask -TaskName 'AlphaCI Extension Update (logon)'   # expect: Ready",
      note:
        "“No MSFT_ScheduledTask objects found” means the task was never registered, which " +
        "means step 3 did not run as Administrator. Re-run it elevated.",
    },
  ];
}

export function useLabPcSetup(orgId: string | null): LabPcSetupVM {
  // The VM owns the policy: it changes both the download and the wording of
  // step 4, so splitting ownership would let the page show instructions for one
  // policy while handing out a script for the other.
  const [policy, setPolicy] = useState<WorkDirPolicy>("ephemeral");

  const query = useQuery({
    queryKey: ["organizations", orgId ?? "none", "lab-setup"],
    queryFn: () => organizationsApi.labSetup(orgId as string),
    enabled: Boolean(orgId),
    // The App-installed check calls GitHub, so this is not free. Long enough to
    // survive navigating around the page, short enough that installing the App
    // in another tab shows up on a manual re-check.
    staleTime: 60_000,
    retry: false,
  });

  const info = query.data ?? null;

  // Grouped on the server-sent `scope`, never on a list of ids kept here: an id list
  // in the client is a second copy of a backend fact, and a check added there would
  // quietly land in whichever group the fallback chose.
  const allChecks = info?.checks ?? [];
  const serverChecks = allChecks.filter((c) => c.scope === "server");
  const labChecks = allChecks.filter((c) => c.scope === "laboratory");

  const publish = useMutation({
    mutationFn: (file: File) => organizationsApi.publishLabExtension(file),
    onSuccess: () => {
      // The checklist carries the published version and its own "is anything
      // published?" check, so both are stale the moment this succeeds. Refetching
      // rather than patching keeps the server as the single source of truth for
      // what the fleet should run — the whole point of the feature.
      void query.refetch();
    },
  });

  // One mutation for both files: they fail the same way and only one can be in
  // flight at a time, so a shared error banner tells the whole story.
  const download = useMutation({
    mutationFn: async (what: "script" | "extension") => {
      if (what === "script") {
        const blob = await organizationsApi.downloadLabSetupScript(
          orgId as string,
          policy,
        );
        saveBlob(blob, "install-lab-pc.ps1");
        return;
      }
      const blob = await organizationsApi.downloadLabExtension();
      // Named after the version so a technician can tell builds apart on disk.
      saveBlob(blob, `educ-lab-${info?.extension.fleetVersion ?? "latest"}.vsix`);
    },
  });

  return {
    isLoading: query.isLoading,
    error: query.error ? toPresentableError(query.error) : null,
    info,
    ready: info?.ready ?? false,
    serverChecks,
    labChecks,
    serverReady: serverChecks.every((c) => c.ok),
    labReady: labChecks.every((c) => c.ok),
    policy,
    setPolicy,
    steps: buildSteps(info, policy),
    refetch: () => void query.refetch(),

    publishExtension: (file: File) => {
      if (!publish.isPending) publish.mutate(file);
    },
    isPublishing: publish.isPending,
    publishError: publish.error ? toPresentableError(publish.error) : null,
    publishedVersion: publish.data?.version ?? null,

    downloadScript: () => {
      if (orgId && !download.isPending) download.mutate("script");
    },
    downloadExtension: () => {
      if (!download.isPending) download.mutate("extension");
    },
    isDownloading: download.isPending,
    downloadError: download.error ? toPresentableError(download.error) : null,
    // False until something is published: offering a download of nothing would
    // produce a 404 the admin has to interpret.
    canDownloadExtension: Boolean(info?.extension.fleetVersion),
  };
}
