"use client";
// VIEW LAYER — accessible modal dialog (backdrop + Escape/close, focus label).
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "./cn";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Keep the latest onClose without making it an effect dependency — otherwise a
  // parent that passes a fresh onClose each render (very common) would re-run the
  // effect on every keystroke and steal focus back into the panel.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Move focus into the dialog ONCE, when it opens — not on every re-render.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  // Escape-to-close + body scroll lock while open. Depends only on `open`, so it
  // subscribes once per open (uses onCloseRef for the latest handler).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open) return null;

  const maxW = size === "md" ? "max-w-lg" : size === "xl" ? "max-w-3xl" : "max-w-2xl";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-slate-900/40 backdrop-blur-[2px] animate-fade-in"
      />
      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "relative my-8 w-full rounded-2xl border border-[var(--border-subtle)] bg-white shadow-card-hover outline-none animate-fade-up",
          maxW,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-strong)]">{title}</h2>
            {description && (
              <p className="mt-0.5 text-sm text-[var(--text-muted)]">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-slate-100 hover:text-[var(--text-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ✕
            </span>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
