import { Moon, Sun } from "lucide-react";
import { useThemeToggle } from "@/hooks/use-theme-toggle";

/**
 * One button that flips between light and dark. It shows the current
 * theme's icon; the `dark` class on <html> picks it, so the first render is
 * right. The icon does not animate: it changes in the same frame as the page.
 */
export function ThemeToggle() {
  const { isDark, toggle } = useThemeToggle();
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      aria-label={label}
      title={`${label} (D)`}
      onClick={toggle}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-white shadow-xs transition-[background-color,scale] duration-150 hover:bg-neutral-100 active:scale-[0.97] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:bg-neutral-800 dark:focus-visible:ring-violet-400"
    >
      <Sun aria-hidden="true" className="size-4 dark:hidden" />
      <Moon aria-hidden="true" className="hidden size-4 dark:block" />
    </button>
  );
}
