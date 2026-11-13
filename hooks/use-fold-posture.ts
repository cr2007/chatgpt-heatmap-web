import { useSyncExternalStore } from "react";
import { FOLDED_QUERY, foldPosture, type Posture } from "@/lib/layout";

/** The Viewport Segments API (Chrome 138 and later); not in the DOM types yet. */
type WithSegments = { viewport?: { segments?: DOMRect[] } };

/**
 * Reads the posture now ({@link foldPosture} decides).
 *
 * @returns "book" or "tent", or undefined for one screen.
 */
const read = (): Posture | undefined =>
  foldPosture(
    (window as unknown as WithSegments).viewport?.segments,
    matchMedia(FOLDED_QUERY).matches,
    matchMedia("(orientation: portrait)").matches,
  );

/**
 * Listens for a posture change.
 *
 * @remarks
 * A fold, an unfold or a turn changes the window size or the posture query.
 *
 * @param onChange - Called on each such change.
 * @returns A function that removes the listeners.
 */
function subscribe(onChange: () => void) {
  const mql = matchMedia(FOLDED_QUERY);
  window.addEventListener("resize", onChange);
  mql.addEventListener("change", onChange);
  return () => {
    window.removeEventListener("resize", onChange);
    mql.removeEventListener("change", onChange);
  };
}

/**
 * Follows the posture of a half-open foldable; re-renders when it changes.
 *
 * @returns "book" or "tent", or undefined for one screen.
 * @see {@link foldPosture}
 * @see {@link https://www.w3.org/TR/device-posture/ | W3C Device Posture API}
 */
export const useFoldPosture = () => useSyncExternalStore(subscribe, read);
