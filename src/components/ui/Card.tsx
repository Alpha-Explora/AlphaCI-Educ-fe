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

/**
 * A domain panel's own surface — or nothing, when the page already opened one.
 *
 * Every panel in this product draws its own card, which is right when the panel
 * IS the page's content. The student workspace no longer works that way: its tab
 * strip sits at the top of the page and one container below holds the workspace
 * header and whichever tab is open, so a panel that still drew a card would put
 * a second border and a second shadow one padding-width inside the first.
 *
 * A PROP AND NOT A CONTEXT, deliberately. Inferring "am I inside a card?" from a
 * provider would silently restyle any panel that a future page happens to nest,
 * and the failure would be invisible at the call site. Here the page that owns
 * the surface is the page that says so.
 *
 * `surface` defaults to true, so every existing call site — including the teacher
 * workspace, which shares these panels and keeps its own layout — is unchanged.
 */
export function PanelSurface({
  surface = true,
  className,
  children,
}: Readonly<{
  surface?: boolean;
  /** Applied either way; the card adds its own padding on top. */
  className?: string;
  children: React.ReactNode;
}>) {
  if (!surface) return <div className={className}>{children}</div>;
  return <Card className={cn("p-5", className)}>{children}</Card>;
}

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
