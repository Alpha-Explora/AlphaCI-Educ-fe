// VIEW LAYER — one of the two "who are you?" entry cards on the landing page.
// Pure presentation, no state.
//
// The whole card is a single <Link>, not a div containing one: a card-shaped
// click target that isn't a link gives keyboard users nothing to tab to, and
// nesting a link inside a clickable div produces two tab stops for one action.
import Link from "next/link";
import { cn } from "@/components/ui/cn";

export function SignInDoorCard({
  href,
  icon,
  title,
  description,
  bullets,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  bullets: string[];
  /** `primary` gets the blue treatment; `neutral` stays white. */
  tone: "primary" | "neutral";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col rounded-card border bg-white p-6 text-left shadow-card transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-lift",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform",
        tone === "primary"
          ? "border-platform-200 hover:border-platform-400"
          : "border-[var(--border-subtle)] hover:border-[var(--border-strong)]",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid h-12 w-12 place-items-center rounded-xl text-xl",
          tone === "primary"
            ? "bg-platform-50 text-platform-700 ring-1 ring-platform-100"
            : "bg-[var(--bg-subtle)] text-[var(--text-strong)] ring-1 ring-[var(--border-subtle)]",
        )}
      >
        {icon}
      </span>

      <h2 className="mt-4 text-lg font-semibold text-[var(--text-strong)]">{title}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">
        {description}
      </p>

      <ul className="mt-4 space-y-1.5">
        {bullets.map((bullet) => (
          <li
            key={bullet}
            className="flex items-start gap-2 text-sm text-[var(--text-muted)]"
          >
            <span aria-hidden="true" className="mt-0.5 text-platform-500">
              ✓
            </span>
            {bullet}
          </li>
        ))}
      </ul>

      <span
        className={cn(
          "mt-6 inline-flex items-center gap-1.5 text-sm font-semibold",
          tone === "primary" ? "text-platform-700" : "text-[var(--text-strong)]",
        )}
      >
        Continue
        <span
          aria-hidden="true"
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        >
          →
        </span>
      </span>
    </Link>
  );
}
