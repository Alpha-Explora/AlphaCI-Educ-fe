"use client";
// ============================================================================
// VIEWMODEL LAYER — Sign-in form
//
// Owns everything about the act of signing in: field state, validation, the
// submit call, failure copy, and where to go on success.
//
// TAKES AN AUDIENCE. Two pages render this hook — /signin for students,
// /signin/staff for teachers and IT admins — and the only functional difference
// between them is the `audience` passed in here. Everything else that differs
// (labels, placeholder, whether "create an account" appears) is copy the View
// supplies.
//
// The Views that use this hold NO logic: they render fields, spread the
// returned handlers, and display `fieldErrors` / `formError`.
// ============================================================================
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/models/api";
import type { SignInAudience } from "@/models/types";
import { useSession } from "./useSession";
import { postLoginDestination, routeForAudience } from "./authRoutes";
import { brand } from "@/config/brand";

export interface SignInFieldErrors {
  email?: string;
  password?: string;
}

export interface SignInVM {
  email: string;
  password: string;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  /** Per-field messages, shown only after a field has been blurred or submitted. */
  fieldErrors: SignInFieldErrors;
  markTouched: (field: "email" | "password") => void;
  /** Whole-form failure (bad credentials, backend down, wrong door). */
  formError: string | null;
  /** Network-level failure gets a distinct banner: it isn't the user's fault. */
  isOffline: boolean;
  /**
   * Set when the API says these are real credentials for the OTHER door.
   *
   * Distinct from `formError` (which is also set, and carries the sentence)
   * because this one has a fix the UI can offer as a link rather than as
   * instructions: it holds the route of the door that WILL accept them. Null in
   * every other failure, including a wrong password — we learn nothing about
   * which door that account belongs to, and guessing would leak roster
   * membership to anyone typing addresses at the form.
   */
  wrongDoorRoute: string | null;
  isSubmitting: boolean;
  submit: (event: React.FormEvent<HTMLFormElement>) => void;
}

/**
 * The API's machine-readable "right credentials, wrong page" code.
 *
 * Mirrors AuthService.assertAudienceMatches. If you rename it there, this stops
 * matching and the UI degrades to showing the server's sentence with no link —
 * which is the correct way for it to fail, but do rename both.
 */
const WRONG_DOOR_CODE = "WRONG_SIGN_IN_DOOR";

// A pragmatic address check. Deliberately NOT an RFC-5322 regex: the only job
// here is to catch a typo before a round-trip, and over-strict client patterns
// famously reject valid institutional addresses. The server is the authority.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Turns an API failure into copy a student or teacher can act on.
 *
 * The 401 case is intentionally vague about WHICH half was wrong. Saying "no
 * account with that email" would let anyone test a school roster address by
 * address; a single message for both cases keeps the endpoint from becoming an
 * account-enumeration oracle. Every other case is as specific as we can be,
 * because those aren't secrets.
 */
function describeSignInFailure(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Something went wrong signing you in. Please try again.";
  }
  if (error.isNetworkError) {
    return `We can't reach the ${brand.name} server at ${error.baseUrl}. Check your connection, or ask IT if the lab server is running.`;
  }
  switch (error.status) {
    case 400:
      return "Please enter both your email and your password.";
    case 401:
      return "That email and password don't match. Check for caps lock, then try again.";
    case 403:
      // Three situations share this status: wrong sign-in page, a deactivated
      // account, and a Supabase login with no linked profile. Every one of them
      // arrives with a message that already names its own fix, so it is
      // surfaced verbatim rather than flattened into house copy. The wrong-page
      // case ALSO gets a link — see wrongDoorRoute — but the sentence stands on
      // its own if that link never renders.
      return error.message;
    case 429:
      return "Too many attempts. Please wait a minute before trying again.";
    default:
      return "We couldn't sign you in. Please try again, or ask your teacher or IT staff for help.";
  }
}

/**
 * @param audience Which door this form is. Sent with the credentials so the API
 *   can refuse a staff account typed into the student page (and vice versa)
 *   instead of admitting it and landing the person on an empty dashboard.
 */
export function useSignIn(audience: SignInAudience): SignInVM {
  const router = useRouter();
  const { loginWithPassword } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [wrongDoorRoute, setWrongDoorRoute] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation runs continuously, but visibility is gated on interaction —
  // showing "email is required" on an untouched empty form is hostile.
  const allErrors = useMemo<SignInFieldErrors>(() => {
    const errors: SignInFieldErrors = {};
    const trimmed = email.trim();
    if (!trimmed) errors.email = "Enter your school email address.";
    else if (!EMAIL_SHAPE.test(trimmed)) errors.email = "That doesn't look like an email address.";
    if (!password) errors.password = "Enter your password.";
    return errors;
  }, [email, password]);

  /**
   * When a message is allowed to appear.
   *
   * Blur alone is not enough, and that was the bug: the email field is
   * autoFocused, so simply arriving and then clicking anywhere — the password
   * box, the page, another window — blurred an empty field and painted the form
   * red before the visitor had typed a character. The screen greeted people by
   * telling them they had done something wrong on the way in.
   *
   * So the rule is split by what the message is FOR:
   *   - "Enter your…"  is a REQUIRED message. It only makes sense once someone
   *     has actually tried to sign in, so it waits for a submit.
   *   - "That doesn't look like an email address" is a FORMAT message about
   *     something they typed, so it shows on blur — that is the moment it is
   *     useful, and it cannot fire on an empty field.
   */
  const fieldErrors = useMemo<SignInFieldErrors>(() => {
    const visible: SignInFieldErrors = {};
    if (submitAttempted) return allErrors;
    // Non-empty ⇒ any remaining error is about the SHAPE of what was entered.
    if (touched.email && email.trim()) visible.email = allErrors.email;
    if (touched.password && password) visible.password = allErrors.password;
    return visible;
  }, [allErrors, submitAttempted, touched, email, password]);

  const markTouched = useCallback((field: "email" | "password") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const submit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSubmitAttempted(true);
      setFormError(null);
      setIsOffline(false);
      setWrongDoorRoute(null);

      if (Object.keys(allErrors).length > 0) return;

      setIsSubmitting(true);
      void (async () => {
        try {
          const { user } = await loginWithPassword({
            email: email.trim(),
            password,
            audience,
          });
          // Clear the password from memory before navigating away.
          setPassword("");
          router.replace(postLoginDestination(user.role, user.githubLogin));
        } catch (error) {
          setFormError(describeSignInFailure(error));
          setIsOffline(error instanceof ApiError && error.isNetworkError);
          // The other door is whichever one this is not — the API has just
          // confirmed the account exists and belongs there.
          //
          // The password is deliberately NOT carried across, and neither is the
          // email. These run on shared lab machines: a URL holding a school
          // address lands in browser history that the next person at the
          // keyboard can read, and saving one person one retype is not worth
          // that. They arrive at the correct door with empty fields.
          const isWrongDoor =
            error instanceof ApiError && error.code === WRONG_DOOR_CODE;
          const otherDoor = routeForAudience(
            audience === "STUDENT" ? "STAFF" : "STUDENT",
          );
          setWrongDoorRoute(isWrongDoor ? otherDoor : null);
          setIsSubmitting(false);
        }
        // No `finally`: on success we keep isSubmitting true so the button stays
        // disabled through the redirect instead of flicking back to "Sign in".
      })();
    },
    [allErrors, audience, email, loginWithPassword, password, router],
  );

  return {
    email,
    password,
    setEmail,
    setPassword,
    fieldErrors,
    markTouched,
    formError,
    isOffline,
    wrongDoorRoute,
    isSubmitting,
    submit,
  };
}
