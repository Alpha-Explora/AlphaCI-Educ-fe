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
  // NO `orgId`. An IT admin is appointed across every laboratory, so there is
  // nothing to choose — see organizationsApi.addAdmin.
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
  const { accessInvite, passwordInviteSent, labs } = result;

  // How many laboratories this covered. Named rather than counted when there
  // are few enough to read: "Computer Laboratory 1 and 2" tells an operator
  // their setup is what they think it is, where "2 laboratories" does not.
  const labNames = labs.map((l) => l.orgName);
  let scope = "every laboratory";
  if (labNames.length === 1) {
    scope = labNames[0];
  } else if (labNames.length >= 2 && labNames.length <= 3) {
    // The `>= 2` guard is not decoration: at length 0 the slice below yields an
    // empty list and an undefined last element, which reads as "and undefined"
    // on screen. The API refuses to appoint an admin when no laboratory exists,
    // so this should be unreachable — but a sentence shown to an operator is
    // not the place to rely on that.
    scope = `${labNames.slice(0, -1).join(", ")} and ${labNames[labNames.length - 1]}`;
  } else if (labNames.length > 3) {
    scope = `all ${labNames.length} laboratories`;
  }

  if (accessInvite.sent || accessInvite.alreadyHadAccess) {
    const how = accessInvite.alreadyHadAccess
      ? `already had access to ${scope}`
      : `has been invited to ${scope} as an IT admin`;
    return {
      tone: "success",
      title: `${name} was appointed`,
      detail: passwordInviteSent
        ? `They ${how}, and we've emailed them a link to set their password. They'll be asked to connect GitHub the first time they sign in.`
        : `They ${how}. They sign in with their email address, then connect GitHub once.`,
    };
  }

  // PARTIAL failure is the new common case, and it is not the same as total
  // failure: with several laboratories, some invitations can land while others
  // do not. The backend's warning names the ones that did not, so it is worth
  // more here than any sentence written in advance.
  const covered = labs.filter((l) => l.invited || l.alreadyMember).length;
  const partial = covered > 0 && covered < labs.length;

  return {
    tone: "warning",
    title: partial
      ? `${name} was appointed, but not every laboratory went through`
      : `${name} was created, but their access is still pending`,
    detail:
      accessInvite.warning ??
      (accessInvite.live
        ? "We couldn't send their organization invitation. Try again, or add them to the IT-Staff team by hand."
        : "Sending an invitation needs an operator signed in with a connected GitHub account. Connect GitHub, then appoint them again."),
  };
}

export function useAddLabAdmin(): AddLabAdminVM {
  const queryClient = useQueryClient();

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
      organizationsApi.addAdmin(payload),
    onSuccess: (result) => {
      setOutcome(describeOutcome(result));
      setFullName("");
      setEmail("");
      setGithubUsername("");
      setSubmitAttempted(false);
      // A new admin now lands in EVERY laboratory, so every lab's overview is
      // stale, not just one. Invalidating the whole `organizations` subtree is
      // the honest expression of that — the previous call invalidated the one
      // lab that had been picked, which would now leave the others showing a
      // stale admin count until something else happened to refetch them.
      void queryClient.invalidateQueries({ queryKey: queryKeys.platform.overview });
      void queryClient.invalidateQueries({ queryKey: queryKeys.organizations.all });
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
      // The "choose a laboratory" gate is gone with the field it guarded.
      if (Object.keys(allErrors).length > 0) return;
      mutation.mutate({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        githubUsername: githubUsername.trim().replace(/^@/, ""),
      });
    },
    [allErrors, email, fullName, githubUsername, mutation],
  );

  return {
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
