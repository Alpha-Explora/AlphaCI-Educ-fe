// VIEW LAYER — Student area shell.
import { AppShell, type NavItem } from "@/components/layout/AppShell";

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
    NO GATE HERE, and that is deliberate. A class-code screen used to wrap this
    shell and hold the whole student area shut until a code was typed — which also
    hid a student's own marks, feedback and project briefs from them, anywhere,
    at any hour.

    The code now gates DOING the work rather than seeing the product: the
    dashboard always renders, and each course card shows itself open or closed
    with the reason (see useMyClassAccess). Enforcement is the server's, in
    AccessPolicy.assertProjectActionable — nothing here grants anything.
  */
  return (
    <AppShell role="STUDENT" nav={NAV}>
      {children}
    </AppShell>
  );
}
