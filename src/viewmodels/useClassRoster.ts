"use client";
// VIEWMODEL LAYER — Class roster.
// Loads a class roster and derives class-wide progress rollups.
import { useQuery } from "@tanstack/react-query";
import { classesApi } from "@/models/api";
import type { ClassRoster } from "@/models/types";
import { queryKeys } from "./queryKeys";
import { toPresentableError, type PresentableError } from "./errors";

export interface ClassRosterVM {
  data: ClassRoster | undefined;
  isLoading: boolean;
  error: PresentableError | null;
  refetch: () => void;
  rollup: {
    studentCount: number;
    submitted: number;
    graded: number;
    classAvg: number | null;
  };
}

export function useClassRoster(classId: string | null): ClassRosterVM {
  const query = useQuery({
    queryKey: queryKeys.classes.roster(classId ?? "none"),
    queryFn: () => classesApi.roster(classId as string),
    enabled: Boolean(classId),
  });

  const students = query.data?.students ?? [];
  const graded = students.reduce((s, x) => s + x.gradedCount, 0);
  const submitted = students.reduce((s, x) => s + x.submittedCount, 0);
  const gradedAvgs = students
    .map((x) => x.avgGrade)
    .filter((g): g is number => g !== null);
  const classAvg =
    gradedAvgs.length > 0
      ? Math.round(gradedAvgs.reduce((s, x) => s + x, 0) / gradedAvgs.length)
      : null;

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error ? toPresentableError(query.error) : null,
    refetch: () => void query.refetch(),
    rollup: { studentCount: students.length, submitted, graded, classAvg },
  };
}
