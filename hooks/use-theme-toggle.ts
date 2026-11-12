import { useSyncExternalStore } from "react";

/** "system" follows the computer's theme. */
type Preference = "light" | "dark" | "system";

/** localStorage key; next-themes used the same one, so saved choices carry over. */
const KEY = "theme";
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
const listeners = new Set<() => void>();

/**
 * Reads the saved choice.
 *
 * @returns "light" or "dark" when saved; anything else (or no storage)
 *   gives "system".
 */
function readPreference(): Preference {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

let preference = readPreference();

/** True when the page shows the dark theme. */
const isDark = () =>
  preference === "dark" || (preference === "system" && systemDark.matches);

/**
 * Puts the theme on <html>: the `dark` class for Tailwind and `color-scheme`
 * for form controls and scroll bars.
 *
 * @see app/globals.css, for the `.theme-switching` rule.
 */
function apply() {
  const root = document.documentElement;
  // Step 1: Pause all transitions, so every color changes at once (see
  // app/globals.css).
  root.classList.add("theme-switching");
  // Step 2: Set the class and the color scheme.
  root.classList.toggle("dark", isDark());
  root.style.colorScheme = isDark() ? "dark" : "light";
  // Step 3: Resume transitions after the new theme is painted. Removing the
  // class costs a second style pass; after the paint it does not delay the switch.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => root.classList.remove("theme-switching")),
  );
  // Step 4: Tell the subscribed components.
  listeners.forEach((listener) => listener());
}

apply(); // At import, before React's first render, so the first paint is right.
systemDark.addEventListener("change", () => {
  if (preference === "system") apply();
});

/**
 * Flips between light and dark.
 *
 * @remarks
 * A flip that lands back on the computer's theme returns to "system", so a
 * later change of the computer's theme (for example at sunset) still
 * applies.
 */
function toggle() {
  const next = isDark() ? "light" : "dark";
  preference =
    next === (systemDark.matches ? "dark" : "light") ? "system" : next;
  try {
    if (preference === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, preference);
  } catch {}
  apply();
}

/**
 * Adds a theme listener, for `useSyncExternalStore`.
 *
 * @param listener - Called after each theme change.
 * @returns A function that removes the listener.
 * @see {@link https://react.dev/reference/react/useSyncExternalStore | useSyncExternalStore}
 */
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Gives the current theme and the flip, for the theme button and the "d" key.
 *
 * @returns `isDark`, true when the page shows the dark theme ({@link isDark}),
 *   and `toggle`, the flip that the theme button and the "d" key use
 *   ({@link toggle}).
 */
export function useThemeToggle() {
  return { isDark: useSyncExternalStore(subscribe, isDark), toggle };
}
