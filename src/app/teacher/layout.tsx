// VIEW LAYER — Teacher area shell.
import { AppShell, type NavItem } from "@/components/layout/AppShell";

// Logout is rendered by AppShell as the sidebar's footer action.
// No icons: the labels carry the meaning on their own, and the glyphs read as
// decoration beside them (same call as the IT-Admin shell).
const NAV: NavItem[] = [
  { href: "/teacher", label: "Home" },
  { href: "/teacher/courses", label: "Courses" },
  { href: "/teacher/groups", label: "Groups" },
  { href: "/teacher/reports", label: "Report" },
  // /teacher/rubric existed and was rendered by nobody — no nav entry, no link
  // from any page. The grading reference is the one document a teacher needs
  // before setting an assignment, so it cannot be reachable only by typing a URL.
  { href: "/teacher/rubric", label: "Grading" },
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
