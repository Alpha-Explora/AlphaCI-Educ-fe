"use client";
// ============================================================================
// VIEW LAYER — password input with a reveal toggle
//
// Extracted so sign-in and account creation cannot drift: this began as a
// Show/Hide toggle living only in CredentialsForm, and the moment a second form
// needed one the two were going to diverge in wording, placement and a11y.
//
// WHY A TOGGLE AT ALL — the reasoning from the original, preserved because it is
// still the justification: on a shared lab PC, typo-driven lockouts are the most
// common sign-in failure, and being able to check what you typed prevents most
// of them.
//
// WHY AN ICON RATHER THAN THE WORDS "Show"/"Hide" — the eye is the convention
// users already expect, and it does not change width when toggled, so the field
// does not reflow under the cursor mid-interaction. The words are kept for
// screen readers via aria-label; the icon alone is never the only signal.
// ============================================================================
import { useId, useState } from "react";
import { Input } from "@/components/ui";
import { cn } from "@/components/ui/cn";

export function PasswordField({
  id,
  label,
  value,
  onChange,
  onBlur,
  disabled,
  autoComplete,
  placeholder,
  error,
  hint,
  labelAction,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  /** "current-password" when signing in, "new-password" when registering. */
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
  error?: string | null;
  hint?: string;
  /** Rendered opposite the label — "Forgot password?" on the sign-in form. */
  labelAction?: React.ReactNode;
}) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={fieldId}
          className="block text-sm font-medium text-[var(--text-strong)]"
        >
          {label}
        </label>
        {labelAction}
      </div>

      <div className="relative">
        <Input
          id={fieldId}
          type={revealed ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          // Room for the button, so a long password never runs underneath it.
          className={cn("pr-11", error && "border-danger")}
        />
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          // aria-pressed carries the state; aria-label carries the action. An
          // icon-only control with neither is unusable on a screen reader.
          aria-pressed={revealed}
          aria-controls={fieldId}
          aria-label={revealed ? "Hide password" : "Show password"}
          title={revealed ? "Hide password" : "Show password"}
          // Not in the tab order: the natural path is password → submit, and a
          // stop here makes every keyboard sign-in one press longer for a
          // control that is only wanted when something has already gone wrong.
          // Still reachable, and still announced, when a screen reader walks the
          // form.
          tabIndex={-1}
          className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-3 text-[var(--text-muted)] transition-colors hover:text-platform-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-platform"
        >
          <EyeIcon crossed={revealed} />
        </button>
      </div>

      {error ? (
        <p id={`${fieldId}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>
      )}
    </div>
  );
}

/**
 * `crossed` shows the struck-through eye while the password is VISIBLE — the
 * icon depicts the action the button performs ("hide this"), which is the
 * convention every password field uses. Showing an open eye while the text is
 * already open reads as a status light and confuses people.
 */
function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      // Decorative: the button's aria-label already names the action, so
      // announcing the graphic as well would duplicate it.
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <line x1="3" y1="21" x2="21" y2="3" />}
    </svg>
  );
}
