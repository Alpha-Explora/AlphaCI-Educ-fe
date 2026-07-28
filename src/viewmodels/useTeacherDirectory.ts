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
  AccessibleLab,
  AddTeacherRequest,
  AddTeacherResponse,
  SystemUser,
  TransferableTeacher,
} from "@/models/types";
import { useSession } from "./useSession";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

/** What happened for ONE laboratory in a multi-lab add. */
export interface AddTeacherLabResult {
  labId: string;
  labName: string;
  ok: boolean;
  /** Why it failed, when `ok` is false. */
  error?: string;
  /** true when the profile landed but source-host access did not go out. */
  accessPending?: boolean;
  /** The backend's reason for that, when it gave one. */
  accessWarning?: string;
}

export interface AddTeacherOutcome {
  tone: "success" | "warning";
  title: string;
  detail: string;
  /**
   * Who it is about. Carried so the banner can retire itself once its claim
   * stops being true — see the staleness effect in useTeacherDirectory.
   */
  teacherId: string;
  /** Per-laboratory breakdown, so a partial success can be shown honestly. */
  labs: AddTeacherLabResult[];
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

  // --- Which laboratories to invite them to ---
  /** Every laboratory this admin may administer, as checkbox options. */
  labOptions: AccessibleLab[];
  /** The ticked laboratories. Defaults to the one being viewed. */
  selectedLabIds: string[];
  toggleLab: (labId: string) => void;
  /** Shown after a submit attempt with nothing ticked. */
  labsError: string | undefined;
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

/** "A", "A and B", "A, B and C" — reads better in prose than a comma list. */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * Describes what actually happened, in the admin's language.
 *
 * Note that no branch mentions GitHub: "access" is as specific as the UI gets
 * about the source host, while still telling the admin whether they need to do
 * anything else.
 *
 * With several laboratories ticked, each one is its own success or failure —
 * one lab rejecting the teacher does not undo the others. So the summary is
 * built from the per-lab results rather than from a single response, and a
 * partial result says "2 of 3" instead of a green tick that would be a lie.
 *
 * `first` is the response of the first laboratory that SUCCEEDED: it is the one
 * that created (or matched) the account, so it alone carries the truth about
 * whether a profile was made and whether a password email went out. Later
 * laboratories always attach to that same account.
 */
function describeOutcome(
  first: AddTeacherResponse,
  labs: AddTeacherLabResult[],
): AddTeacherOutcome {
  const name = first.teacher.fullName;
  const teacherId = first.teacher.id;
  const { passwordInviteSent, attachedExisting } = first;

  const added = labs.filter((l) => l.ok);
  const failed = labs.filter((l) => !l.ok);
  const pending = added.filter((l) => l.accessPending);

  const addedNames = joinNames(added.map((l) => l.labName));

  // How they will sign in. An existing account keeps its own password, and
  // saying so stops an admin waiting for an email that was never sent.
  const signIn = attachedExisting
    ? " They already teach elsewhere on the platform, so we kept their existing account and sign-in."
    : passwordInviteSent
      ? " We've emailed them a link to set their password."
      : " They can sign in with their connected account.";

  const pendingText =
    pending.length > 0
      ? ` Access is still pending at ${joinNames(pending.map((l) => l.labName))}. ${
          pending[0].accessWarning ??
          "Access invitations need an administrator signed in with a connected account."
        }`
      : "";

  // Some laboratories took them, some didn't. Name both sides — an admin who
  // only reads "added" would never go back for the ones that were refused.
  if (failed.length > 0) {
    return {
      teacherId,
      labs,
      tone: "warning",
      title: `${name} was added to ${added.length} of ${labs.length} laboratories`,
      detail:
        `They now have access to ${addedNames}.${signIn}${pendingText} ` +
        `Not added to ${joinNames(failed.map((l) => l.labName))} — ` +
        joinNames(failed.map((l) => l.error ?? "it was refused.")),
    };
  }

  // Profile exists everywhere asked, but access didn't go out somewhere.
  if (pending.length > 0) {
    return {
      teacherId,
      labs,
      tone: "warning",
      title: `${name} was added, but access is still pending`,
      detail: `They have a profile at ${addedNames}.${signIn}${pendingText}`,
    };
  }

  return {
    teacherId,
    labs,
    tone: "success",
    title:
      added.length === 1
        ? `${name} was added to ${addedNames}`
        : `${name} was added to ${added.length} laboratories`,
    detail: `They have access to ${addedNames}.${signIn} They'll see ${
      added.length === 1 ? "it" : "them"
    } the next time they sign in.`,
  };
}

export function useTeacherDirectory(orgId: string | null): TeacherDirectoryVM {
  const queryClient = useQueryClient();
  // An IT Admin administers every laboratory (see OrganizationsService.assertAdmin),
  // so the session's lab list IS the set they may invite into.
  const { labs: labOptions } = useSession();

  const [selectedLabIds, setSelectedLabIds] = useState<string[]>([]);
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

  // The laboratory being viewed starts ticked — adding a teacher *here* is what
  // the admin came to this page for. They can untick it and pick others, so the
  // default is a starting point, not a floor.
  useEffect(() => {
    setSelectedLabIds(orgId ? [orgId] : []);
  }, [orgId]);

  const toggleLab = useCallback((labId: string) => {
    setSelectedLabIds((prev) =>
      prev.includes(labId) ? prev.filter((id) => id !== labId) : [...prev, labId],
    );
  }, []);

  const labsError =
    submitAttempted && selectedLabIds.length === 0
      ? "Pick at least one laboratory."
      : undefined;

  const reset = useCallback(() => {
    setFullName("");
    setEmail("");
    setGithubUsername("");
    setPickedExisting(null);
    setTransferableQuery("");
    setSubmitAttempted(false);
    setFormError(null);
    setOutcome(null);
    setSelectedLabIds(orgId ? [orgId] : []);
  }, [orgId]);

  const mutation = useMutation({
    mutationFn: async (payload: AddTeacherRequest) => {
      /*
        One request per ticked laboratory, run STRICTLY IN SEQUENCE.

        The endpoint is per-organization, and the backend already composes
        correctly across several: the first call creates the account, and each
        later one finds it by email and ATTACHES it to that lab
        (OrganizationsService.addStaff → addUserToLab), skipping the password
        email so the teacher isn't mailed once per school.

        That composition only holds if the calls are ordered. Fired together,
        two of them can both look the account up before either has written it —
        each takes the "no existing user" branch and creates its own profile for
        the same person. The await points are real (the source-host invite is a
        network call), so this is reachable, not theoretical. Hence the loop:
        slower by design, and the only version that cannot duplicate a teacher.
      */
      const results: AddTeacherLabResult[] = [];
      let first: AddTeacherResponse | null = null;

      for (const labId of selectedLabIds) {
        const labName = labOptions.find((l) => l.id === labId)?.name ?? "this laboratory";
        try {
          const res = await organizationsApi.addTeacher(labId, payload);
          first ??= res;
          const { accessInvite } = res;
          results.push({
            labId,
            labName,
            ok: true,
            accessPending: !(accessInvite.sent || accessInvite.alreadyHadAccess),
            accessWarning: accessInvite.warning,
          });
        } catch (err) {
          // Keep going: the remaining laboratories are independent, and a
          // conflict at one school shouldn't block the others.
          results.push({
            labId,
            labName,
            ok: false,
            error:
              err instanceof ApiError ? err.message : "we couldn't reach that laboratory.",
          });
        }
      }

      // Nothing landed anywhere — surface it as a form error so the admin stays
      // in the dialog with their typing intact, rather than getting a banner
      // behind a closed form.
      if (!first) {
        throw new Error(
          results[0]?.error ?? "Couldn't add that teacher. Please try again.",
        );
      }
      return { first, labs: results };
    },
    onSuccess: ({ first, labs }) => {
      setOutcome(describeOutcome(first, labs));
      setFullName("");
      setEmail("");
      setGithubUsername("");
      setPickedExisting(null);
      setTransferableQuery("");
      setSubmitAttempted(false);

      // Refresh EVERY laboratory that actually took them, not just the one on
      // screen — the admin can switch labs straight after and would otherwise
      // be looking at a directory that doesn't list the teacher they just added.
      for (const lab of labs.filter((l) => l.ok)) {
        // Whoever was just added is no longer "available elsewhere" for that lab.
        void queryClient.invalidateQueries({
          queryKey: queryKeys.organizations.transferableTeachers(lab.labId),
        });
        // The new teacher changes both the directory and the admin overview's
        // staff counts, so invalidate both rather than just the list.
        void queryClient.invalidateQueries({
          queryKey: queryKeys.organizations.teachers(lab.labId),
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.organizations.adminOverview(lab.labId),
        });
      }
    },
    // Covers ApiError (which extends Error) and the all-labs-failed throw above,
    // both of which already carry admin-facing wording.
    onError: (err) => {
      setFormError(
        err instanceof Error && err.message
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
      // Blocked by the inline checkbox message rather than a form-level banner,
      // so the admin's eye goes to the control they need to fix.
      if (selectedLabIds.length === 0) return;
      if (Object.keys(allErrors).length > 0) return;
      mutation.mutate({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        githubUsername: githubUsername.trim().replace(/^@/, ""),
      });
    },
    [allErrors, email, fullName, githubUsername, mutation, selectedLabIds],
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
    labOptions,
    selectedLabIds,
    toggleLab,
    labsError,
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
