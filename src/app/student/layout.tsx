// VIEW LAYER — Student area shell.
import { AppShell, type NavItem } from "@/components/layout/AppShell";

// Logout is rendered by AppShell as the sidebar's footer action.
const NAV: NavItem[] = [
  { href: "/student", label: "Courses" },
  { href: "/student/reports", label: "Report" },
  // Before Settings, not after: a student meeting CI/CD for the first time needs
  // this in the main flow, not filed under configuration they will never open.
  { href: "/student/how-it-works", label: "How it works" },
  { href: "/student/settings", label: "Settings" },
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
