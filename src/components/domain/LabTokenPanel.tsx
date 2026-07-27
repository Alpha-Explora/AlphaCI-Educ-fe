"use client";
// ============================================================================
// VIEW LAYER — Lab token panel (plan §8, App Token Model)
// "Get Lab Token" mints a short-lived GitHub App installation token scoped to
// THIS repo only. Shows: SIMULATED/LIVE badge, masked token + reveal toggle,
// copy, live expiry countdown, and a copyable git-clone snippet. Presentational
// — token/state/actions come from useRepositoryDetail.
// ============================================================================
import { useEffect, useRef, useState } from "react";
import type { LabToken } from "@/models/types";
import type { PresentableError } from "@/viewmodels/errors";
import { Banner, Button, Card, GithubModeBadge, cn } from "@/components/ui";
import { formatDateTime } from "@/components/ui/format";

// mm:ss countdown until the token expires (view-local ticking clock).
function useCountdown(expiresAt: string | undefined): {
  label: string;
  expired: boolean;
} {
  const [now, setNow] = useState(() => Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    setNow(Date.now());
    timerRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [expiresAt]);

  if (!expiresAt) return { label: "—", expired: false };
  const remainingMs = new Date(expiresAt).getTime() - now;
  if (Number.isNaN(remainingMs)) return { label: "—", expired: false };
  if (remainingMs <= 0) return { label: "Expired", expired: true };
  const totalSec = Math.floor(remainingMs / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return { label: `${mm}:${ss}`, expired: false };
}

function stripScheme(url: string): string {
  return url.replace(/^https?:\/\//, "");
}

function cloneCommand(token: LabToken): string {
  return `git clone https://x-access-token:${token.token}@${stripScheme(token.cloneUrl)}`;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — non-fatal */
    }
  }

  return (
    <Button size="sm" variant="secondary" onClick={copy} className="shrink-0">
      {copied ? "Copied ✓" : label}
    </Button>
  );
}

export function LabTokenPanel({
  token,
  onRequest,
  isLoading,
  error,
}: {
  token: LabToken | null;
  onRequest: () => void;
  isLoading: boolean;
  error: PresentableError | null;
}) {
  const [revealed, setRevealed] = useState(false);
  const countdown = useCountdown(token?.expiresAt);

  const maskedToken = token ? "•".repeat(Math.min(token.token.length, 28)) : "";
  const shownToken = token ? (revealed ? token.token : maskedToken) : "";

  /*
    The clone URL contains the hosting organization, so it is NEVER rendered —
    not even behind the Reveal toggle, which only uncovers the token.
    `cloneCommand(token)` still puts the real, working command on the clipboard,
    so a lab PC can clone and push exactly as before; the student just never
    reads where their code lives. Function preserved, organization hidden.
  */
  const HIDDEN_HOST = "••••••••••/••••••••.git";
  const displaySnippet = token
    ? `git clone https://x-access-token:${revealed ? token.token : maskedToken}@${HIDDEN_HOST}`
    : "";

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-strong)]">
            Lab access token
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            A short-lived token scoped to <strong>only this project</strong> — run{" "}
            <code className="font-mono text-xs">git push</code> from a lab PC with no
            personal account.
          </p>
        </div>
        {token && <GithubModeBadge live={token.live} />}
      </div>

      {error && (
        <Banner tone={error.isNetworkError ? "network" : "error"} className="mt-4">
          {error.isNetworkError
            ? "Couldn't reach the backend to mint a token."
            : error.message}
        </Banner>
      )}

      {token ? (
        <div className="mt-4 space-y-4">
          {/* Token row — masked by default */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Installation token
              </p>
              <button
                type="button"
                onClick={() => setRevealed((v) => !v)}
                aria-pressed={revealed}
                className="text-xs font-medium text-platform hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform"
              >
                {revealed ? "Hide" : "Reveal"}
              </button>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-slate-900 p-2.5">
              <code className="scroll-thin flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-emerald-300">
                {shownToken}
              </code>
              <CopyButton value={token.token} label="Copy token" />
            </div>
          </div>

          {/* Meta: expiry countdown + scope */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true">⏳</span> Expires in{" "}
              <span
                className={cn(
                  "font-mono font-semibold tabular-nums",
                  countdown.expired ? "text-danger" : "text-[var(--text-strong)]",
                )}
              >
                {countdown.label}
              </span>
              <span>({formatDateTime(token.expiresAt)})</span>
            </span>
            {/* Was the repository URL. The scope guarantee is what matters,
                not the address it points at. */}
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true">🎯</span> Scoped to{" "}
              <span className="font-medium text-[var(--text-strong)]">
                this project only
              </span>
            </span>
          </div>

          {/* Git clone / push snippet */}
          {token.cloneUrl && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Clone / push from a lab PC
              </p>
              <div className="rounded-lg border border-[var(--border-subtle)] bg-slate-900 p-3">
                <div className="flex items-start justify-between gap-2">
                  <pre className="scroll-thin flex-1 overflow-x-auto font-mono text-xs leading-relaxed text-slate-200">
                    <span className="text-slate-500"># clone a fresh copy</span>
                    {"\n"}
                    {displaySnippet}
                    {"\n"}
                    <span className="text-slate-500">
                      # or point an existing checkout at it:
                    </span>
                    {"\n"}
                    {`git remote set-url origin ${displaySnippet.replace("git clone ", "")}`}
                  </pre>
                  <CopyButton value={cloneCommand(token)} label="Copy command" />
                </div>
              </div>
              <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                The token is embedded in the URL, short-lived, and only works for this repo.
                Regenerate it if it expires.
              </p>
            </div>
          )}

          <Button variant="ghost" size="sm" onClick={onRequest} loading={isLoading}>
            Regenerate token
          </Button>
        </div>
      ) : (
        <Button className="mt-4" onClick={onRequest} loading={isLoading}>
          <span aria-hidden="true">🔑</span> Get lab token
        </Button>
      )}
    </Card>
  );
}
