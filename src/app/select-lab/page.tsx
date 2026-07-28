"use client";
// ============================================================================
// VIEW LAYER — Laboratory picker (ADDENDUM K, multi-lab)
//
// After a teacher/admin signs in, if they can work in more than one laboratory
// (organization) they land here to choose which one. The choice is stored in
// the server session; every org-scoped read then filters to that lab. A
// teacher only sees a lab where an IT Admin assigned her a course.
//
// BUILT FOR THE LONG LIST, NOT THE DEMO LIST.
// The seed has two labs. A real district has dozens, and every decision below
// is about the version of this page nobody has seen yet:
//
//   · one <button> per lab (see LabCard) — not a card wrapping a button, so
//     the tab order is exactly as long as the list
//   · a filter, which appears only once the list is long enough to need one.
//     A search box above two items is furniture; above thirty it is the only
//     way in. FILTER_FROM is that line.
//   · the grid widens with the viewport (2 → 3 → 4) rather than staying at
//     two columns and running off the bottom of the screen
//   · the header is sticky, so "Sign out" is reachable from row twenty
//   · the arrival stagger is CAPPED — 50ms × 30 cards is a page that takes a
//     second and a half to finish appearing
//
// Content is anchored LEFT rather than centred: a centred column is right for
// a form you read once, wrong for a list you scan, and it wastes the width
// that lets the grid show four labs a row.
// ============================================================================
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/viewmodels/useSession";
import { destinationFor } from "@/viewmodels/authRoutes";
import { isStaffRole } from "@/models/types";
import { Button, EmptyState, Input, Spinner } from "@/components/ui";
import { Brand } from "@/components/layout/Brand";
import { LabCard } from "@/components/domain/LabCard";

/** Show the filter once the list passes this length. */
const FILTER_FROM = 7;
/** Cap the arrival stagger at this many cards' worth of delay. */
const MAX_STAGGER = 8;

export default function SelectLabPage() {
  const { user, isReady, labs, selectedOrgId, labsReady, selectLab, logout } =
    useSession();
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const isStaff = user ? isStaffRole(user.role) : false;

  // Route away when this page has nothing to do: not signed in, not staff, or
  // a lab is already active (nothing left to pick).
  useEffect(() => {
    if (!isReady || !labsReady) return;
    if (!user || !isStaff) {
      router.replace("/");
      return;
    }
    if (selectedOrgId) router.replace(destinationFor(user.role));
  }, [isReady, labsReady, user, isStaff, selectedOrgId, router]);

  // Matching is on the human name only. The underlying GitHub org handle is
  // deliberately not shown on these tiles (staff pick a lab by its name), and
  // searching a field nobody can see returns "matches" that look like bugs.
  const visibleLabs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return labs;
    return labs.filter((lab) => lab.name.toLowerCase().includes(needle));
  }, [labs, query]);

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
        <span className="sr-only">Loading your laboratories…</span>
      </div>
    );
  }

  const showFilter = labs.length >= FILTER_FROM;
  const isFiltered = query.trim().length > 0;

  return (
    <div className="min-h-dvh bg-[var(--bg-canvas)]">
      {/* Sticky: with a long list, the only way out of this page must not
          scroll off the top of it. */}
      <header className="sticky top-0 z-20 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 backdrop-blur">
        <div className="flex h-20 items-center justify-between gap-4 px-6 lg:px-10">
          <Brand size={42} />
          <div className="flex items-center gap-4">
            {/* The name is here as well as in the greeting because on a long
                page the greeting is scrolled away, and "which account am I?"
                is the question you ask right before signing out. */}
            <span className="hidden text-sm text-[var(--text-muted)] sm:block">
              {user.fullName}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                logout();
                router.replace("/");
              }}
            >
              <span aria-hidden="true">↩</span> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="px-6 py-10 lg:px-10 lg:py-12">
        {/* Prose keeps a readable measure; the GRID below does not, because a
            list of tiles should use the whole screen. */}
        <div className="max-w-2xl animate-fade-up">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-[2rem]">
            Choose a laboratory
          </h1>
          <p className="mt-2.5 text-base leading-relaxed text-[var(--text-muted)]">
            Welcome, {user.fullName}. You have access to more than one
            laboratory. Pick the one you want to work in — you can switch any
            time from the top bar.
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-6 max-w-2xl rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-inset ring-red-200"
          >
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
          <>
            {/* Toolbar: how many, and how to narrow them. */}
            <div className="mt-9 flex flex-wrap items-center justify-between gap-4">
              {/* aria-live so filtering announces its result to a screen
                  reader — otherwise typing silently changes the page. */}
              <p
                role="status"
                aria-live="polite"
                className="text-sm font-medium text-[var(--text-muted)]"
              >
                {isFiltered
                  ? `${visibleLabs.length} of ${labs.length} laboratories`
                  : `${labs.length} ${labs.length === 1 ? "laboratory" : "laboratories"}`}
              </p>

              {showFilter && (
                <div className="w-full sm:w-72">
                  <label htmlFor="lab-filter" className="sr-only">
                    Filter laboratories by name
                  </label>
                  <Input
                    id="lab-filter"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter by name…"
                    autoComplete="off"
                    disabled={Boolean(pending)}
                  />
                </div>
              )}
            </div>

            {visibleLabs.length === 0 ? (
              <EmptyState
                className="mt-6"
                icon="🔍"
                title={`No laboratory matches “${query.trim()}”`}
                description="Check the spelling, or clear the filter to see them all."
                action={
                  <Button variant="secondary" size="sm" onClick={() => setQuery("")}>
                    Clear filter
                  </Button>
                }
              />
            ) : (
              <ul
                // auto-fill, not fixed breakpoint columns. With `sm:2 lg:3` a
                // school with two labs got two 466px tiles full of dead space,
                // and a district with twenty-four got eight rows of scrolling.
                // auto-fill sizes the TRACKS instead: a tile is the same width
                // whether you have two or forty, and a row simply holds as
                // many as fit. The empty trailing tracks are what stop two
                // tiles from stretching across the screen.
                //
                // The 20rem floor is measured, not chosen: at 17rem a tile is
                // 274px and "Computer Laboratory 12" truncates to "Computer
                // Labor…", which defeats the one job the tile has. 20rem fits
                // the longest realistic lab name beside the monogram and the
                // chevron. Shrink it and check the longest name you ship with.
                className="mt-6 grid gap-4 grid-cols-[repeat(auto-fill,minmax(20rem,1fr))]"
              >
                {visibleLabs.map((lab, idx) => (
                  <li key={lab.id}>
                    <LabCard
                      lab={lab}
                      isOpening={pending === lab.id}
                      disabled={Boolean(pending)}
                      onSelect={() => void choose(lab.id)}
                      style={{
                        animationDelay: `${Math.min(idx, MAX_STAGGER) * 40}ms`,
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}
