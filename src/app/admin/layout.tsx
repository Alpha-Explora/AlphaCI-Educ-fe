// VIEW LAYER — IT Admin area shell.
import { AppShell, type NavItem } from "@/components/layout/AppShell";

// Logout is rendered by AppShell in the one top header.
// Icons are required now. The old note here said the labels were long enough to
// scan on their own — true of a 260px panel, and exactly why THIS area needed
// glyphs most once the rail collapsed: six "Manage …" labels all clip to the
// same first word, so the icon is what tells them apart at 56px.
const NAV: NavItem[] = [
  { href: "/admin", label: "Home", icon: "home" },
  { href: "/admin/teachers", label: "Manage Teachers", icon: "users" },
  { href: "/admin/students", label: "Manage Students", icon: "cap" },
  { href: "/admin/courses", label: "Manage School Courses", icon: "book" },
  { href: "/admin/incidents", label: "Incident Management", icon: "alert" },
  { href: "/admin/lab-setup", label: "Set up Lab PCs", icon: "desktop" },
  { href: "/admin/settings", label: "Settings", icon: "gear" },
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
