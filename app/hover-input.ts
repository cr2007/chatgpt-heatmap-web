/**
 * After this long (ms) with no move of a hovering pen, the pen has left.
 *
 * @remarks
 * Chrome on Android sends no exit event when a pen lifts out of hover range:
 * no pointerout, no pointerleave, and its own mouse takes the pen's last
 * place. A trace of a hovering pen had a move every 17 ms (median), 99% of
 * the gaps under 123 ms and 3 gaps of 150 to 183 ms. A pen held quite still
 * longer loses the hover until its next move.
 */
const PEN_GONE = 250;

/** Sent on `window` when a hover ends: a pen left, or a finger pressed. */
export const HOVER_END = "hoverend";

/** True while the pointer in use can hover (see {@link trackHover}). */
export const hovering = () =>
  document.documentElement.hasAttribute("data-hover");

/**
 * Marks the root with `data-hover` while the pointer in use can hover, for
 * the `hover:` variant (app/globals.css), and sends {@link HOVER_END} when
 * that stops.
 *
 * @remarks
 * `@media (hover: hover)` asks about the device's main pointer: on a phone
 * that is the finger, so a pen that hovers over it got no hover styles. A
 * mouse or a pen that moves with no button down sets the mark. A finger
 * press clears it, so a tap leaves no hover behind (Chrome's own hover
 * updates after a tap send no move, so they do not set it). A pen that goes
 * quiet for {@link PEN_GONE} ms clears it too, but not while it presses the
 * screen; a still mouse keeps it.
 */
export function trackHover() {
  const root = document.documentElement;
  const opts = { capture: true, passive: true };
  let gone: ReturnType<typeof setTimeout> | undefined;
  const end = () => {
    clearTimeout(gone);
    if (!hovering()) return;
    delete root.dataset.hover;
    dispatchEvent(new Event(HOVER_END));
  };
  addEventListener(
    "pointermove",
    (e: PointerEvent) => {
      if (e.pointerType === "touch" || e.buttons) return;
      root.dataset.hover = "";
      clearTimeout(gone);
      if (e.pointerType === "pen") gone = setTimeout(end, PEN_GONE);
    },
    opts,
  );
  addEventListener(
    "pointerdown",
    (e: PointerEvent) => {
      if (e.pointerType === "touch") end();
      // A pen on the screen sends no move while it rests, but it is there.
      if (e.pointerType === "pen") clearTimeout(gone);
    },
    opts,
  );
  addEventListener(
    "pointerup",
    (e: PointerEvent) => {
      // It lifts: hover moves follow, or nothing if it left the range.
      if (e.pointerType === "pen" && hovering())
        gone = setTimeout(end, PEN_GONE);
    },
    opts,
  );
}
