// VIEW LAYER — button primitive with variants + loading state.
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "./cn";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "github";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-platform text-white hover:bg-platform-700 active:bg-platform-800 disabled:bg-platform/50",
  secondary:
    "bg-white text-[var(--text-strong)] border border-[var(--border-subtle)] hover:bg-slate-50 active:bg-slate-100",
  ghost:
    "bg-transparent text-[var(--text-muted)] hover:bg-slate-100 hover:text-[var(--text-strong)]",
  danger: "bg-danger text-white hover:brightness-95 active:brightness-90",
  github:
    "bg-github text-white hover:bg-github-soft active:brightness-95",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, disabled, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform disabled:cursor-not-allowed",
        size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2.5 text-sm",
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
});
