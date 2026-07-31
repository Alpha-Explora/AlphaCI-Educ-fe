"use client";
// ============================================================================
// VIEW LAYER — one class section, in the colour its teacher chose.
//
// A teacher looks at these several times a day and knows them by cohort, not by
// section letter ("the Tuesday group"). So unlike a course card, which wears
// the school's colour, this one is theirs to set: the palette button in the
// corner writes to useClassCardThemes, and every card for that class repaints
// at once — including the copy in another list on the same page.
//
// TWO INTERACTIONS, ONE CARD, NO NESTED BUTTONS
// The whole card opens the class AND the corner opens a picker. A <button>
// inside an <a> is invalid HTML and unreachable by keyboard, so the card is a
// plain <article>: the link is a stretched, transparent overlay over the
// non-interactive content, and the picker sits on a layer above it. Both are
// real, separately tabbable controls.
//
// Colour is decoration on top of a readable card, never the thing carrying the
// meaning: the section, term and counts all still read in ink that clears AA on
// whichever tint is picked (see config/cardThemes.ts).
// ============================================================================
import { useState } from "react";
import Link from "next/link";
import { CardDecor, GenericPill, cn, patternFor } from "@/components/ui";
import { CARD_THEMES, type CardTheme } from "@/config/cardThemes";
import { useClassCardThemes } from "@/viewmodels/useClassCardTheme";
import type { TeacherClass } from "@/viewmodels/useTeacherCourseBoard";

function ColorPicker({
  label,
  theme,
  chosenId,
  onPick,
}: Readonly<{
  /** The class's display name, for the accessible label. */
  label: string;
  theme: CardTheme;
  chosenId: string | null;
  onPick: (themeId: string) => void;
}>) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Change the colour of ${label}`}
        title="Change colour"
        className="flex h-7 w-7 items-center justify-center rounded-full border border-white/70 bg-white/80 opacity-70 shadow-sm backdrop-blur transition-opacity hover:opacity-100 focus-visible:opacity-100"
      >
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-black/10"
          style={{ background: theme.accent }}
        />
      </button>

      {open && (
        <>
          {/* Click-anywhere-else to dismiss. A button, not a div, so Escape and
              a screen reader both have a way out of the popover. */}
          <button
            type="button"
            aria-label="Close colour picker"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div className="absolute right-0 top-9 z-40 rounded-xl border border-[var(--border-subtle)] bg-white p-2 shadow-card-hover animate-fade-up">
            <p className="px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
              Card colour
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {CARD_THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-label={t.label}
                  aria-pressed={chosenId === t.id}
                  title={t.label}
                  onClick={() => {
                    onPick(t.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "h-7 w-7 rounded-lg ring-1 ring-inset ring-black/10 transition-transform hover:scale-110",
                    chosenId === t.id && "ring-2 ring-offset-2 ring-[var(--text-strong)]",
                  )}
                  style={{ background: t.accent }}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function ClassCard({
  classInfo: c,
  fromLabName = null,
  index = 0,
}: Readonly<{
  classInfo: TeacherClass;
  /** Set when this section's course is owned by a DIFFERENT laboratory. */
  fromLabName?: string | null;
  index?: number;
}>) {
  const themes = useClassCardThemes();
  const theme = themes.themeFor(c.id);

  return (
    <article
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border p-5 pt-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover animate-fade-up"
      style={{
        background: `linear-gradient(135deg, ${theme.tint} 0%, ${theme.tint} 45%, #ffffff 100%)`,
        borderColor: theme.line,
        animationDelay: `${index * 50}ms`,
      }}
    >
      <CardDecor pattern={patternFor(c.id)} ink={theme.patternInk} />
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: theme.accent }}
      />

      {/* The stretched link. Sits above the content but below the picker, and
          carries no visible text of its own — the heading below is what a
          sighted user reads. */}
      <Link
        href={`/teacher/classes/${c.id}`}
        aria-label={`Open ${c.code} Section ${c.section}`}
        className="absolute inset-0 z-10 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-platform"
      />

      <div className="relative flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Drawn on `ink`, not on `accent`: white on a mid-tone accent (amber,
              cyan) is around 3:1, which fails AA for a label this size. The
              900-level ink keeps every theme's chip legible and still obviously
              that theme's colour. */}
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm"
            style={{ background: theme.ink }}
          >
            Section {c.section}
          </span>
          {c.pendingGrading > 0 && (
            <GenericPill tone="warning">{c.pendingGrading} to grade</GenericPill>
          )}
        </div>
        {/* z-20: above the stretched link, or the link would swallow the click. */}
        <div className="relative z-20 shrink-0">
          <ColorPicker
            label={`${c.code} Section ${c.section}`}
            theme={theme}
            chosenId={themes.chosenIdFor(c.id)}
            onPick={(themeId) => themes.setTheme(c.id, themeId)}
          />
        </div>
      </div>

      <h3 className="relative mt-2 text-base font-semibold" style={{ color: theme.ink }}>
        {c.name}
      </h3>
      <p className="relative mt-0.5 text-xs" style={{ color: theme.inkSoft }}>
        {c.term}
      </p>
      {fromLabName && (
        <p className="relative mt-0.5 text-xs" style={{ color: theme.inkSoft }}>
          From <span className="font-medium">{fromLabName}</span>
        </p>
      )}

      <div className="relative mt-auto flex gap-6 pt-5">
        {[
          { label: "Students", value: c.studentCount },
          { label: "Assignments", value: c.assignmentCount },
        ].map((stat) => (
          <div key={stat.label} className="min-w-0">
            <p
              className="text-[11px] font-medium uppercase tracking-wide"
              style={{ color: theme.inkSoft }}
            >
              {stat.label}
            </p>
            <p
              className="mt-0.5 text-2xl font-semibold tabular-nums"
              style={{ color: theme.ink }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <span
        className="relative mt-4 inline-flex items-center gap-1 text-sm font-medium"
        style={{ color: theme.inkSoft }}
      >
        Open section
        <span
          aria-hidden="true"
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        >
          →
        </span>
      </span>
    </article>
  );
}
