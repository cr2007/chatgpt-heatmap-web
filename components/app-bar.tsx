import type { ReactNode } from "react";
import { SiteLinks } from "@/components/site-links";

/**
 * The top bar on every screen: the app name, then `children` (the loaded
 * exports and the time zone), then the GitHub link and the theme button.
 * `below` sits under the bar row, inside the header (the phone's export
 * panel). While files are read, a thin line on the bottom edge fills up.
 */
export function AppBar({
  children,
  below,
  progress = null,
  uploads = 0,
}: {
  children?: ReactNode;
  below?: ReactNode;
  /** Share of bytes read (0 to 1), or null when idle. */
  progress?: number | null;
  /** Upload count; a new value starts the progress line empty. */
  uploads?: number;
}) {
  return (
    <header
      id="app-bar"
      className="sticky top-0 z-20 border-b border-zinc-200/80 bg-zinc-50/85 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80"
    >
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center gap-3 px-5 sm:px-8">
        <h1
          id="app-title"
          className="mr-2 shrink-0 text-lg font-semibold tracking-tight"
        >
          AI Chat Heatmap
        </h1>
        <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>
        <div id="site-links" className="flex shrink-0 items-center gap-2">
          <SiteLinks />
        </div>
      </div>
      {below}
      <span
        key={uploads}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -bottom-px h-0.5 origin-left bg-accent transition-[scale,opacity] duration-(--dur-ui) ease-out"
        style={{
          scale: `${progress ?? 1} 1`,
          opacity: progress === null ? 0 : 1,
        }}
      />
    </header>
  );
}
