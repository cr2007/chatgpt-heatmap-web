import { ThemeToggle } from "@/components/theme-toggle";
import githubMark from "@/app/assets/github-mark.svg";
import githubMarkWhite from "@/app/assets/github-mark-white.svg";

/** The GitHub link and the theme button, shown in every header. */
export function SiteLinks() {
  return (
    <>
      <a
        id="github-link"
        href="https://github.com/cr2007/chatgpt-heatmap-web"
        target="_blank"
        rel="noopener noreferrer"
        title="Open in GitHub"
        aria-label="Open in GitHub"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white shadow-xs text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
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
