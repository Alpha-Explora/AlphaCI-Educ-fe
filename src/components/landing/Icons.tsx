// ============================================================================
// VIEW LAYER — landing icon registry.
//
// Every glyph on the front door resolves through this file. Two reasons:
//
//   1. The page used to use emoji. Emoji are not a design system: they render
//      differently on every OS, they cannot take a brand colour, and they read
//      as decoration rather than as UI. These are vector icons that inherit
//      `currentColor`, so they re-theme with the palette like everything else.
//
//   2. One family, one weight, one import site. Swapping icon libraries later
//      is an edit to this file, not a sweep through the view layer.
//
// Imported per-icon from `dist/ssr` rather than from the package root: the
// root barrel pulls in the entire ~1,500-icon set, which the bundler cannot
// reliably shake out of a client component. The `*Icon` suffix is the current
// export name; the bare `SealCheck` form still resolves but is deprecated.
// ============================================================================
import { UploadSimpleIcon } from "@phosphor-icons/react/dist/ssr/UploadSimple";
import { GearIcon } from "@phosphor-icons/react/dist/ssr/Gear";
import { SealCheckIcon } from "@phosphor-icons/react/dist/ssr/SealCheck";
import { GraduationCapIcon } from "@phosphor-icons/react/dist/ssr/GraduationCap";
import { HammerIcon } from "@phosphor-icons/react/dist/ssr/Hammer";
import { FlaskIcon } from "@phosphor-icons/react/dist/ssr/Flask";
import { CodeIcon } from "@phosphor-icons/react/dist/ssr/Code";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import type { Icon } from "@phosphor-icons/react";

/** The weight every landing icon uses. Mixing weights is what makes an icon
 *  set look assembled rather than designed. */
export const ICON_WEIGHT = "duotone" as const;

/**
 * Keyed so `src/config/brand.ts` can name an icon as a plain string and stay
 * a data file with no React import.
 */
export const LANDING_ICONS: Record<string, Icon> = {
  // Pipeline stages
  push: UploadSimpleIcon,
  run: GearIcon,
  feedback: SealCheckIcon,
  // What a run checks
  build: HammerIcon,
  test: FlaskIcon,
  lint: CodeIcon,
  deadline: ClockIcon,
  // General
  school: GraduationCapIcon,
};
