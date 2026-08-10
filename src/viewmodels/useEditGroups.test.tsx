// The group editor's draft.
//
// The server owns the rules and has sixteen tests over them. What it cannot
// cover is the thing this file is for: whether the DRAFT a teacher builds turns
// into the payload they meant.
//
// The case that matters is the swap. Moving one student each way between two
// full groups is the edit most likely to be wanted and the one that cannot be
// done incrementally — either order breaks the 2-4 rule mid-way. It only works
// because the whole composition is held locally and sent once, so a regression
// that made this save eagerly would be caught here and nowhere else.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEditGroups } from "./useEditGroups";
import type { AssignmentGroup, SystemUser } from "@/models/types";

const groupsFn = vi.fn();
const updateGroupsFn = vi.fn();

vi.mock("@/models/api", () => ({
  assignmentsApi: {
    groups: (...args: unknown[]) => groupsFn(...args),
    updateGroups: (...args: unknown[]) => updateGroupsFn(...args),
  },
}));

function student(id: string): SystemUser {
  return {
    id,
    fullName: id,
    email: `${id}@alphaexplora.com`,
    role: "STUDENT",
    orgId: "org_state",
    personalGithubUsername: null,
    status: "ACTIVE",
    avatarColor: "#654321",
    githubUsername: null,
    consumesGithubSeat: false,
    githubLogin: null,
    githubAvatarUrl: null,
    githubProfileUrl: null,
    createdAt: "2026-08-01T00:00:00.000Z",
  };
}

const ROSTER = ["ada", "grace", "alan", "edsger", "barbara"].map(student);

const SERVER_GROUPS: AssignmentGroup[] = [
  {
    key: "cs101-a-f26-lab-group1",
    repoIds: ["r1"],
    memberIds: ["ada", "grace"],
    hasSubmittedWork: false,
    isGraded: false,
  },
  {
    key: "cs101-a-f26-lab-group2",
    repoIds: ["r2"],
    memberIds: ["alan", "edsger"],
    hasSubmittedWork: false,
    isGraded: false,
  },
];

const [G1, G2] = SERVER_GROUPS.map((g) => g.key);

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

async function mounted() {
  const hook = renderHook(() => useEditGroups("a1", ROSTER), { wrapper });
  await waitFor(() => expect(hook.result.current.draft).toHaveLength(2));
  return hook;
}

beforeEach(() => {
  vi.clearAllMocks();
  groupsFn.mockResolvedValue(SERVER_GROUPS);
  updateGroupsFn.mockResolvedValue({
    assignmentId: "a1",
    groups: [],
    ungrouped: [],
    warnings: [],
  });
});

describe("useEditGroups", () => {
  it("starts from what the server holds, and is not dirty", async () => {
    const { result } = await mounted();

    expect(result.current.draft[0].members.map((m) => m.id)).toEqual(["ada", "grace"]);
    expect(result.current.unassigned.map((m) => m.id)).toEqual(["barbara"]);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.problems).toEqual([]);
  });

  // THE ONE TO KEEP. Neither half is legal on its own — after the first move
  // group 1 has three and group 2 has one — but the draft is never sent
  // half-done, so the teacher never sees a refusal for a state they were
  // passing through rather than aiming at.
  it("allows a swap that is invalid at its midpoint", async () => {
    const { result } = await mounted();

    act(() => result.current.move("alan", G1));
    expect(result.current.problems).not.toEqual([]);

    act(() => result.current.move("grace", G2));

    expect(result.current.problems).toEqual([]);
    expect(result.current.draft[0].members.map((m) => m.id).sort()).toEqual(["ada", "alan"]);
    expect(result.current.draft[1].members.map((m) => m.id).sort()).toEqual(["edsger", "grace"]);
  });

  it("refuses to save while a group is the wrong size", async () => {
    const { result } = await mounted();

    act(() => result.current.move("grace", null));

    expect(result.current.problems).toHaveLength(1);
    expect(result.current.problems[0]).toMatch(/needs at least 2/);
  });

  it("flags a group grown past four", async () => {
    const { result } = await mounted();

    act(() => result.current.move("barbara", G1));
    act(() => result.current.move("alan", G1));
    act(() => result.current.move("edsger", G1));

    expect(result.current.problems.some((p) => /most allowed is 4/.test(p))).toBe(true);
  });

  // Moving someone out is a legitimate edit on its own — they simply get no
  // repository for this project — so it must not be treated as an error.
  it("lets a student be moved out of every group", async () => {
    const { result } = await mounted();

    act(() => result.current.move("barbara", G1));
    act(() => result.current.move("barbara", null));

    expect(result.current.unassigned.map((m) => m.id)).toEqual(["barbara"]);
    expect(result.current.isDirty).toBe(false);
  });

  it("undo returns the draft to the server's version", async () => {
    const { result } = await mounted();

    act(() => result.current.move("alan", G1));
    expect(result.current.isDirty).toBe(true);

    act(() => result.current.reset());

    expect(result.current.isDirty).toBe(false);
    expect(result.current.draft[0].members.map((m) => m.id)).toEqual(["ada", "grace"]);
  });

  it("sends every group, keyed, not just the ones that changed", async () => {
    const { result } = await mounted();

    act(() => result.current.move("alan", G1));
    act(() => result.current.move("grace", G2));
    act(() => result.current.save());

    await waitFor(() => expect(updateGroupsFn).toHaveBeenCalledTimes(1));

    const [assignmentId, payload] = updateGroupsFn.mock.calls[0] as [
      string,
      Array<{ key: string; studentIds: string[] }>,
    ];

    expect(assignmentId).toBe("a1");
    // Both groups, even though only two students moved — the server rejects a
    // partial composition, and it is right to.
    expect(payload.map((g) => g.key).sort()).toEqual([G1, G2].sort());
    expect([...payload.find((g) => g.key === G1)!.studentIds].sort()).toEqual(["ada", "alan"]);
    expect([...payload.find((g) => g.key === G2)!.studentIds].sort()).toEqual(["edsger", "grace"]);
  });

  it("does not send anything until asked", async () => {
    const { result } = await mounted();

    act(() => result.current.move("alan", G1));
    act(() => result.current.move("grace", G2));

    expect(updateGroupsFn).not.toHaveBeenCalled();
  });
});
