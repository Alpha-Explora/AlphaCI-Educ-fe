"use client";
// ============================================================================
// VIEWMODEL LAYER — Student account creation
//
// Registers credentials with Supabase Auth through the API. The AlphaCI profile
// is NOT created here — it appears on the first confirmed sign-in, which is why
// the success copy sends the student to their inbox rather than to the app.
//
// Unlike useForgotPassword, the server's refusals are shown VERBATIM. That is
// deliberate: "use your school email (@alphaexplora.com)" and "that address
// already has an account" are the two things a stuck student needs to read, and
// replacing them with a generic message would leave them with no way forward.
// ============================================================================
import { useCallback, useState } from "react";
import { authApi, ApiError } from "@/models/api";
import { brand } from "@/config/brand";

export interface StudentSignupVM {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  /** True once credentials exist — the View swaps to a confirmation. */
  isCreated: boolean;
  /** False when the project has email confirmation off; changes the copy. */
  needsEmailConfirmation: boolean;
  error: string | null;
  isSubmitting: boolean;
  submit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function useStudentSignup(): StudentSignupVM {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isCreated, setIsCreated] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);

      const trimmed = email.trim();
      if (!trimmed) {
        setError("Enter your school email address.");
        return;
      }
      // Checked here only to save a round trip on an obviously-short password.
      // The authority is Supabase's own policy, whose message is shown as-is
      // when it disagrees — duplicating the rule would be two places to change.
      if (password.length < 8) {
        setError("Choose a password of at least 8 characters.");
        return;
      }

      setIsSubmitting(true);
      void (async () => {
        try {
          const result = await authApi.studentSignup({ email: trimmed, password });
          setNeedsEmailConfirmation(result.needsEmailConfirmation);
          setIsCreated(true);
        } catch (err) {
          if (err instanceof ApiError && err.isNetworkError) {
            setError(
              `We can't reach the ${brand.name} server at ${err.baseUrl}. Try again in a moment.`,
            );
            return;
          }
          // The server's own words. Every refusal it produces is written for a
          // student to act on, so passing them through beats a generic fallback.
          setError(
            err instanceof ApiError && err.message
              ? err.message
              : "We couldn't create your account. Please try again, or ask your teacher for help.",
          );
        } finally {
          setIsSubmitting(false);
        }
      })();
    },
    [email, password],
  );

  return {
    email,
    setEmail,
    password,
    setPassword,
    isCreated,
    needsEmailConfirmation,
    error,
    isSubmitting,
    submit,
  };
}
