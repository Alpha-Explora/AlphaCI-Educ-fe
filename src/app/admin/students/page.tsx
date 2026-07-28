"use client";
// ============================================================================
// VIEW LAYER — Admin › Manage Students (/admin/students)
//
// The student roster for the laboratory the admin is currently viewing: who
// holds an account, the email they sign in with, and whether they are online.
// Previously a section at the bottom of the /admin dashboard; it is a directory
// an admin works in rather than a number they glance at, so it now has its own
// route and nav entry.
//
// Presentation only — useStudentMonitor owns the polling cadence, the presence
// rule, and the search. StudentAccountMonitor renders the card itself and is
// shared with nothing else, but stays a component so this page reads as a page.
// ============================================================================
import { useSession } from "@/viewmodels/useSession";
import { useStudentMonitor } from "@/viewmodels/useStudentMonitor";
import { StudentAccountMonitor } from "@/components/domain/StudentAccountMonitor";

export default function AdminStudentsPage() {
  const { user, selectedOrgId } = useSession();
  // ADDENDUM K — scope to the lab the admin is currently viewing, falling back
  // to their home org. Same resolution as every other admin screen.
  const orgId = selectedOrgId ?? user?.orgId ?? null;
  const vm = useStudentMonitor(orgId);

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-semibold text-[var(--text-strong)]">
          Students
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Every student account in this laboratory, by the email address they
          sign in with. Presence refreshes automatically while this page is
          open. Students are enrolled into a class by their teacher — they are
          not added here.
        </p>
      </div>

      <StudentAccountMonitor vm={vm} showHeading={false} />
    </div>
  );
}
