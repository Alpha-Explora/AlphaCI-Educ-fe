// ============================================================================
// VIEW LAYER — the room the pass hangs in.
//
// Background field plus three slowly drifting blobs, and nothing else. It is
// its own component rather than a wrapper div in AuthShell because it is the
// one piece of this page a school is most likely to want to change, and it
// should be findable without reading a layout file.
//
// The drift is CSS, not GSAP: it never needs to respond to anything, and a
// keyframe animation on a transform costs no JavaScript at all. The rules
// keeping it out of the form's way — minutes-long cycles, transform only, no
// blur — are documented in AuthScene.module.css next to the values.
//
// `overflow-x-hidden` is load-bearing, not tidiness: the drifting blobs are
// deliberately larger than the viewport and travel past its edges, and without
// it they would grow the document and hand the page a horizontal scrollbar.
// (It also used to contain a pass that could be swung past its own column;
// that interaction is gone, but the blobs alone still need this.) The Y axis
// stays scrollable so a short landscape viewport can still reach the form.
// ============================================================================
import { cn } from "@/components/ui/cn";
import styles from "./AuthScene.module.css";

export function AuthScene({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(styles.scene, "relative min-h-dvh overflow-x-hidden", className)}>
      <div className={styles.aurora} aria-hidden="true">
        <span className={styles.blobBrand} />
        <span className={styles.blobGrape} />
        <span className={styles.blobMint} />
      </div>
      {children}
    </div>
  );
}
