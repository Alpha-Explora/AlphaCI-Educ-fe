// VIEW LAYER — Student area shell.
import { AppShell, type NavItem } from "@/components/layout/AppShell";
import { ClassCodeGate } from "@/components/domain/ClassCodeGate";

// Logout is rendered by AppShell in the one top header.
// Icons are required — the rail collapses to 56px, where the glyph is all there is.
const NAV: NavItem[] = [
  { href: "/student", label: "Courses", icon: "book" },
  { href: "/student/reports", label: "Report", icon: "chart" },
  // Before Settings, not after: a student meeting CI/CD for the first time needs
  // this in the main flow, not filed under configuration they will never open.
  { href: "/student/how-it-works", label: "How it works", icon: "help" },
  { href: "/student/settings", label: "Settings", icon: "gear" },
];

export default function StudentLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  /*
    The gate wraps the SHELL, not the page content — so an un-admitted student
    gets a single focused screen rather than the full nav rail wrapped around a
    locked panel. Every student route is inside this layout, so there is no page
    that renders without passing it first.

    Enforcement is the server's (ClassAccessGuard refuses every student API call
    with 403 CLASS_CODE_REQUIRED); this only decides what is on screen.
  */
  return (
    <ClassCodeGate>
      <AppShell role="STUDENT" nav={NAV}>
        {children}
      </AppShell>
    </ClassCodeGate>
  );
}
