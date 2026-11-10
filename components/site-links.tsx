import { ThemeToggle } from "@/components/theme-toggle";
import githubMark from "@/app/assets/github-mark.svg";
import githubMarkWhite from "@/app/assets/github-mark-white.svg";

/** The GitHub link and the theme button, shown in every header. */
export function SiteLinks() {
  return (
    <>
      <a
        href="https://github.com/cr2007/chatgpt-heatmap-web"
        target="_blank"
        rel="noopener noreferrer"
        title="Open in GitHub"
        aria-label="Open in GitHub"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-white shadow-xs text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
      >
        {/* The theme class on <html> picks the mark, so the first render is right. */}
        <img
          aria-hidden
          src={githubMark}
          alt=""
          width={16}
          height={16}
          className="size-4 dark:hidden"
        />
        <img
          aria-hidden
          src={githubMarkWhite}
          alt=""
          width={16}
          height={16}
          className="hidden size-4 dark:block"
        />
      </a>
      <ThemeToggle />
    </>
  );
}
