// GroupMembers — the four states of "who am I working with".
//
// The gap this closes: the student side never rendered `collaborators` at all,
// so the person IN the group was the only one the app never told who their
// teammates were. They saw a "Group project" pill and were told "a teammate
// reviews it" — a requirement naming nobody.
//
// Two of the states below are the interesting ones, and both are cases where an
// obvious rendering would mislead rather than merely underinform: an empty
// member list must not read as "you have no teammates", and a one-person group
// must say why the merge is going to refuse.
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GroupMembers } from "./GroupMembers";
import type { SystemUser } from "@/models/types";

function student(id: string, fullName: string): SystemUser {
  return {
    id,
    fullName,
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

const ada = student("s_ada", "Ada Lovelace");
const grace = student("s_grace", "Grace Hopper");
const alan = student("s_alan", "Alan Turing");

describe("GroupMembers", () => {
  it("names every member of the group", () => {
    render(<GroupMembers members={[ada, grace, alan]} currentUserId={ada.id} />);

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText("Alan Turing")).toBeInTheDocument();
  });

  it("counts the group including the reader", () => {
    render(<GroupMembers members={[ada, grace, alan]} currentUserId={ada.id} />);

    expect(screen.getByText(/3 members/)).toBeInTheDocument();
  });

  // Self is marked, not removed. A list of "the others" reads as the whole group
  // to someone skim-reading, and on a pair project it would show one name —
  // indistinguishable from a solo project with a stray person attached.
  it("marks the reader rather than hiding them", () => {
    render(<GroupMembers members={[ada, grace]} currentUserId={ada.id} />);

    expect(screen.getByText("(you)")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("marks nobody when the reader is not a member", () => {
    // A teacher opening the same component, or a session that has not resolved.
    render(<GroupMembers members={[ada, grace]} currentUserId={null} />);

    expect(screen.queryByText("(you)")).not.toBeInTheDocument();
  });

  // THE FIRST STATE THAT COULD MISLEAD. No rows on a group repository is a
  // provisioning fault. Rendering an empty list would tell a student they have
  // no teammates, which on a group project is a false statement rather than an
  // empty one.
  it("does not present a missing group as having no teammates", () => {
    render(<GroupMembers members={[]} currentUserId={ada.id} />);

    expect(screen.getByText(/no members are recorded/i)).toBeInTheDocument();
    expect(screen.getByText(/tell your teacher/i)).toBeInTheDocument();
  });

  // THE SECOND. A one-person group cannot satisfy the peer-review gate, so the
  // merge will refuse — and without this the refusal looks like a bug in the
  // button rather than a problem with the group.
  it("warns that a one-person group cannot get its pull request approved", () => {
    render(<GroupMembers members={[ada]} currentUserId={ada.id} />);

    expect(screen.getByText(/nobody can review your pull request/i)).toBeInTheDocument();
  });

  it("does not warn once there is someone to review", () => {
    render(<GroupMembers members={[ada, grace]} currentUserId={ada.id} />);

    expect(screen.queryByText(/nobody can review/i)).not.toBeInTheDocument();
  });
});
