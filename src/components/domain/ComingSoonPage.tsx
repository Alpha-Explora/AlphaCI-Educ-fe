"use client";
// VIEW LAYER — shared placeholder for navigation destinations that are part of
// the information architecture but not implemented yet. Honest by design: it
// says plainly that the area isn't available rather than faking content.
import { Card, EmptyState } from "@/components/ui";

export function ComingSoonPage({
  title,
  subtitle,
  icon,
  note,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly icon: string;
  readonly note: string;
}) {
  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-semibold text-[var(--text-strong)]">{title}</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>
      </div>

      <Card className="p-8 animate-fade-up">
        <EmptyState icon={icon} title="Not available yet" description={note} />
      </Card>
    </div>
  );
}
