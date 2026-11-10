import { useSyncExternalStore } from "react";

/** "system" follows the computer's theme. */
type Preference = "light" | "dark" | "system";

/** localStorage key; next-themes used the same one, so saved choices carry over. */
const KEY = "theme";
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
const listeners = new Set<() => void>();

/** Reads the saved choice; anything else (or no storage) means "system". */
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
 * Step 1: Pause all transitions, so every color changes at once.
 * Step 2: Set the class and the color scheme.
 * Step 3: Resume transitions after the new theme is painted. Removing the
 *         class costs a second style pass; after the paint it does not
 *         delay the switch.
 * Step 4: Tell the subscribed components.
 */
function apply() {
  const root = document.documentElement;
  root.classList.add("theme-switching"); // Step 1 (see app/globals.css)
  root.classList.toggle("dark", isDark()); // Step 2
  root.style.colorScheme = isDark() ? "dark" : "light";
  requestAnimationFrame(() =>
    requestAnimationFrame(() => root.classList.remove("theme-switching")),
  ); // Step 3
  listeners.forEach((listener) => listener()); // Step 4
}

apply(); // At import, before React's first render, so the first paint is right.
systemDark.addEventListener("change", () => {
  if (preference === "system") apply();
});

/**
 * Flips between light and dark. A flip that lands back on the computer's
 * theme returns to "system", so a later change of the computer's theme
 * (for example at sunset) still applies.
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

/** Adds a theme listener and returns its removal (for useSyncExternalStore). */
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The current theme and the flip used by the theme button and the "d" key. */
export function useThemeToggle() {
  return { isDark: useSyncExternalStore(subscribe, isDark), toggle };
}
