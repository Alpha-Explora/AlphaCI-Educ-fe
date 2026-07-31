"use client";
// ============================================================================
// VIEW LAYER — accessible modal dialog (backdrop + Escape/close, focus label).
//
// Rendered through a portal into <body>, which is load-bearing rather than
// stylistic. The panel positions itself with `fixed inset-0`, and per CSS any
// ancestor carrying a non-`none` `transform` becomes the containing block for
// fixed descendants — at which point the "full screen" overlay is clipped to
// that ancestor's box instead of the viewport.
//
// This app trips that constantly: `animate-fade-up` is declared with fill mode
// `both`, so every element using it KEEPS `transform: translateY(0)` forever
// after the animation finishes. A dialog mounted anywhere inside a faded-up
// card or row would render trapped in that element's layer. The portal takes
// the panel out from under all of them.
// ============================================================================
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "./cn";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "lg",
  /**
   * Cap the panel at the viewport instead of letting it grow and scroll the
   * whole overlay. The body then becomes a flex column that hands its remaining
   * height to the child, so the child decides what (if anything) scrolls —
   * which is what a stepped form needs to keep its progress bar and buttons
   * permanently in view. Children are responsible for their own padding in
   * this mode.
   */
  fitViewport = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "md" | "lg" | "xl";
  fitViewport?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  // `document` doesn't exist during the server render, and a portal needs a
  // real node to target. Dialogs only ever open from a user action, so this
  // never costs a visible frame.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

  if (!open || !mounted) return null;

  const maxW = size === "md" ? "max-w-lg" : size === "xl" ? "max-w-3xl" : "max-w-2xl";

  return createPortal(
    /*
      Two elements, not one, so the panel can sit in the MIDDLE of the viewport
      without a tall panel becoming unreachable.

      Centring and scrolling fight each other in a single box: `items-center` on
      the element that also owns the overflow pushes the top of an over-tall
      child above the scroll origin, and no amount of scrolling brings it back.
      So the outer element scrolls and the inner one centres — at `min-h-full`
      it is exactly the viewport when the panel is short (centring applies) and
      exactly the panel when the panel is tall (centring is a no-op and the
      outer element scrolls normally).

      The backdrop is `fixed` rather than `absolute` for the same reason: it is
      a child of the SCROLLING element, so an absolute one would slide up and
      leave the page bare behind a scrolled dialog.
    */
    <div
      className={cn(
        "fixed inset-0 z-50",
        fitViewport ? "overflow-hidden" : "overflow-y-auto",
      )}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="fixed inset-0 h-full w-full cursor-default bg-slate-900/40 backdrop-blur-[2px] animate-fade-in"
      />
      <div
        className={cn(
          "relative flex min-h-full items-center justify-center p-4 sm:p-6",
          fitViewport && "h-full",
        )}
      >
        {/* Panel */}
        <div
          ref={panelRef}
          tabIndex={-1}
          className={cn(
            "relative w-full rounded-2xl border border-[var(--border-subtle)] bg-white shadow-card-hover outline-none animate-fade-up",
            maxW,
            fitViewport && "flex max-h-full flex-col",
          )}
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-4">
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
          <div className={cn(fitViewport ? "flex min-h-0 flex-1 flex-col" : "px-6 py-5")}>
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
