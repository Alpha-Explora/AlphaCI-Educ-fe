// VIEW LAYER — Teacher area shell.
import { AppShell, type NavItem } from "@/components/layout/AppShell";

// Logout is rendered by AppShell in the one top header, not down here.
// Icons are required: the rail collapses to 56px, where the glyph is the only
// thing on screen. (This reverses the old text-only call, which assumed a
// permanently open 260px panel where the labels were always readable.)
const NAV: NavItem[] = [
  { href: "/teacher", label: "Home", icon: "home" },
  { href: "/teacher/courses", label: "Courses", icon: "book" },
  // Directly after Courses: a section's meeting hours are a property of the
  // teaching, and this is the only screen that shows them across every course at
  // once — including which section is running right now, which is what the Home
  // card uses to pick a class to open.
  { href: "/teacher/schedule", label: "Schedule", icon: "calendar" },
  { href: "/teacher/groups", label: "Groups", icon: "users" },
  { href: "/teacher/reports", label: "Report", icon: "chart" },
  // /teacher/rubric existed and was rendered by nobody — no nav entry, no link
  // from any page. The grading reference is the one document a teacher needs
  // before setting an assignment, so it cannot be reachable only by typing a URL.
  { href: "/teacher/rubric", label: "Grading", icon: "check" },
  // Immediately after Grading, because the two are halves of one answer: the
  // rubric says what a stage is worth, this says which command produced the
  // result. A teacher explaining a mark to a student needs both, and needs to
  // get from one to the other without going through Home.
  { href: "/teacher/languages", label: "Languages", icon: "layers" },
  { href: "/teacher/settings", label: "Settings", icon: "gear" },
];

export default function TeacherLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <AppShell role="TEACHER" nav={NAV}>
      {children}
    </AppShell>
  );
}
