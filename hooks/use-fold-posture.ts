import { useSyncExternalStore } from "react";
import { FOLDED_QUERY, foldPosture, type Posture } from "@/lib/layout";

/** The Viewport Segments API (Chrome 138 and later); not in the DOM types yet. */
type WithSegments = { viewport?: { segments?: DOMRect[] } };

/** Reads the posture now (lib/layout.ts `foldPosture` decides). */
const read = (): Posture | undefined =>
  foldPosture(
    (window as unknown as WithSegments).viewport?.segments,
    matchMedia(FOLDED_QUERY).matches,
    matchMedia("(orientation: portrait)").matches,
  );

/** A fold, an unfold or a turn changes the window size or the posture query. */
function subscribe(onChange: () => void) {
  const mql = matchMedia(FOLDED_QUERY);
  window.addEventListener("resize", onChange);
  mql.addEventListener("change", onChange);
  return () => {
    window.removeEventListener("resize", onChange);
    mql.removeEventListener("change", onChange);
  };
}

/** The posture of a half-open foldable, or undefined for one screen. */
export const useFoldPosture = () => useSyncExternalStore(subscribe, read);
