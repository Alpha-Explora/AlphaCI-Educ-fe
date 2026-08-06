// VIEW LAYER — Teacher area shell.
import { AppShell, type NavItem } from "@/components/layout/AppShell";

// Logout is rendered by AppShell in the one top header, not down here.
// Icons are required: the rail collapses to 56px, where the glyph is the only
// thing on screen. (This reverses the old text-only call, which assumed a
// permanently open 260px panel where the labels were always readable.)
const NAV: NavItem[] = [
  { href: "/teacher", label: "Home", icon: "home" },
  { href: "/teacher/courses", label: "Courses", icon: "book" },
  // NO Schedule entry, and no /teacher/schedule route either — the whole page is
  // gone. Its week grid lives on Home now as a toggle beside the upcoming list
  // (both read the same ViewModel, so it was a second copy of a picture Home
  // could already draw), and its Sections table was a cross-section index of
  // controls that each section already owns: ClassAccessPanel on
  // /teacher/classes/[id] carries the same outside-hours switch AND the join
  // code. Deleting it removed a convenience, not a capability — which is the
  // test a route has to pass before it goes.
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
