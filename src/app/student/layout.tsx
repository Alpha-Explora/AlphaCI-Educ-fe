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
  children: React.ReactNode;
}) {
  return (
    <AppShell role="STUDENT" nav={NAV}>
      {children}
    </AppShell>
  );
}
