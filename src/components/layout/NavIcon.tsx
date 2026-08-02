// ============================================================================
// VIEW LAYER — sidebar rail glyphs.
//
// The sidebar used to be text-only on purpose: labels carry the meaning and
// emoji beside them read as decoration. The collapsed rail changes that premise
// — when the panel is 56px wide there IS no label, so the glyph is the only
// wayfinding there is, and "which page am I on" has to survive the collapse.
//
// So: line icons, not emoji. They are stroked in `currentColor`, which means
// the active/muted colours already chosen for the labels apply to them with no
// extra rules, and they stay legible at 20px where an emoji does not.
//
// Pure presentation. No props beyond the name and a class hook.
// ============================================================================
import { cn } from "@/components/ui/cn";

export type NavIconName =
  | "home"
  | "book"
  | "users"
  | "chart"
  | "check"
  | "gear"
  | "help"
  | "cap"
  | "alert"
  | "desktop"
  | "layers"
  | "shield"
  | "logout";

// Path data only — every icon shares the 24-box, the stroke width and the caps,
// so a new one is one line here rather than a new <svg> with its own opinions.
const PATHS: Record<NavIconName, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5M9.5 20v-6h5v6" />,
  book: <path d="M4 4.5h6a3 3 0 0 1 3 3V20a2.5 2.5 0 0 0-2.5-2.5H4Zm16 0h-6a3 3 0 0 0-3 3V20a2.5 2.5 0 0 1 2.5-2.5H20Z" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 14.6a5.5 5.5 0 0 1 3 4.9" />
    </>
  ),
  chart: <path d="M4 20V4m0 16h16M8 16.5v-4m4 4v-8m4 8v-6m4 6V8" />,
  check: (
    <>
      <rect x="3.75" y="3.75" width="16.5" height="16.5" rx="3" />
      <path d="m8 12.2 2.7 2.7L16 9.6" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.8v2.4m0 13.6v2.4M21.2 12h-2.4M5.2 12H2.8m15-6.2-1.7 1.7M7.9 16.1l-1.7 1.7m0-12 1.7 1.7m8.2 8.7 1.7 1.7" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.75" />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .9-1 1.6v.4" />
      <path d="M12 17.1h.01" />
    </>
  ),
  cap: <path d="m2.8 8.6 9.2-4 9.2 4-9.2 4-9.2-4Zm3.4 1.9v5.2c0 1.6 2.6 2.9 5.8 2.9s5.8-1.3 5.8-2.9v-5.2M20.4 9.4v5" />,
  alert: (
    <>
      <path d="M10.6 3.9 2.5 18a1.6 1.6 0 0 0 1.4 2.4h16.2A1.6 1.6 0 0 0 21.5 18L13.4 3.9a1.6 1.6 0 0 0-2.8 0Z" />
      <path d="M12 9.3v4.2m0 3.1h.01" />
    </>
  ),
  desktop: (
    <>
      <rect x="2.75" y="4" width="18.5" height="12" rx="2" />
      <path d="M8.5 20h7m-3.5-4v4" />
    </>
  ),
  layers: <path d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3Zm8.5 9L12 16.5 3.5 12m17 4.5L12 21l-8.5-4.5" />,
  shield: (
    <>
      <path d="M12 3 4.5 6v6c0 4.2 3.1 7.6 7.5 9 4.4-1.4 7.5-4.8 7.5-9V6L12 3Z" />
      <path d="m9 12 2.2 2.2L15.4 10" />
    </>
  ),
  logout: <path d="M14.5 7.5V5.2a1.7 1.7 0 0 0-1.7-1.7H5.2A1.7 1.7 0 0 0 3.5 5.2v13.6a1.7 1.7 0 0 0 1.7 1.7h7.6a1.7 1.7 0 0 0 1.7-1.7v-2.3M9.8 12h10.7m0 0-3.2-3.2M20.5 12l-3.2 3.2" />,
};

export function NavIcon({
  name,
  className,
}: {
  name: NavIconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn("h-5 w-5 shrink-0", className)}
    >
      {PATHS[name]}
    </svg>
  );
}
