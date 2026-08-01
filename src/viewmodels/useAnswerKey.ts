"use client";
// ============================================================================
// VIEWMODEL LAYER — Answer key (teacher)
//
// The reference solution for whatever starter a project was created from.
//
// LAZY BY DEFAULT, and that is the whole design. A teacher marking student work
// should not have the answer sitting open next to it — the point of reading
// their code is to read THEIR code. Nothing is fetched until the panel is
// explicitly opened, so the solution is not even in the browser's memory until
// somebody asks for it.
//
// The server enforces the real rule (staff who teach this class only); this
// hook must never be consumed from a student surface regardless.
// ============================================================================
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { assignmentsApi } from "@/models/api";
import type { AnswerKey } from "@/models/types";
import { toPresentableError, type PresentableError } from "./errors";

export interface AnswerKeyVm {
  /** Whether the teacher has asked to see it. */
  isOpen: boolean;
  open: () => void;
  close: () => void;
  data: AnswerKey | null;
  isLoading: boolean;
  error: PresentableError | null;
  refetch: () => void;
}

export function useAnswerKey(assignmentId: string | null): AnswerKeyVm {
  const [isOpen, setIsOpen] = useState(false);

  const query = useQuery({
    queryKey: ["assignments", assignmentId, "answer-key"],
    queryFn: () => assignmentsApi.answerKey(assignmentId as string),
    // Both conditions matter: no id means no request to make, and `isOpen`
    // is what keeps the solution un-fetched until it is wanted.
    enabled: Boolean(assignmentId) && isOpen,
    staleTime: 10 * 60_000,
    retry: false,
  });

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error ? toPresentableError(query.error) : null,
    refetch: () => void query.refetch(),
  };
}
