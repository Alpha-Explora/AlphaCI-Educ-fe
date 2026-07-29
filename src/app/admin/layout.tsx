// VIEW LAYER — IT Admin area shell.
import { AppShell, type NavItem } from "@/components/layout/AppShell";

// Logout is rendered by AppShell as the sidebar's footer action.
// No icons here on purpose — the labels are long enough to be scanned on their
// own, and the glyphs read as decoration next to them.
const NAV: NavItem[] = [
  { href: "/admin", label: "Home" },
  { href: "/admin/teachers", label: "Manage Teachers" },
  { href: "/admin/students", label: "Manage Students" },
  { href: "/admin/courses", label: "Manage School Courses" },
  { href: "/admin/incidents", label: "Incident Management" },
  { href: "/admin/lab-setup", label: "Set up Lab PCs" },
  { href: "/admin/settings", label: "Settings" },
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
