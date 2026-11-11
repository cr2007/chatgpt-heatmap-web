import { Star } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import githubMark from "@/app/assets/github-mark.svg";
import githubMarkWhite from "@/app/assets/github-mark-white.svg";

/**
 * The GitHub link and the theme button, shown in every header. The link
 * asks for a star: the mark, a star and "Star". The page blocks every
 * network request, so it shows no live star count. On hover the star fills.
 */
export function SiteLinks() {
  return (
    <>
      <a
        id="github-link"
        href="https://github.com/cr2007/chatgpt-heatmap-web"
        target="_blank"
        rel="noopener noreferrer"
        title="Star the project on GitHub, or read the source"
        aria-label="Star on GitHub"
        className="group/star inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 text-sm font-medium text-zinc-700 shadow-xs transition-[background-color,color,scale] duration-(--dur-micro) ease-out hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-hidden active:scale-[0.97] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
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
        <Star
          aria-hidden="true"
          strokeWidth={1.75}
          className="size-3.5 transition-[fill,scale] duration-(--dur-micro) ease-out group-hover/star:scale-110 group-hover/star:fill-current"
        />
        {/* Hidden in a narrow bar (a phone, a fold pane); the name stays. */}
        <span className="hidden @sm:inline">Star</span>
      </a>
      <ThemeToggle />
    </>
  );
}
