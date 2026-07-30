"use client";
// ============================================================================
// VIEWMODEL LAYER — browse a repository's code at a branch
//
// Holds the current path and the current ref, and derives the breadcrumb. Both
// live here rather than in the component so the navigation rules — what "up" and
// "root" mean, and what happens to the path when the branch changes — are
// expressed once and testable.
// ============================================================================
import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { repositoriesApi } from "@/models/api";
import type { RepoContentEntry, RepoContentListing } from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

export interface Crumb {
  label: string;
  path: string;
}

export interface RepoFilesVM {
  listing: RepoContentListing | undefined;
  path: string;
  ref: string | null;
  crumbs: Crumb[];
  isLoading: boolean;
  error: PresentableError | null;
  openEntry: (entry: RepoContentEntry) => void;
  goTo: (path: string) => void;
  goUp: () => void;
  setRef: (ref: string) => void;
}

export function useRepoFiles(repoId: string | null, initialRef: string | null): RepoFilesVM {
  const [path, setPath] = useState("");
  const [ref, setRefState] = useState<string | null>(initialRef);

  // The branch is only defaulted, never forced: once a student picks one it
  // sticks, so re-rendering with a different initialRef must not yank them back.
  const effectiveRef = ref ?? initialRef;

  const query = useQuery({
    queryKey: queryKeys.repositories.files(repoId ?? "none", path, effectiveRef),
    queryFn: () =>
      repositoriesApi.files(repoId as string, { path, ref: effectiveRef ?? undefined }),
    enabled: Boolean(repoId),
  });

  const openEntry = useCallback((entry: RepoContentEntry) => {
    // Both cases set the path; `kind` in the response is what tells the view
    // whether it received a listing or a file, so there is nothing to branch on
    // here. That is the whole benefit of the server normalising the shape.
    setPath(entry.path);
  }, []);

  const goUp = useCallback(() => {
    setPath((current) => {
      const segments = current.split("/").filter(Boolean);
      segments.pop();
      return segments.join("/");
    });
  }, []);

  const setRef = useCallback((next: string) => {
    setRefState(next);
    // Back to the root on a branch change. A path that exists on one branch may
    // not exist on another, and landing on "missing" after switching reads as an
    // error rather than as a difference between branches.
    setPath("");
  }, []);

  const crumbs = useMemo<Crumb[]>(() => {
    const segments = path.split("/").filter(Boolean);
    const built: Crumb[] = [{ label: "root", path: "" }];
    segments.forEach((segment, index) => {
      built.push({ label: segment, path: segments.slice(0, index + 1).join("/") });
    });
    return built;
  }, [path]);

  return {
    listing: query.data,
    path,
    ref: effectiveRef,
    crumbs,
    isLoading: query.isLoading,
    error: query.error ? toPresentableError(query.error) : null,
    openEntry,
    goTo: setPath,
    goUp,
    setRef,
  };
}
