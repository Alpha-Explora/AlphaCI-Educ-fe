"use client";
// ============================================================================
// VIEWMODEL LAYER — Platform operator appoints an IT admin
//
// The top rung of the role chain: we appoint a school's IT admins, and they in
// turn appoint that school's teachers. Same three fields as the teacher form,
// but a different endpoint and a different GitHub team, so it gets its own hook
// rather than a `role` flag threaded through useTeacherDirectory — the two are
// used on different surfaces by different roles and will diverge.
//
// The View renders a dialog and holds only whether it is open.
// ============================================================================
import { useCallback, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { organizationsApi, ApiError } from "@/models/api";
import type { AddTeacherResponse } from "@/models/types";
import { queryKeys } from "./queryKeys";

export interface AddAdminOutcome {
  tone: "success" | "warning";
  title: string;
  detail: string;
}

export interface AddLabAdminVM {
  /** Which laboratory the new admin is being appointed to. */
  orgId: string | null;
  setOrgId: (value: string | null) => void;

  fullName: string;
  email: string;
  githubUsername: string;
  setFullName: (value: string) => void;
  setEmail: (value: string) => void;
  setGithubUsername: (value: string) => void;

  fieldErrors: { fullName?: string; email?: string; githubUsername?: string };
  formError: string | null;
  isSubmitting: boolean;
  outcome: AddAdminOutcome | null;
  submit: (event: React.FormEvent<HTMLFormElement>) => void;
  reset: () => void;
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GITHUB_HANDLE_SHAPE = /^[a-zA-Z\d](?:[a-zA-Z\d]|-(?=[a-zA-Z\d])){0,38}$/;

/**
 * Says what actually happened, distinguishing "fully done" from "created, but
 * their GitHub access didn't go out" — the backend creates the profile even when
 * the invite fails, and collapsing both into a green tick would hide work the
 * operator still has to do.
 */
function describeOutcome(result: AddTeacherResponse): AddAdminOutcome {
  const name = result.teacher.fullName;
  const { accessInvite, passwordInviteSent } = result;

  if (accessInvite.sent || accessInvite.alreadyHadAccess) {
    const how = accessInvite.alreadyHadAccess
      ? "already had access to this laboratory"
      : "has been invited to this laboratory as an IT admin";
    return {
      tone: "success",
      title: `${name} was appointed`,
      detail: passwordInviteSent
        ? `They ${how}, and we've emailed them a link to set their password. They'll be asked to connect GitHub the first time they sign in.`
        : `They ${how}. They sign in with their email address, then connect GitHub once.`,
    };
  }

  return {
    tone: "warning",
    title: `${name} was created, but their access is still pending`,
    detail:
      accessInvite.warning ??
      (accessInvite.live
        ? "We couldn't send their organization invitation. Try again, or add them to the IT-Staff team by hand."
        : "Sending an invitation needs an operator signed in with a connected GitHub account. Connect GitHub, then appoint them again."),
  };
}

export function useAddLabAdmin(): AddLabAdminVM {
  const queryClient = useQueryClient();

  const [orgId, setOrgId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<AddAdminOutcome | null>(null);

  const allErrors = useMemo(() => {
    const errors: { fullName?: string; email?: string; githubUsername?: string } = {};
    if (fullName.trim().length < 2) errors.fullName = "Enter their full name.";
    const trimmedEmail = email.trim();
    if (!trimmedEmail) errors.email = "Enter their work email address.";
    else if (!EMAIL_SHAPE.test(trimmedEmail))
      errors.email = "That doesn't look like an email address.";
    // Required — same reasoning as the teacher form: it pins the identity and is
    // the only invite form the platform can send without a connected admin.
    const handle = githubUsername.trim().replace(/^@/, "");
    if (!handle) errors.githubUsername = "Enter their GitHub username.";
    else if (!GITHUB_HANDLE_SHAPE.test(handle))
      errors.githubUsername = "That doesn't look like a GitHub username.";
    return errors;
  }, [fullName, email, githubUsername]);

  const fieldErrors = submitAttempted ? allErrors : {};

  const reset = useCallback(() => {
    setFullName("");
    setEmail("");
    setGithubUsername("");
    setSubmitAttempted(false);
    setFormError(null);
    setOutcome(null);
  }, []);

  const mutation = useMutation({
    mutationFn: (payload: { fullName: string; email: string; githubUsername: string }) =>
      organizationsApi.addAdmin(orgId as string, payload),
    onSuccess: (result) => {
      setOutcome(describeOutcome(result));
      setFullName("");
      setEmail("");
      setGithubUsername("");
      setSubmitAttempted(false);
      // A new admin changes the platform console's per-lab counts and the lab's
      // own overview, so both caches are stale.
      void queryClient.invalidateQueries({ queryKey: queryKeys.platform.overview });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.adminOverview(orgId ?? "none"),
      });
    },
    onError: (err) => {
      setFormError(
        err instanceof ApiError
          ? err.message
          : "Couldn't appoint that admin. Please try again.",
      );
    },
  });

  const submit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSubmitAttempted(true);
      setFormError(null);
      setOutcome(null);
      if (!orgId) {
        setFormError("Choose which laboratory they'll administer.");
        return;
      }
      if (Object.keys(allErrors).length > 0) return;
      mutation.mutate({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        githubUsername: githubUsername.trim().replace(/^@/, ""),
      });
    },
    [allErrors, email, fullName, githubUsername, mutation, orgId],
  );

  return {
    orgId,
    setOrgId,
    fullName,
    email,
    githubUsername,
    setFullName,
    setEmail,
    setGithubUsername,
    fieldErrors,
    formError,
    isSubmitting: mutation.isPending,
    outcome,
    submit,
    reset,
  };
}
