import type { ReactNode } from "react";
import type { Posture } from "@/lib/layout";

/**
 * A half-open foldable as two screens, not one big one: one pane per screen
 * half, each scrolling on its own, with the hinge between them (the grid
 * tracks come from the viewport segments, see `.fold-layout` in
 * app/globals.css). Nothing sits on the fold.
 *
 * `controls` (the top bar and the main content) goes on the left in book
 * posture, or on the right with `swap`; in tent posture it goes on the
 * bottom half, which lies flat and is within thumb reach, and `content` on
 * the top half, which faces the eyes (Samsung's Flex mode guidance).
 */
export function FoldLayout({
  posture,
  controls,
  content,
  swap = false,
}: {
  posture: Posture;
  controls: ReactNode;
  content: ReactNode;
  /** Book posture only: the controls on the right, for the other hand. */
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
