"use client";
// ============================================================================
// VIEW LAYER — the code prompt, opened by clicking a class that is waiting.
//
// Replaced a banner pinned above the course grid. That banner was always in the
// way and never in context: it sat at the top of the page whether or not the
// student was looking at the class it referred to, and with two classes waiting
// it had to name both in a sentence. Asking on the card the student just clicked
// makes the question specific — this class, this code — and takes the standing
// furniture off the page.
//
// It is the ONLY way in for a waiting class, which is why the card itself became
// clickable rather than growing an "Enter code" button: the whole card is a
// bigger target, and a student who taps a class they cannot open yet is already
// asking the exact question this answers.
// ============================================================================
import { useState } from "react";
import { useClassCode } from "@/viewmodels/useClassCode";
import { Banner, Button, Input, Modal } from "@/components/ui";

export function ClassCodePrompt({
  open,
  onClose,
  classCode,
  className,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  /** "AT-1234" — what the teacher writes on the board. */
  readonly classCode: string;
  /** "AlphaTest" — the section's own name. */
  readonly className: string;
}) {
  const vm = useClassCode();
  const [code, setCode] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    vm.submit(trimmed, {
      // Closing on success rather than showing a confirmation: the card behind
      // this dialog turns open at the same moment, which is the confirmation.
      onSuccess: () => {
        setCode("");
        onClose();
      },
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Enter the code for ${classCode}`}
      description={`Your teacher has started ${className}. Type the code they're showing to start working.`}
      size="md"
    >
      <form onSubmit={submit} className="space-y-4">
        {vm.submitError && <Banner tone="error">{vm.submitError.message}</Banner>}

        <Input
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            // Drop the previous failure the moment they start correcting it — an
            // error under a field they have just retyped reads as a rejection of
            // the NEW value.
            if (vm.submitError) vm.clearError();
          }}
          // Deliberately not a format hint: two shapes are valid here ("4KMNPQ"
          // and "AT1234-XYZ"), and showing one as the example makes the other
          // look wrong to a student holding it.
          placeholder="Class code"
          aria-label="Class code"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          autoFocus
          maxLength={20}
          disabled={vm.isSubmitting}
          className="text-center font-mono text-xl uppercase tracking-[0.3em]"
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={vm.isSubmitting} disabled={!code.trim()}>
            Unlock
          </Button>
        </div>
      </form>
    </Modal>
  );
}
