// PlagiarismCard — the four originality states.
//
// This file exists because of a real defect that shipped: the card took only
// `flags` and rendered "✓ Originality clear — no high-similarity matches found"
// whenever the list was empty. The list is empty for every student, because no
// cohort comparison has ever run. Teachers saw an authoritative all-clear that
// was computed from nothing.
//
// No backend test could have caught it — the API was correctly returning an
// empty array. The bug was entirely in how the view interpreted that array.
// That is the class of bug this suite is for.
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlagiarismCard } from "./PlagiarismCard";
import type { IntegrityState, PlagiarismFlag } from "@/models/types";

const recorded: IntegrityState = {
  recordedAt: "2026-08-01T10:00:00.000Z",
  files: 4,
  signals: { commits: 6 },
};

const flag: PlagiarismFlag = {
  id: "pf_1",
  repoId: "repo_1",
  comparedRepoId: "repo_2",
  comparedStudentName: "Sam Rivera",
  similarity: 91,
  status: "FLAGGED",
};

describe("PlagiarismCard", () => {
  // THE REGRESSION. Evidence collected, comparison never run — the state every
  // repository is in today. It must not read as a clean result.
  it("does not claim a clean result when no comparison has run", () => {
    render(<PlagiarismCard flags={[]} integrity={recorded} />);

    expect(screen.getByText(/not yet compared/i)).toBeInTheDocument();
    // The exact words the old card used. Their reappearance means the false
    // all-clear is back, whatever else changed around it.
    expect(screen.queryByText(/originality clear/i)).not.toBeInTheDocument();
    expect(screen.getByText(/not a clean result/i)).toBeInTheDocument();
  });

  it("tells the teacher how much evidence was collected", () => {
    render(<PlagiarismCard flags={[]} integrity={recorded} />);
    expect(screen.getByText(/4 files fingerprinted/i)).toBeInTheDocument();
  });

  it("says nothing at all when stage 6 has never reported", () => {
    render(<PlagiarismCard flags={[]} integrity={null} />);

    expect(screen.getByText(/no originality data/i)).toBeInTheDocument();
    expect(screen.queryByText(/originality clear/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/not yet compared/i)).not.toBeInTheDocument();
  });

  // The green state is legitimate ONLY once comparedAt is set, which today
  // nothing does. Asserting it here pins the contract for when it exists.
  it("reports a clean result only after a comparison actually ran", () => {
    render(
      <PlagiarismCard
        flags={[]}
        integrity={{ ...recorded, comparedAt: "2026-08-02T09:00:00.000Z" }}
      />,
    );
    expect(screen.getByText(/no high similarity found/i)).toBeInTheDocument();
  });

  it("shows matches, with the similarity, when a flag exists", () => {
    render(<PlagiarismCard flags={[flag]} integrity={recorded} />);

    expect(screen.getByText(/high similarity found/i)).toBeInTheDocument();
    expect(screen.getByText("Sam Rivera")).toBeInTheDocument();
    expect(screen.getByText(/91% similar/)).toBeInTheDocument();
  });

  // Similarity is evidence for a human, never an accusation. A flag a teacher
  // has already dismissed must not keep rendering as a live match.
  it("ignores flags that are not FLAGGED", () => {
    render(
      <PlagiarismCard
        flags={[{ ...flag, status: "DISMISSED" as PlagiarismFlag["status"] }]}
        integrity={recorded}
      />,
    );
    expect(screen.queryByText("Sam Rivera")).not.toBeInTheDocument();
    expect(screen.getByText(/not yet compared/i)).toBeInTheDocument();
  });

  // A flagged match outranks every other state: it must show even if the
  // submission record is missing, or the one screen that matters renders blank.
  it("shows a flag even with no integrity record", () => {
    render(<PlagiarismCard flags={[flag]} integrity={null} />);
    expect(screen.getByText("Sam Rivera")).toBeInTheDocument();
  });
});
