// VIEW LAYER — surface card. Padding is supplied by the consumer via className.
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "./cn";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function Card({ className, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-card",
          className,
        )}
        {...rest}
      />
    );
  },
);

export function CardLink({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-platform/40 hover:shadow-card-hover",
        className,
      )}
      {...rest}
    />
  );
}
