"use client";
// ============================================================================
// VIEWMODEL LAYER — Forgot password
//
// Asks the API to send a Supabase Auth reset email.
//
// Note the success state: it is reached even when the address is unknown. The
// backend deliberately answers identically either way, because a distinguishable
// response would let anyone probe a school roster one address at a time. The
// copy the View shows ("if that address is on file…") is what makes that
// honest rather than misleading.
// ============================================================================
import { useCallback, useState } from "react";
import { authApi, ApiError } from "@/models/api";
import { brand } from "@/config/brand";

export interface ForgotPasswordVM {
  email: string;
  setEmail: (value: string) => void;
  /** true once the request has been accepted — the View swaps to a confirmation. */
  isSent: boolean;
  error: string | null;
  isSubmitting: boolean;
  submit: (event: React.FormEvent<HTMLFormElement>) => void;
}

export function useForgotPassword(): ForgotPasswordVM {
  const [email, setEmail] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);

      const trimmed = email.trim();
      if (!trimmed) {
        setError("Enter the email address you sign in with.");
        return;
      }

      setIsSubmitting(true);
      void (async () => {
        try {
          await authApi.requestPasswordReset(trimmed);
          setIsSent(true);
        } catch (err) {
          setError(
            err instanceof ApiError && err.isNetworkError
              ? `We can't reach the ${brand.name} server at ${err.baseUrl}. Try again in a moment.`
              : "We couldn't send the reset email. Please try again, or ask your teacher for help.",
          );
        } finally {
          setIsSubmitting(false);
        }
      })();
    },
    [email],
  );

  return { email, setEmail, isSent, error, isSubmitting, submit };
}
