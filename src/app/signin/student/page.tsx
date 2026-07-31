// VIEW LAYER — alias for the student door, which lives at /signin itself.
//
// Not legacy cruft: printed lab handouts and school intranet pages say
// "/signin/student" because it is the obvious counterpart to "/signin/staff",
// and someone who knows the staff URL will guess this one. Redirecting costs a
// file and saves a 404 for a URL people will keep typing.
import { redirect } from "next/navigation";
import { STUDENT_SIGN_IN_ROUTE } from "@/viewmodels/authRoutes";

export default function StudentSignInAlias() {
  redirect(STUDENT_SIGN_IN_ROUTE);
}
