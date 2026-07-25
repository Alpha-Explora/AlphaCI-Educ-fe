"use client";
// ============================================================================
// VIEW LAYER — "+ Join Class" modal (student, ADDENDUM D / Option A §3)
// The student types the whiteboard code (auto-uppercased) and joins. Success
// shows the joined class name and refreshes the hub; unknown / expired /
// already-enrolled cases render the friendly message from useJoinClass.
// ============================================================================
import { useState } from "react";
import { useJoinClass, normalizeJoinCode } from "@/viewmodels/useJoinClass";
import { Banner, Button, Field, Input, Modal } from "@/components/ui";

export function JoinClassModal({
  open,
  onClose,
  studentId,
}: {
  open: boolean;
  onClose: () => void;
  studentId: string | null;
}) {
  const vm = useJoinClass(studentId);
  const [code, setCode] = useState("");

  const joined = vm.joinedClass;
  // Treat "already enrolled" as a soft success — they are in the class either way.
  const succeeded = Boolean(joined);

  function handleClose() {
    vm.reset();
    setCode("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={succeeded ? "Joined class" : "Join a class"}
      description={
        succeeded
          ? undefined
          : "Enter the code your teacher wrote on the whiteboard."
      }
      size="md"
    >
      {succeeded && joined ? (
        <div className="space-y-4">
          <Banner
            tone={vm.alreadyEnrolled ? "info" : "success"}
            title={
              vm.alreadyEnrolled
                ? "You're already in this class."
                : `Welcome to ${joined.name}!`
            }
          >
            {joined.code} · {joined.term}
            {joined.section ? ` · Section ${joined.section}` : ""}
          </Banner>
          <div className="flex justify-end">
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!code.trim()) return;
            vm.join(code);
          }}
          noValidate
          className="space-y-4"
        >
          <Field
            label="Class code"
            required
            hint="Codes look like CS101-XYZ. Letters are not case-sensitive."
          >
            {({ id }) => (
              <Input
                id={id}
                value={code}
                // Auto-uppercase as they type so it matches the whiteboard.
                onChange={(e) => setCode(normalizeJoinCode(e.target.value))}
                placeholder="CS101-XYZ"
                autoFocus
                autoComplete="off"
                spellCheck={false}
                className="text-center font-mono text-xl tracking-[0.2em]"
              />
            )}
          </Field>

          {vm.message && (
            <Banner tone={vm.error?.isNetworkError ? "network" : "error"}>
              {vm.message}
            </Banner>
          )}

          <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={vm.isJoining} disabled={!code.trim()}>
              Join class
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
