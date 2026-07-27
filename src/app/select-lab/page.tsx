"use client";
// ============================================================================
// VIEW LAYER — Laboratory picker (ADDENDUM K, multi-lab)
// After a teacher/admin signs in with GitHub, if they can work in more than one
// laboratory (organization) they land here to choose which one. The choice is
// stored in the server session; every org-scoped read then filters to that lab.
// A teacher only sees a lab where an IT Admin assigned her a course.
// ============================================================================
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/viewmodels/useSession";
import { destinationFor } from "@/viewmodels/authRoutes";
import { isStaffRole } from "@/models/types";
import { Button, Card, EmptyState, Spinner, cn } from "@/components/ui";
import { Brand } from "@/components/layout/Brand";



export default function SelectLabPage() {
  const { user, isReady, labs, selectedOrgId, labsReady, selectLab, logout } =
    useSession();
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isStaff = user ? isStaffRole(user.role) : false;

  // Route away when this page has nothing to do: not signed in, not staff, or a
  // lab is already active (nothing left to pick).
  useEffect(() => {
    if (!isReady || !labsReady) return;
    if (!user || !isStaff) {
      router.replace("/");
      return;
    }
    if (selectedOrgId) router.replace(destinationFor(user.role));
  }, [isReady, labsReady, user, isStaff, selectedOrgId, router]);

  async function choose(orgId: string) {
    if (!user) return;
    setPending(orgId);
    setError(null);
    try {
      await selectLab(orgId);
      router.replace(destinationFor(user.role));
    } catch {
      setError("Could not open that lab. Please try again.");
      setPending(null);
    }
  }

  if (!isReady || !labsReady || !user || !isStaff) {
    return (
      <div className="grid min-h-dvh place-items-center text-platform">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="flex h-16 items-center justify-between border-b border-[var(--border-subtle)] bg-white px-6">
        <Brand />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            logout();
            router.replace("/");
          }}
        >
          <span aria-hidden="true">↩</span> Sign out
        </Button>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <div className="animate-fade-up">
          <h1 className="text-2xl font-semibold text-[var(--text-strong)]">
            Choose a laboratory
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Welcome, {user.fullName}. You have access to more than one
            laboratory. Pick the one you want to work in — you can switch any
            time from the top bar.
          </p>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200">
            {error}
          </p>
        )}

        {labs.length === 0 ? (
          <EmptyState
            className="mt-8"
            icon="🔬"
            title="No laboratories assigned yet"
            description="An IT Admin hasn't assigned you a course in any lab. Once they do, that lab appears here."
          />
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {labs.map((lab, idx) => {
              const isPending = pending === lab.id;
              return (
                <Card
                  key={lab.id}
                  className={cn(
                    "flex flex-col p-5 animate-fade-up transition-shadow hover:shadow-md",
                    pending && !isPending && "opacity-60",
                  )}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className="text-2xl">
                      🔬
                    </span>
                    <h2 className="text-lg font-semibold text-[var(--text-strong)]">
                      {lab.name}
                    </h2>
                  </div>
                  {/* The lab's underlying organization handle is not shown —
                      staff pick a laboratory by its human name. */}
                  <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                    Laboratory workspace
                  </p>
                  <Button
                    className="mt-4 w-full"
                    onClick={() => void choose(lab.id)}
                    disabled={Boolean(pending)}
                  >
                    {isPending ? "Opening…" : "Enter lab"}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
