"use client";
// ============================================================================
// VIEW LAYER — the three fields every add-staff form collects.
//
// Shared by "Add teacher" (admin) and "Appoint IT admin" (platform operator) so
// the two rungs of the role chain cannot drift apart in wording or validation.
// Pure presentation: it receives values and setters, and owns nothing.
// ============================================================================
import { useId } from "react";
import { Input } from "@/components/ui";

export interface StaffFieldValues {
  fullName: string;
  email: string;
  githubUsername: string;
}

export interface StaffFieldErrors {
  fullName?: string;
  email?: string;
  githubUsername?: string;
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  readonly children: (props: { id: string; describedBy?: string }) => React.ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-[var(--text-strong)]">
        {label}
      </label>
      {children({ id, describedBy: error ? errorId : undefined })}
      {error ? (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>
      )}
    </div>
  );
}

export function StaffFields({
  values,
  errors,
  disabled,
  onChange,
  emailHint,
}: {
  readonly values: StaffFieldValues;
  readonly errors: StaffFieldErrors;
  readonly disabled: boolean;
  readonly onChange: (field: keyof StaffFieldValues, value: string) => void;
  readonly emailHint: string;
}) {
  return (
    <>
      <Field label="Full name" error={errors.fullName}>
        {({ id, describedBy }) => (
          <Input
            id={id}
            value={values.fullName}
            onChange={(e) => onChange("fullName", e.target.value)}
            disabled={disabled}
            placeholder="Ada Lovelace"
            autoComplete="off"
            autoFocus
            aria-invalid={errors.fullName ? true : undefined}
            aria-describedby={describedBy}
            className={errors.fullName ? "border-danger" : undefined}
          />
        )}
      </Field>

      <Field label="Email address" hint={emailHint} error={errors.email}>
        {({ id, describedBy }) => (
          <Input
            id={id}
            type="email"
            value={values.email}
            onChange={(e) => onChange("email", e.target.value)}
            disabled={disabled}
            placeholder="ada@school.edu"
            autoComplete="off"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={describedBy}
            className={errors.email ? "border-danger" : undefined}
          />
        )}
      </Field>

      {/* Required, and the hint says WHY rather than just what: this is the
          field that lets the platform send the invitation itself, and that pins
          which account may later connect to this profile. */}
      <Field
        label="GitHub username"
        hint="We invite this exact account, and only it can connect to this profile."
        error={errors.githubUsername}
      >
        {({ id, describedBy }) => (
          <Input
            id={id}
            value={values.githubUsername}
            onChange={(e) => onChange("githubUsername", e.target.value)}
            disabled={disabled}
            placeholder="ada-lovelace"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={errors.githubUsername ? true : undefined}
            aria-describedby={describedBy}
            className={errors.githubUsername ? "border-danger" : undefined}
          />
        )}
      </Field>
    </>
  );
}
