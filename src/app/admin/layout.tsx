// VIEW LAYER — IT Admin area shell.
import { AppShell, type NavItem } from "@/components/layout/AppShell";

// Logout is rendered by AppShell as the sidebar's footer action.
const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/courses", label: "Manage School Courses", icon: "📚" },
  { href: "/admin/incidents", label: "Incident Management", icon: "🚨" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell role="ADMIN" nav={NAV}>
      {children}
    </AppShell>
  );
}
