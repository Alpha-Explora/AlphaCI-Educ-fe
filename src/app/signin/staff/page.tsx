// VIEW LAYER — legacy sign-in door, now a permanent redirect to /signin.
//
// There used to be two doors: staff signed in with GitHub, students with a
// password. GitHub is no longer a login, so one form serves every role. This
// file survives only so existing bookmarks, printed lab handouts and any link
// still pointing here keep working instead of 404ing.
import { redirect } from "next/navigation";
import { SIGN_IN_ROUTE } from "@/viewmodels/authRoutes";

export default function LegacySignInRedirect() {
  redirect(SIGN_IN_ROUTE);
}
