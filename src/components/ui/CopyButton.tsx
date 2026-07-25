"use client";
// VIEW LAYER — copy-to-clipboard button with transient "Copied ✓" feedback.
import { useEffect, useRef, useState } from "react";
import { Button } from "./Button";

export function CopyButton({
  value,
  label = "Copy",
  size = "sm",
  variant = "secondary",
  className,
}: {
  value: string;
  label?: string;
  size?: "sm" | "md";
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — non-fatal */
    }
  }

  return (
    <Button size={size} variant={variant} onClick={copy} className={className}>
      {copied ? "Copied ✓" : label}
    </Button>
  );
}
