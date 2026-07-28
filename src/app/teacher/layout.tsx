// VIEW LAYER — Teacher area shell.
import { AppShell, type NavItem } from "@/components/layout/AppShell";

// Logout is rendered by AppShell as the sidebar's footer action.
// No icons: the labels carry the meaning on their own, and the glyphs read as
// decoration beside them (same call as the IT-Admin shell).
const NAV: NavItem[] = [
  { href: "/teacher", label: "Dashboard" },
  { href: "/teacher/courses", label: "Courses" },
  { href: "/teacher/groups", label: "Groups" },
  { href: "/teacher/reports", label: "Report" },
  { href: "/teacher/settings", label: "Settings" },
];

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell role="TEACHER" nav={NAV}>
      {children}
    </AppShell>
  );
}
