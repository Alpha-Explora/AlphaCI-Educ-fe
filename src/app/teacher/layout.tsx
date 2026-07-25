// VIEW LAYER — Teacher area shell.
import { AppShell, type NavItem } from "@/components/layout/AppShell";

// Logout is rendered by AppShell as the sidebar's footer action.
const NAV: NavItem[] = [
  { href: "/teacher", label: "Dashboard", icon: "📊" },
  { href: "/teacher/courses", label: "Courses", icon: "📚" },
  { href: "/teacher/reports", label: "Report", icon: "📈" },
  { href: "/teacher/settings", label: "Settings", icon: "⚙️" },
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
