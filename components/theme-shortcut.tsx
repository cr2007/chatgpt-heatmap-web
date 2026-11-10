import { useEffect } from "react";
import { useTheme } from "next-themes";

/** True when the key press belongs to a field or control, not to the page. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.closest(
      "input, textarea, select, [role=combobox], [role=listbox]",
    ) !== null
  );
}

/**
 * Toggles light and dark with the "d" key.
 *
 * Step 1: Ignore modified keys (Ctrl+D bookmarks, Cmd+D), held keys and
 *         presses inside fields.
 * Step 2: Flip the theme the user sees, so "system" also toggles at once.
 */
export function ThemeShortcut() {
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Step 1
      if (e.key !== "d" || e.repeat || e.ctrlKey || e.metaKey || e.altKey)
        return;
      if (isTypingTarget(e.target)) return;
      // Step 2
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [resolvedTheme, setTheme]);

  return null;
}
