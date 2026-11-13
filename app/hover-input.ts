/**
 * Marks the root with `data-hover` while the pointer in use can hover, for
 * the `hover:` variant (app/globals.css).
 *
 * @remarks
 * `@media (hover: hover)` asks about the device's main pointer: on a phone
 * that is the finger, so a pen that hovers over it got no hover styles. A
 * mouse or a pen that moves with no button down sets the mark; a finger
 * press clears it, so a tap leaves no hover behind. Chrome's own hover
 * updates after a tap send no move, so they do not set it.
 */
export function trackHover() {
  const root = document.documentElement;
  const opts = { capture: true, passive: true };
  addEventListener(
    "pointermove",
    (e: PointerEvent) => {
      if (e.pointerType !== "touch" && !e.buttons) root.dataset.hover = "";
    },
    opts,
  );
  addEventListener(
    "pointerdown",
    (e: PointerEvent) => {
      if (e.pointerType === "touch") delete root.dataset.hover;
    },
    opts,
  );
}
