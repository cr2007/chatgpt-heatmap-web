import type { ReactNode } from "react";
import type { Posture } from "@/lib/layout";

/**
 * A half-open foldable as two screens, not one big one.
 *
 * It has one pane per screen half, each scrolling on its own, with the
 * hinge between them (the grid tracks come from the viewport segments, see
 * `.fold-layout` in app/globals.css). Nothing sits on the fold.
 *
 * @see app/globals.css for the pane tracks.
 */
export function FoldLayout({
  posture,
  controls,
  content,
  swap = false,
}: {
  /** Book (side by side) or tent (top and bottom halves); see {@link Posture}. */
  posture: Posture;
  /** The top bar and the main content. Book posture: the left pane, or the
   *  right with `swap`. Tent posture: the bottom half, which lies flat and
   *  is within thumb reach (Samsung's Flex mode guidance). */
  controls: ReactNode;
  /** The calendar. Tent posture: the top half, which faces the eyes. */
  content: ReactNode;
  /**
   * Book posture only: the controls on the right, for the other hand.
   *
   * @defaultValue false
   */
  swap?: boolean;
}) {
  return (
    <div
      id="fold-layout"
      data-posture={posture}
      data-swap={(posture === "book" && swap) || undefined}
      className="fold-layout"
    >
      <div id="fold-controls" className="fold-pane fold-pane-controls">
        {controls}
      </div>
      <div id="fold-content" className="fold-pane">
        {content}
      </div>
    </div>
  );
}
