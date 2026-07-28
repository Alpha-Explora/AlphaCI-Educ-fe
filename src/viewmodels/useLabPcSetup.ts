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
import { useQuery } from "@tanstack/react-query";
import { organizationsApi } from "@/models/api";
import type { LabSetupInfo } from "@/models/types";
import { toPresentableError, type PresentableError } from "./errors";

export type WorkDirPolicy = "ephemeral" | "persistent";

export interface RolloutStep {
  title: string;
  body: string;
  /** Shell/PowerShell to copy, when the step is a command. */
  command?: string;
}

export interface LabPcSetupVM {
  isLoading: boolean;
  error: PresentableError | null;
  info: LabSetupInfo | null;
  /** Checks that still need action, most useful first. */
  blocking: LabSetupInfo["checks"];
  ready: boolean;
  policy: WorkDirPolicy;
  setPolicy: (p: WorkDirPolicy) => void;
  scriptUrl: string | null;
  /** The per-PC rollout, in order, for the chosen policy. */
  steps: RolloutStep[];
  refetch: () => void;
}

/**
 * The per-PC procedure.
 *
 * Two things are called out because both fail invisibly — the script "succeeds"
 * and no student ever sees the extension:
 *   1. Running it as SYSTEM (a machine startup script) installs into
 *      C:\Windows\System32\config\systemprofile.
 *   2. A per-user VS Code install registers vscode:// under HKCU only, so the
 *      deep link works for exactly one Windows account.
 */
function buildSteps(info: LabSetupInfo | null, policy: WorkDirPolicy): RolloutStep[] {
  if (!info) return [];
  return [
    {
      title: "1 · Install VS Code with the System Installer",
      body:
        "Use the “System Installer” build (/ALLUSERS), plus Git and Node on PATH. " +
        "The User Installer registers the vscode:// handler under HKCU only, so the " +
        "one-click handoff would work for the account that installed it and silently " +
        "fail for every other student on that PC.",
    },
    {
      title: "2 · Copy the extension and this script to the PC",
      body:
        "Put the packaged .vsix and the downloaded install-lab-pc.ps1 in the same " +
        "folder (e.g. C:\\LabTools\\). The script already contains this server's " +
        `backend URL (${info.backendUrl}) — nothing to type.`,
    },
    {
      title: "3 · Run it as the account students use",
      body:
        "Shared lab account: run it once during imaging while logged in as that " +
        "account and you are done — install once per PC, never again. Individual " +
        "Windows accounts: register it as a USER LOGON task instead; it is " +
        "idempotent, so it costs about a second on profiles that already have it. " +
        "Never run it as a machine startup script — that executes as SYSTEM and " +
        "installs where no student can see it, while still reporting success.",
      command:
        "powershell -ExecutionPolicy Bypass -File C:\\LabTools\\install-lab-pc.ps1",
    },
    {
      title: "4 · Register logoff cleanup (shared PCs)",
      body:
        policy === "ephemeral"
          ? "Clones and token files live under %TEMP% and are wiped when VS Code closes. " +
            "Add the logoff script as a belt-and-braces measure for the case where VS Code " +
            "was killed or the machine lost power."
          : "You chose the persistent policy, so checkouts survive between sessions. On a " +
            "SHARED PC add -WipePersistent so the next student cannot read the previous " +
            "student's work. On assigned machines or VDI, leave it off.",
      command:
        policy === "ephemeral"
          ? 'powershell -ExecutionPolicy Bypass -File "C:\\LabTools\\logoff-cleanup.ps1"'
          : 'powershell -ExecutionPolicy Bypass -File "C:\\LabTools\\logoff-cleanup.ps1" -WipePersistent',
    },
    {
      title: "5 · Verify on one PC before rolling out",
      body:
        "Sign in as a student, open an assignment, and press “Start assignment in VS Code”. " +
        "VS Code should open on the repository with a countdown in the status bar, and " +
        "git push should succeed with no prompt. Confirm no secret is left behind: " +
        ".git/config should contain a credential helper path and no ghs_ token.",
      command: 'Select-String -Path .git\\config -Pattern "ghs_"   # expect: no matches',
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

  return {
    isLoading: query.isLoading,
    error: query.error ? toPresentableError(query.error) : null,
    info,
    blocking: info ? info.checks.filter((c) => !c.ok) : [],
    ready: info?.ready ?? false,
    policy,
    setPolicy,
    scriptUrl: orgId ? organizationsApi.labSetupScriptUrl(orgId, policy) : null,
    steps: buildSteps(info, policy),
    refetch: () => void query.refetch(),
  };
}
