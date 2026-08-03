"use client";
// ============================================================================
// VIEWMODEL LAYER — a class's weekly meeting window.
//
// Owns the form state for the Settings card, the client-side validation, and the
// save. The window is expressed in PHILIPPINE TIME and the server enforces it
// against its own clock, so nothing here reads the browser's timezone — a
// teacher on a laptop set to another zone still types the times their students
// will actually see.
//
// WHY VALIDATION LIVES HERE AS WELL AS ON THE SERVER
// The server is the authority and rejects a bad window with a 400. But "end must
// be after start" is a mistake a teacher makes while typing, and a round trip to
// be told so — after which the form has to interpret an error string — is worse
// than answering immediately. The server's copy stays because a client is not a
// security boundary; this copy exists because it is a better keyboard.
// ============================================================================
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { classesApi, ApiError } from "@/models/api";
import type { ClassSchedule } from "@/models/types";
import { brand } from "@/config/brand";

/** Monday-first, because a school week is. The values are JS day numbers. */
export const WEEKDAYS: ReadonlyArray<{ value: number; label: string; short: string }> = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
  { value: 0, label: "Sunday", short: "Sun" },
];

const DEFAULT_START = "08:00";
const DEFAULT_END = "10:00";

function mapError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.isNetworkError) return `Can't reach ${brand.name} right now. Try again.`;
    if (err.status === 403) return "You can only change sections you teach.";
    if (err.status === 404) return "That class no longer exists.";
    return err.message;
  }
  return "Couldn't save the schedule. Please try again.";
}

/** Minutes since midnight for an "HH:MM" input value, or null if incomplete. */
function minutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export interface ClassScheduleVM {
  /** Whether the class is gated at all — the master switch on the card. */
  enabled: boolean;
  setEnabled: (on: boolean) => void;
  days: number[];
  toggleDay: (day: number) => void;
  startTime: string;
  setStartTime: (value: string) => void;
  endTime: string;
  setEndTime: (value: string) => void;

  /** Null when the form is currently savable; a sentence when it is not. */
  validationError: string | null;
  /** True when the form differs from what is stored. */
  isDirty: boolean;
  save: () => void;
  isSaving: boolean;
  saveError: string | null;
  justSaved: boolean;
}

export function useClassSchedule(
  classId: string | null,
  stored: ClassSchedule | null | undefined,
): ClassScheduleVM {
  const queryClient = useQueryClient();

  const [enabled, setEnabled] = useState(Boolean(stored));
  const [days, setDays] = useState<number[]>(stored?.days ?? [1, 3, 5]);
  const [startTime, setStartTime] = useState(stored?.startTime ?? DEFAULT_START);
  const [endTime, setEndTime] = useState(stored?.endTime ?? DEFAULT_END);
  const [justSaved, setJustSaved] = useState(false);

  // Re-seed when the stored value arrives or changes. The roster query resolves
  // AFTER first render, so without this the form would keep the defaults it was
  // constructed with and show "Mon, Wed, Fri 08:00" for a class that is actually
  // scheduled for Tuesday afternoons — then save that back over it.
  useEffect(() => {
    setEnabled(Boolean(stored));
    setDays(stored?.days ?? [1, 3, 5]);
    setStartTime(stored?.startTime ?? DEFAULT_START);
    setEndTime(stored?.endTime ?? DEFAULT_END);
  }, [stored?.days, stored?.startTime, stored?.endTime, stored]);

  const validationError = useMemo(() => {
    if (!enabled) return null;
    if (days.length === 0) return "Pick at least one day the class meets.";
    const start = minutes(startTime);
    const end = minutes(endTime);
    if (start === null || end === null) return "Enter both a start and an end time.";
    if (end <= start) {
      // Named explicitly rather than left as "invalid": a teacher who typed
      // 22:00–02:00 meant an overnight class, and the useful answer is that the
      // product does not model one, not that the form is unhappy.
      return "The end time must be later than the start. Overnight windows aren't supported.";
    }
    return null;
  }, [enabled, days, startTime, endTime]);

  const isDirty = useMemo(() => {
    const storedEnabled = Boolean(stored);
    if (enabled !== storedEnabled) return true;
    if (!enabled) return false;
    const sameDays =
      days.length === (stored?.days.length ?? 0) &&
      [...days].sort((a, b) => a - b).join() ===
        [...(stored?.days ?? [])].sort((a, b) => a - b).join();
    return !sameDays || startTime !== stored?.startTime || endTime !== stored?.endTime;
  }, [enabled, days, startTime, endTime, stored]);

  const mutation = useMutation({
    mutationFn: (schedule: ClassSchedule | null) =>
      classesApi.setSchedule(classId as string, schedule),
    onSuccess: () => {
      setJustSaved(true);
      // The roster carries classInfo (and therefore the schedule), and the
      // student dashboards carry the derived in-session state — both are now
      // wrong. Invalidating "dashboards" is what makes a student's hub unlock
      // without them reloading the page.
      void queryClient.invalidateQueries({ queryKey: ["classes"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboards"] });
    },
  });

  return {
    enabled,
    setEnabled: (on) => {
      setEnabled(on);
      setJustSaved(false);
    },
    days,
    toggleDay: (day) => {
      setJustSaved(false);
      setDays((current) =>
        current.includes(day) ? current.filter((d) => d !== day) : [...current, day],
      );
    },
    startTime,
    setStartTime: (v) => {
      setJustSaved(false);
      setStartTime(v);
    },
    endTime,
    setEndTime: (v) => {
      setJustSaved(false);
      setEndTime(v);
    },
    validationError,
    isDirty,
    save: () => {
      if (!classId || validationError) return;
      mutation.mutate(enabled ? { days, startTime, endTime } : null);
    },
    isSaving: mutation.isPending,
    saveError: mutation.error ? mapError(mutation.error) : null,
    justSaved,
  };
}
