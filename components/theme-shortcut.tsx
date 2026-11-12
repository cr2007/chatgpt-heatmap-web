import { useEffect } from "react";
import { useThemeToggle } from "@/hooks/use-theme-toggle";

/**
 * Tells if a key press belongs to a field or control, not to the page.
 *
 * @param target - the target of the key event
 * @returns true for an editable element, a form field or a combobox
 */
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
 * It draws nothing.
 *
 * @see {@link useThemeToggle}
 * @see {@link isTypingTarget}
 */
export function ThemeShortcut() {
  const { toggle } = useThemeToggle();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Step 1: Ignore modified keys (Ctrl+D bookmarks, Cmd+D), held keys and
      // presses inside fields.
      if (e.key !== "d" || e.repeat || e.ctrlKey || e.metaKey || e.altKey)
        return;
      if (isTypingTarget(e.target)) return;
      // Step 2: Flip the theme the user sees (see useThemeToggle).
      toggle();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);

  return null;
}
