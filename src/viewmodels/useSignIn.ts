"use client";
// ============================================================================
// VIEWMODEL LAYER — Sign-in form
//
// Owns everything about the act of signing in: field state, validation, the
// submit call, failure copy, and where to go on success. There is now ONE door
// for every role — the audience split went away when GitHub stopped being a
// login — so this hook no longer needs to know who is signing in.
//
// The Views that use this hold NO logic: they render fields, spread the
// returned handlers, and display `fieldErrors` / `formError`.
// ============================================================================
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/models/api";
import { useSession } from "./useSession";
import { postLoginDestination } from "./authRoutes";
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
  isSubmitting: boolean;
  submit: (event: React.FormEvent<HTMLFormElement>) => void;
}

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
      // A deactivated account, or a Supabase login with no linked profile. The
      // API's message is already specific and actionable — surface it verbatim.
      // (The old "wrong door" case is gone: there is only one door now.)
      return error.message;
    case 429:
      return "Too many attempts. Please wait a minute before trying again.";
    default:
      return "We couldn't sign you in. Please try again, or ask your teacher or IT staff for help.";
  }
}

export function useSignIn(): SignInVM {
  const router = useRouter();
  const { loginWithPassword } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
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

  const fieldErrors = useMemo<SignInFieldErrors>(() => {
    const visible: SignInFieldErrors = {};
    if (submitAttempted || touched.email) visible.email = allErrors.email;
    if (submitAttempted || touched.password) visible.password = allErrors.password;
    return visible;
  }, [allErrors, submitAttempted, touched]);

  const markTouched = useCallback((field: "email" | "password") => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const submit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSubmitAttempted(true);
      setFormError(null);
      setIsOffline(false);

      if (Object.keys(allErrors).length > 0) return;

      setIsSubmitting(true);
      void (async () => {
        try {
          const { user, needsLabSelection } = await loginWithPassword({
            email: email.trim(),
            password,
          });
          // Clear the password from memory before navigating away.
          setPassword("");
          router.replace(
            postLoginDestination(user.role, needsLabSelection, user.githubLogin),
          );
        } catch (error) {
          setFormError(describeSignInFailure(error));
          setIsOffline(error instanceof ApiError && error.isNetworkError);
          setIsSubmitting(false);
        }
        // No `finally`: on success we keep isSubmitting true so the button stays
        // disabled through the redirect instead of flicking back to "Sign in".
      })();
    },
    [allErrors, email, loginWithPassword, password, router],
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
    isSubmitting,
    submit,
  };
}
