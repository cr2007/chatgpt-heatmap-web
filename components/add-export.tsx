import { useRef } from "react";
import { CircleQuestionMark, LoaderCircle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROVIDERS } from "@/lib/providers";
import type { Provider } from "@/lib/types";
import { ExportGuide } from "@/components/export-guide";

/** Safari before 17 has no Popover API: the help would show all the time. */
const HAS_POPOVER =
  typeof HTMLElement !== "undefined" && "popover" in HTMLElement.prototype;
/** Gap in px between the help button and its popover. */
const GAP = 8;

/**
 * The "Add export" file button and the "How to export" popover, once an
 * export is loaded. A provider that is not loaded yet comes first in the
 * steps.
 *
 * Step 1: The label opens the file picker; while files stream in it shows
 *         the share read.
 * Step 2: The help button opens a native popover (top layer, Escape and an
 *         outside click close it). Before it opens, it is placed under the
 *         button, right edges aligned, inside the button's fold pane (or
 *         the window), so it never lies across a fold.
 */
export function AddExport({
  progress,
  onFiles,
  loaded,
  className,
}: {
  /** Share of bytes read (0 to 1), or null when idle. */
  progress: number | null;
  onFiles: (files: FileList) => Promise<void>;
  /** The providers that have an export. */
  loaded: Provider[];
  className?: string;
}) {
  const help = useRef<HTMLButtonElement>(null);
  const reading = progress !== null;
  const order = [...PROVIDERS].sort(
    (a, b) => Number(loaded.includes(a.key)) - Number(loaded.includes(b.key)),
  );

  // Step 2
  function place(e: React.ToggleEvent<HTMLDivElement>) {
    if (e.newState !== "open" || !help.current) return;
    const b = help.current.getBoundingClientRect();
    const pane = help.current.closest(".fold-pane")?.getBoundingClientRect();
    const width = document.documentElement.clientWidth;
    const [left, right] = pane ? [pane.left, pane.right] : [0, width];
    const el = e.currentTarget;
    el.style.top = `${b.bottom + GAP}px`;
    el.style.right = `${width - Math.min(b.right, right - GAP)}px`;
    el.style.maxWidth = `${right - left - 2 * GAP}px`;
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Step 1 */}
      <label
        id="add-export"
        className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium whitespace-nowrap shadow-xs transition-[background-color,scale] duration-(--dur-micro) ease-out select-none hover:bg-zinc-100 active:scale-[0.97] has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-accent dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800"
      >
        {reading ? (
          <LoaderCircle
            aria-hidden="true"
            className="size-4 animate-spin text-accent"
            strokeWidth={1.75}
          />
        ) : (
          <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
        )}
        <span aria-live="polite" className="tabular-nums">
          {reading ? `Reading ${Math.round(progress * 100)}%` : "Add export"}
        </span>
        <input
          id="add-export-file"
          type="file"
          accept="application/json,.json"
          multiple
          className="sr-only"
          onChange={async (e) => {
            const input = e.currentTarget;
            if (input.files?.length) await onFiles(input.files);
            input.value = ""; // so picking the same file again fires onChange
          }}
        />
      </label>
      {HAS_POPOVER && (
        <button
          ref={help}
          type="button"
          popoverTarget="export-help"
          aria-label="How to export"
          title="How to export"
          className="inline-grid size-9 shrink-0 place-items-center rounded-md text-zinc-500 transition-[background-color,color,scale] duration-(--dur-micro) ease-out hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-hidden active:scale-[0.94] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        >
          <CircleQuestionMark
            aria-hidden="true"
            className="size-4"
            strokeWidth={1.75}
          />
        </button>
      )}
      {HAS_POPOVER && (
        <div
          id="export-help"
          popover="auto"
          aria-labelledby="export-help-title"
          onBeforeToggle={place}
          className="fixed inset-auto m-0 w-[min(24rem,calc(100vw-1rem))] origin-top-right rounded-xl border border-zinc-200 bg-white p-5 text-zinc-900 shadow-xl shadow-zinc-950/10 open:animate-pop-in dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:shadow-black/40"
        >
          <h2 id="export-help-title" className="text-base font-semibold">
            How to export
          </h2>
          <ExportGuide
            providers={order}
            idPrefix="export-help"
            className="mt-4 flex flex-col gap-6"
          />
        </div>
      )}
    </div>
  );
}
