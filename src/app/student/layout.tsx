// VIEW LAYER — Student area shell.
import { AppShell, type NavItem } from "@/components/layout/AppShell";

// Logout is rendered by AppShell as the sidebar's footer action.
const NAV: NavItem[] = [
  { href: "/student", label: "Courses" },
  { href: "/student/reports", label: "Report" },
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
