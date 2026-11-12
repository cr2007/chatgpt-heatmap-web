import { useSyncExternalStore } from "react";

/**
 * Follows a media query; re-renders when the match changes.
 *
 * @param query - A CSS media query, for example `DESKTOP_QUERY`.
 * @returns True while `query` matches.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia | MDN: matchMedia}
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
  );
}
