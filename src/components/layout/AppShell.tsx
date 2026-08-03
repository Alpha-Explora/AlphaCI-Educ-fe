"use client";
// ============================================================================
// VIEW LAYER — AppShell
// One full-width header + a hover-expanding left rail, for the four role areas.
// Guards the session: if there is no user (or the user's role doesn't match
// this area) it routes back to the landing role switcher. Presentational only —
// all state comes from the useSession ViewModel.
//
// LAYOUT, and why it changed
// --------------------------
// This used to be `lg:grid lg:grid-cols-[260px_1fr]`, with the sidebar owning
// its own 64px brand block in column one and the top bar living in column two.
// Two bordered boxes at the same height on the same row read as TWO headers,
// not as one piece of chrome — the vertical border between them is the tell.
//
// Now the shell is a column: a single header spanning the full width, and
// beneath it a row of rail + main. The brand moved into that one header, so
// there is exactly one bar across the top of every page.
//
// THE RAIL
// --------
// Collapsed to 56px by default and expanded on hover/focus. Two pieces make
// that work without the page moving underneath it:
//
//   1. a SPACER div in normal flow, permanently at the collapsed width, and
//   2. the real <aside>, `fixed` on top of the spacer.
//
// The aside grows to 256px, the spacer never does, so expansion paints OVER the
// content instead of reflowing it. Reflow was the alternative and it is worse
// here: these pages are tables and dashboards, and re-laying one out on every
// incidental mouse pass across the left edge is motion nobody asked for.
//
// `focus-within` mirrors the hover so keyboard users get the same panel — the
// labels are in the DOM either way (opacity, not `hidden`), so a screen reader
// reads the nav normally whatever the visual state.
// ============================================================================
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/viewmodels/useSession";
import { canEnterArea } from "@/viewmodels/authRoutes";
import { isStaffRole, type UserRole } from "@/models/types";
import { Avatar, Button, Spinner, cn } from "@/components/ui";
import { GithubModeNote } from "@/components/domain/GithubModeNote";
import { Brand, BrandMark } from "./Brand";
import { NavIcon, type NavIconName } from "./NavIcon";

// `icon` is required now. It used to be deliberately absent — the sidebar was
// text-only because the labels carried the meaning and a glyph beside them was
// decoration. A COLLAPSED rail inverts that: at 56px the glyph is the only
// thing on screen, so every area has to name one rather than opt in.
export interface NavItem {
  href: string;
  label: string;
  icon: NavIconName;
}

const ROLE_LABEL: Record<UserRole, string> = {
  TEACHER: "Teacher",
  STUDENT: "Student",
  ADMIN: "IT Admin",
  SUPER_ADMIN: "Platform operator",
};

// NOTE — the rail's widths (w-14 collapsed, hover:w-64 expanded) are written as
// literal classes at the point of use and NOT lifted into constants here.
// Tailwind scans this file as text and never evaluates it, so a class assembled
// as `hover:${RAIL_W_OPEN}` compiles to nothing: the string reaches the DOM and
// no rule backs it. Any width change has to be made in the markup below.

export function AppShell({
  role,
  nav,
  children,
}: {
  readonly role: UserRole;
  readonly nav: NavItem[];
  readonly children: ReactNode;
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
  } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Set when a nav item is clicked, cleared when the pointer leaves the rail.
  //
  // Clicking a link navigates but does NOT move the mouse, so the rail stays
  // hovered — and an expanded rail is 256px of panel sitting on top of the page
  // you just asked for. Suppressing hover until the pointer leaves means the
  // click reads as "take me there", not "take me there and stay in the way".
  //
  // It gates ONLY the hover classes. Keyboard focus keeps the rail open through
  // its own :has(:focus-visible) rule, so a Tab user who presses Enter still has
  // a readable nav afterwards.
  const [hoverSuppressed, setHoverSuppressed] = useState(false);

  const isStaff = isStaffRole(role);
  // A platform operator is admitted to the IT-Admin area too (see canEnterArea).
  const mayEnter = user ? canEnterArea(user.role, role) : false;

  // Session guard: redirect when unauthenticated or the role may not be here.
  //
  // There is no longer a third case. A staff user with several labs used to be
  // bounced to /select-lab from here; the backend now makes one active at
  // sign-in and the switcher in this very header changes it, so arriving with
  // no lab chosen is no longer a state that can happen.
  useEffect(() => {
    if (!isReady) return;
    if (!user || !mayEnter) router.replace("/");
  }, [isReady, user, mayEnter, router]);

  // Hold the chrome until we know the session AND (for staff) the lab picture,
  // so the dashboard never flashes unscoped data before a lab is resolved.
  const waitingOnLabs = isStaff && !labsReady;
  if (!isReady || !user || !mayEnter || waitingOnLabs) {
    return (
      <div className="grid min-h-dvh place-items-center text-platform">
        <Spinner size="lg" />
      </div>
    );
  }

  const activeLab = labs.find((l) => l.id === selectedOrgId) ?? null;
  const home = `/${role.toLowerCase()}`;
  const isActive = (href: string) =>
    pathname === href || (href !== home && pathname.startsWith(href));

  // Every label in the rail: invisible while collapsed, revealed with it. The
  // text stays in the DOM (opacity, not `hidden`) so screen readers read the
  // nav normally whatever the visual state, and so expanding reveals the labels
  // instead of re-flowing the rail's contents.
  const revealWithRail = cn(
    "opacity-0 transition-opacity duration-150",
    "group-has-[:focus-visible]/rail:opacity-100",
    !hoverSuppressed && "group-hover/rail:opacity-100",
  );

  function signOut() {
    logout();
    router.replace("/");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* ================= THE ONE HEADER =================
          Full width, above both the rail and the content. Everything that used
          to be split between the sidebar's brand box and the top bar is here. */}
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-[var(--border-subtle)] bg-white/85 px-4 backdrop-blur-sm sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href={home} className="shrink-0 rounded-md" aria-label={`${ROLE_LABEL[role]} home`}>
            {/* Mark-only below lg: the rail is gone there and the mobile nav row
                beneath already spells out where you are. */}
            <span className="hidden sm:block">
              <Brand />
            </span>
            <span className="sm:hidden">
              <Brand compact />
            </span>
          </Link>

          {/* No "{Role} workspace" chip here any more, and no 🔬 beside the lab.
              Both were permanent furniture that told you something you already
              knew: the nav, the page titles and the identity block on the right
              all say which side of the product you are on, and the chip repeated
              it on every screen while pushing the lab switcher — the one control
              in this header that actually changes state — further from the brand.
              The role label survives where it is load-bearing: the home link's
              accessible name, and `Role · email` on the right. */}

          {/* ADDENDUM K — active laboratory + switcher (staff only). */}
          {isStaff && labs.length > 0 && (
            <div className="flex min-w-0 items-center">
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
          <div className="hidden text-right sm:block">
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
          {/*
            Unconditional now, and the rail has no logout of its own. It used to
            appear here only for GitHub sessions, with everyone else reaching it
            through the sidebar footer — and a sign-out you have to hover a
            hidden panel to find is not a sign-out anybody can find in a hurry
            on a shared lab PC.
          */}
          <Button variant="secondary" size="sm" onClick={signOut}>
            Logout
          </Button>
        </div>
      </header>

      {/* ================= RAIL + CONTENT ================= */}
      <div className="flex min-h-0 flex-1">
        {/* Spacer: holds the rail's collapsed footprint open in normal flow so
            the expanded panel has something to float over. */}
        <div className="hidden w-14 shrink-0 lg:block" aria-hidden="true" />

        <aside
          className={cn(
            "group/rail fixed bottom-0 left-0 top-16 z-30 hidden w-14 flex-col overflow-hidden",
            "border-r border-[var(--border-subtle)] bg-white",
            "transition-[width,box-shadow] duration-200 ease-out lg:flex",
            // :has(:focus-visible), NOT :focus-within.
            //
            // A click on a nav link FOCUSES it, and :focus-within cannot tell a
            // click from a Tab press — so every click latched the rail open,
            // overlaying the page until you clicked somewhere else to blur it.
            // :focus-visible is the browser's own answer to that distinction:
            // it is withheld after a pointer click and set on keyboard focus,
            // so the rail still opens for Tab users and no longer sticks open
            // for mouse users. This one is never suppressed.
            "has-[:focus-visible]:w-64 has-[:focus-visible]:shadow-xl",
            // Dropped for the rest of this hover, so a click doesn't leave the
            // panel parked on top of the page it just opened.
            !hoverSuppressed && "hover:w-64 hover:shadow-xl",
          )}
          // pointerleave, not mouseleave: it also fires for pen and touch, so a
          // lab tablet can't strand the rail in the suppressed state.
          onPointerLeave={() => setHoverSuppressed(false)}
        >
          {/* overflow-x-hidden is REQUIRED, not tidying. `overflow-y-auto`
              alone leaves overflow-x computed to `auto` as well (the axes
              cannot disagree once one of them scrolls), and the labels are
              opacity-0 rather than hidden — so they still lay out ~200px wide
              inside a 56px rail and raised a horizontal scrollbar along its
              foot. Clipping x is also what makes the collapse read as a reveal
              rather than as truncation. */}
          <nav
            className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-2"
            aria-label="Primary"
          >
            {nav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setHoverSuppressed(true)}
                  className={cn(
                    // h-10 + the icon box pinned at 40px means the glyph sits on
                    // the same x whether the panel is 56px or 256px wide, so
                    // expanding reveals labels instead of sliding the icons.
                    "flex h-10 items-center rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-platform-50 text-platform-700"
                      : "text-[var(--text-muted)] hover:bg-slate-50 hover:text-[var(--text-strong)]",
                  )}
                >
                  <span className="grid w-10 shrink-0 place-items-center">
                    <NavIcon name={item.icon} />
                  </span>
                  <span
                    className={cn(
                      "truncate whitespace-nowrap pr-3",
                      revealWithRail,
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Foot of the rail: the mark alone. It used to be followed by
              "{Role} workspace", the same chip that sat in the header — removing
              it there and leaving it here would just mean the label reappeared
              on hover. The mark stays because the collapsed rail is 56px of
              otherwise empty column and it closes the shape. */}
          <div className="flex h-12 shrink-0 items-center border-t border-[var(--border-subtle)] px-3">
            <BrandMark size={20} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Mobile nav — unchanged. The rail is a pointer affordance and there
              is no hover on a lab tablet, so small screens keep the scroller. */}
          <nav
            className="flex gap-1 overflow-x-auto border-b border-[var(--border-subtle)] bg-white px-3 py-2 lg:hidden"
            aria-label="Primary mobile"
          >
            {nav.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium",
                    active
                      ? "bg-platform-50 text-platform-700"
                      : "text-[var(--text-muted)]",
                  )}
                >
                  <NavIcon name={item.icon} className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/*
            FULL WIDTH. This used to be `mx-auto max-w-6xl`, which capped the
            content at 1152px and centred it — so on a 1900px monitor the sidebar
            took 260px, the content used 1152px, and roughly 450px was split into
            two empty margins the eye reads as broken layout rather than as
            deliberate whitespace.

            A reading-width cap is the right instinct for prose and the wrong one
            here: these pages are dashboards, rosters and tables, which get better
            as they get wider, and the pages that DO hold prose already cap their
            own cards (SettingsView uses sm:max-w-2xl). Padding grows with the
            viewport instead, so content never touches the chrome.
          */}
          <main
            id="main-content"
            className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 xl:px-8 2xl:px-10"
          >
            <GithubModeNote />
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
