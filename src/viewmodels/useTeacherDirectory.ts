"use client";
// ============================================================================
// VIEWMODEL LAYER — Admin teacher directory + "add teacher"
//
// Owns the list, the form state, validation, the mutation, and the wording of
// the outcome. The View renders a table and a dialog and holds nothing but
// whether the dialog is open.
//
// The outcome message is the interesting part: the backend creates the profile
// even when the source-host invite or the password email fails, so this VM
// distinguishes "fully done" from "created, access pending" instead of
// collapsing both into a green tick.
// ============================================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { organizationsApi, ApiError } from "@/models/api";
import type {
  AddTeacherRequest,
  AddTeacherResponse,
  SystemUser,
  TransferableTeacher,
} from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

export interface AddTeacherOutcome {
  tone: "success" | "warning";
  title: string;
  detail: string;
  /**
   * Who it is about. Carried so the banner can retire itself once its claim
   * stops being true — see the staleness effect in useTeacherDirectory.
   */
  teacherId: string;
}

/** Result of a removal or a sync, phrased for the admin. */
export interface StaffActionOutcome {
  tone: "success" | "warning";
  title: string;
  detail: string;
}

export interface TeacherDirectoryVM {
  /** Active teachers first, then archived — removed staff stay visible as history. */
  teachers: SystemUser[];
  isLoading: boolean;
  error: PresentableError | null;
  refetch: () => void;

  // --- Add-teacher form ---
  fullName: string;
  email: string;
  /** Optional. Pins which GitHub account may link to the new profile. */
  githubUsername: string;
  setFullName: (value: string) => void;
  setEmail: (value: string) => void;
  setGithubUsername: (value: string) => void;
  /** Per-field messages, shown only after a submit attempt. */
  fieldErrors: { fullName?: string; email?: string; githubUsername?: string };
  /** Whole-form failure (duplicate email, backend down). */
  formError: string | null;
  isSubmitting: boolean;
  /** Set once a teacher is added; the View shows it and closes the dialog. */
  outcome: AddTeacherOutcome | null;
  /** Clear the add banner by hand. */
  dismissOutcome: () => void;
  submit: (event: React.FormEvent<HTMLFormElement>) => void;
  /** Clear form + result, e.g. when the dialog closes. */
  reset: () => void;

  // --- Reuse someone who already teaches elsewhere ---
  /** Teachers on the platform who are not in this laboratory yet. */
  transferable: TransferableTeacher[];
  /** Narrowed by `transferableQuery`, for picking out of a long list. */
  transferableMatches: TransferableTeacher[];
  transferableQuery: string;
  setTransferableQuery: (value: string) => void;
  isLoadingTransferable: boolean;
  /** Fill the form from an existing teacher. */
  pickExisting: (teacher: TransferableTeacher) => void;
  /** The picked teacher, if the form was filled from one. */
  pickedExisting: TransferableTeacher | null;
  /** Go back to typing someone new. */
  clearPicked: () => void;

  // --- Remove a teacher ---
  /** The teacher awaiting confirmation, or null. Views render a dialog from this. */
  pendingRemoval: SystemUser | null;
  askToRemove: (teacher: SystemUser) => void;
  cancelRemoval: () => void;
  confirmRemoval: () => void;
  isRemoving: boolean;

  // --- Sync with the GitHub organization ---
  syncWithOrg: () => void;
  isSyncing: boolean;

  /** Outcome of the last removal or sync. Shown as a page-level banner. */
  staffOutcome: StaffActionOutcome | null;
  dismissStaffOutcome: () => void;
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// GitHub's own rule: alphanumerics and single hyphens, max 39, no leading or
// trailing hyphen. Catching a typo here beats a confusing 404 from the invite.
const GITHUB_HANDLE_SHAPE = /^[a-zA-Z\d](?:[a-zA-Z\d]|-(?=[a-zA-Z\d])){0,38}$/;

/**
 * Describes what actually happened, in the admin's language.
 *
 * Note that no branch mentions GitHub: "access" is as specific as the UI gets
 * about the source host, while still telling the admin whether they need to do
 * anything else.
 */
function describeOutcome(result: AddTeacherResponse): AddTeacherOutcome {
  const name = result.teacher.fullName;
  const teacherId = result.teacher.id;
  const { accessInvite, passwordInviteSent, attachedExisting } = result;

  if (accessInvite.sent || accessInvite.alreadyHadAccess) {
    const how = accessInvite.alreadyHadAccess
      ? "already had access to this laboratory"
      : "has been invited to this laboratory";

    // An existing teacher is a different story and needs different copy: no new
    // account was made, no password email went out, and the admin should not be
    // left wondering why the teacher never got one.
    if (attachedExisting) {
      return {
        teacherId,
        tone: "success",
        title: `${name} was added to this laboratory`,
        detail: `They already teach elsewhere on the platform, so we kept their existing account and sign-in — they ${how}. They'll see this laboratory the next time they sign in.`,
      };
    }

    return {
      teacherId,
      tone: "success",
      title: `${name} was added`,
      detail: passwordInviteSent
        ? `They ${how}, and we've emailed them a link to set their password.`
        : `They ${how}. They can sign in with their connected account.`,
    };
  }

  // Profile exists but access didn't go out — actionable, so say so plainly.
  return {
    teacherId,
    tone: "warning",
    title: `${name} was added, but access is still pending`,
    detail:
      accessInvite.warning ??
      (accessInvite.live
        ? "We couldn't send their access invitation. Open this page again to retry, or check with your platform administrator."
        : "Access invitations need an administrator signed in with a connected account. Sign in that way and add them again to send it."),
  };
}

export function useTeacherDirectory(orgId: string | null): TeacherDirectoryVM {
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<AddTeacherOutcome | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<SystemUser | null>(null);
  const [transferableQuery, setTransferableQuery] = useState("");
  const [pickedExisting, setPickedExisting] = useState<TransferableTeacher | null>(null);
  const [staffOutcome, setStaffOutcome] = useState<StaffActionOutcome | null>(null);

  const query = useQuery({
    queryKey: queryKeys.organizations.teachers(orgId ?? "none"),
    queryFn: () => organizationsApi.teachers(orgId as string),
    enabled: Boolean(orgId),
  });

  const transferableResult = useQuery({
    queryKey: queryKeys.organizations.transferableTeachers(orgId ?? "none"),
    queryFn: () => organizationsApi.transferableTeachers(orgId as string),
    enabled: Boolean(orgId),
  });
  const transferable = useMemo(
    () => transferableResult.data ?? [],
    [transferableResult.data],
  );

  const transferableMatches = useMemo(() => {
    const needle = transferableQuery.trim().toLowerCase();
    if (!needle) return transferable;
    return transferable.filter(
      (t) =>
        t.fullName.toLowerCase().includes(needle) ||
        t.email.toLowerCase().includes(needle) ||
        (t.githubUsername ?? "").toLowerCase().includes(needle),
    );
  }, [transferable, transferableQuery]);

  const allErrors = useMemo(() => {
    const errors: { fullName?: string; email?: string; githubUsername?: string } = {};
    if (fullName.trim().length < 2) errors.fullName = "Enter the teacher's full name.";
    const trimmedEmail = email.trim();
    if (!trimmedEmail) errors.email = "Enter their school email address.";
    else if (!EMAIL_SHAPE.test(trimmedEmail))
      errors.email = "That doesn't look like an email address.";
    // Required: it pins the identity AND is the only invite form the platform
    // can send on its own, so an empty one would silently need a connected admin.
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
    setPickedExisting(null);
    setTransferableQuery("");
    setSubmitAttempted(false);
    setFormError(null);
    setOutcome(null);
  }, []);

  const mutation = useMutation({
    mutationFn: (payload: AddTeacherRequest) =>
      organizationsApi.addTeacher(orgId as string, payload),
    onSuccess: (result) => {
      setOutcome(describeOutcome(result));
      setFullName("");
      setEmail("");
      setGithubUsername("");
      setPickedExisting(null);
      setTransferableQuery("");
      setSubmitAttempted(false);
      // Whoever was just added is no longer "available elsewhere" for this lab.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.transferableTeachers(orgId ?? "none"),
      });
      // The new teacher changes both the directory and the admin overview's
      // staff counts, so invalidate both rather than just the list.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.teachers(orgId ?? "none"),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.adminOverview(orgId ?? "none"),
      });
    },
    onError: (err) => {
      setFormError(
        err instanceof ApiError
          ? err.message
          : "Couldn't add that teacher. Please try again.",
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
        setFormError("Select a laboratory first.");
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


  /**
   * Retire the "access is still pending" banner once it stops being true.
   *
   * That warning is a snapshot of the instant the teacher was added, and it used
   * to sit there for the life of the page — so an admin who fixed the problem
   * (or whose invite simply landed a moment later) kept reading a stale warning
   * next to a row that said Connected.
   *
   * `githubLogin` is the honest signal here: it is only ever written when the
   * teacher completes the GitHub link, and completing it requires being on the
   * team, which requires being in the organization. So a set githubLogin PROVES
   * the invitation went out and was accepted, which is exactly what the warning
   * claimed had not happened.
   *
   * Only the warning self-retires. A success message is not a claim that can go
   * stale, and yanking it away would look like a glitch.
   */
  useEffect(() => {
    if (!outcome || outcome.tone !== "warning") return;
    const subject = (query.data ?? []).find((t) => t.id === outcome.teacherId);
    if (subject?.githubLogin) setOutcome(null);
  }, [outcome, query.data]);

  const invalidateDirectory = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.organizations.teachers(orgId ?? "none"),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.organizations.adminOverview(orgId ?? "none"),
    });
  }, [orgId, queryClient]);

  const removeMutation = useMutation({
    mutationFn: (teacher: SystemUser) =>
      organizationsApi.removeTeacher(orgId as string, teacher.id),
    onSuccess: (result) => {
      const name = result.user.fullName;
      const { cascade, orgRemoval, accountDeleted } = result;
      // "Deleted" and "removed from this laboratory" are different promises, and
      // saying the wrong one to an admin who shares a teacher with another school
      // is how trust in the button is lost.
      const verb = accountDeleted ? "deleted" : "removed from this laboratory";

      // Only mention the cascade when there IS one. "and 0 classes" reads like
      // a bug, and most removals take nothing with them.
      const alsoDeleted: string[] = [];
      if (cascade.classes > 0)
        alsoDeleted.push(`${cascade.classes} class${cascade.classes === 1 ? "" : "es"}`);
      if (cascade.repositories > 0)
        alsoDeleted.push(
          `${cascade.repositories} student project${cascade.repositories === 1 ? "" : "s"}`,
        );
      const alsoText =
        alsoDeleted.length > 0 ? ` Also deleted: ${alsoDeleted.join(" and ")}.` : "";

      const keptAccount = accountDeleted
        ? ""
        : " They teach at another laboratory, so their account and that laboratory's classes are untouched.";

      if (orgRemoval.nothingToRemove) {
        // They never had a GitHub account attached, so the organization was
        // never involved. Reporting a "failed" org removal here sent admins
        // looking for a member who was never there.
        setStaffOutcome({
          tone: "success",
          title: `${name} was ${verb}`,
          detail: `They had no GitHub account connected, so there was nothing to remove from the organization.${keptAccount}${alsoText}`,
        });
      } else if (orgRemoval.removed) {
        setStaffOutcome({
          tone: "success",
          title: `${name} was ${verb}`,
          detail: `They've been removed from this laboratory's organization.${keptAccount}${alsoText}`,
        });
      } else {
        setStaffOutcome({
          tone: "warning",
          title: `${name} was ${verb}, but is still in the organization`,
          detail: `${
            orgRemoval.warning ?? "GitHub refused the removal."
          } Their access here is gone either way.${keptAccount}${alsoText}`,
        });
      }

      setPendingRemoval(null);
      invalidateDirectory();
    },
    onError: (err) => {
      setStaffOutcome({
        tone: "warning",
        title: "Couldn't remove that teacher",
        detail:
          err instanceof ApiError ? err.message : "Please try again.",
      });
      setPendingRemoval(null);
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => organizationsApi.reconcileStaff(orgId as string),
    onSuccess: (result) => {
      if (!result.live) {
        setStaffOutcome({
          tone: "warning",
          title: "Nothing was synced",
          detail: result.warning ?? "The organization couldn't be read, so nothing was changed.",
        });
        return;
      }
      const names = result.archived.map((u) => u.fullName).join(", ");
      const skipped =
        result.skippedNoHandle > 0
          ? ` ${result.skippedNoHandle} could not be checked because we don't know their GitHub username yet.`
          : "";
      setStaffOutcome({
        tone: result.archived.length > 0 ? "warning" : "success",
        title:
          result.archived.length > 0
            ? `${result.archived.length} teacher${result.archived.length === 1 ? "" : "s"} removed to match the organization`
            : "Everything is already in step",
        detail:
          result.archived.length > 0
            ? `${names} ${result.archived.length === 1 ? "is" : "are"} no longer in the organization, so their access has been revoked here too.${skipped}`
            : `Checked ${result.checked} teacher${result.checked === 1 ? "" : "s"}; every one is still in the organization.${skipped}`,
      });
      invalidateDirectory();
    },
    onError: (err) => {
      setStaffOutcome({
        tone: "warning",
        title: "Couldn't sync with the organization",
        detail: err instanceof ApiError ? err.message : "Please try again.",
      });
    },
  });

  // Active first, then archived, each newest-first. Removed staff stay on the
  // list rather than vanishing: an admin needs to see that a removal actually
  // happened, and who it was.
  const teachers = useMemo<SystemUser[]>(() => {
    const rows = query.data ?? [];
    return [...rows].sort((a, b) => {
      const aActive = a.status === "ACTIVE";
      const bActive = b.status === "ACTIVE";
      if (aActive !== bActive) return aActive ? -1 : 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [query.data]);

  return {
    teachers,
    isLoading: query.isLoading,
    error: query.error ? toPresentableError(query.error) : null,
    refetch: () => void query.refetch(),
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
    dismissOutcome: () => setOutcome(null),
    submit,
    reset,

    transferable,
    transferableMatches,
    transferableQuery,
    setTransferableQuery,
    isLoadingTransferable: transferableResult.isLoading,
    pickedExisting,
    /**
     * Copies the existing record into the form.
     *
     * The email and handle are what make this worth having: the API requires
     * BOTH to match the existing account exactly, and an admin working from
     * memory gets one of them subtly wrong and meets a 409. Copying makes them
     * correct by construction.
     */
    pickExisting: (teacher: TransferableTeacher) => {
      setPickedExisting(teacher);
      setFullName(teacher.fullName);
      setEmail(teacher.email);
      setGithubUsername(teacher.githubUsername ?? "");
      setSubmitAttempted(false);
      setFormError(null);
    },
    clearPicked: () => {
      setPickedExisting(null);
      setFullName("");
      setEmail("");
      setGithubUsername("");
      setSubmitAttempted(false);
    },

    pendingRemoval,
    askToRemove: setPendingRemoval,
    cancelRemoval: () => setPendingRemoval(null),
    confirmRemoval: () => {
      if (pendingRemoval) removeMutation.mutate(pendingRemoval);
    },
    isRemoving: removeMutation.isPending,

    syncWithOrg: () => syncMutation.mutate(),
    isSyncing: syncMutation.isPending,

    staffOutcome,
    dismissStaffOutcome: () => setStaffOutcome(null),
  };
}
