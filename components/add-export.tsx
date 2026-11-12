import { useRef } from "react";
import { CircleQuestionMark, LoaderCircle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROVIDERS } from "@/lib/providers";
import type { Provider } from "@/lib/types";
import { ExportGuide } from "@/components/export-guide";

/**
 * Safari before 17 has no Popover API: the help would show all the time.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Popover_API
 */
const HAS_POPOVER =
  typeof HTMLElement !== "undefined" && "popover" in HTMLElement.prototype;
/** Gap in px between the help button and its popover. */
const GAP = 8;
/** A mouse rests this long (ms) on the help button before the help opens,
 *  so a pointer that only passes over it opens nothing. */
const HOVER_OPEN = 300;
/** The help stays this long (ms) after the mouse leaves, so the pointer can
 *  cross the gap into it. */
const HOVER_CLOSE = 200;

/**
 * The "Add export" file button and the "How to export" popover.
 *
 * It shows once an export is loaded. A provider that is not loaded yet comes
 * first in the steps.
 *
 * @see {@link ExportGuide} for the steps in the popover.
 */
export function AddExport({
  progress,
  onFiles,
  loaded,
  className,
}: {
  /** Share of bytes read (0 to 1), or null when idle. */
  progress: number | null;
  /** Reads the picked files; the input clears after it settles. */
  onFiles: (files: FileList) => Promise<unknown>;
  /** The providers that have an export. */
  loaded: Provider[];
  /** Classes for the row that holds the button and the help. */
  className?: string;
}) {
  const help = useRef<HTMLButtonElement>(null);
  /** The help is open because a mouse rests on it (not clicked open). */
  const byHover = useRef(false);
  /** About to open the help (by a programmatic click), so the click is not
   *  a pin. */
  const opening = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reading = progress !== null;
  const order = [...PROVIDERS].sort(
    (a, b) => Number(loaded.includes(a.key)) - Number(loaded.includes(b.key)),
  );

  // Step 2: The help is a native popover, placed under the button, right edges
  // aligned, inside the button's fold pane (or the window), never across a fold.
  /**
   * Places the help {@link GAP} px under its button before it opens.
   *
   * @param e - The help's toggle event; only a change to "open" places it.
   */
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

  // Step 3: A mouse that rests on the help button opens it too. Touch and the
  // keyboard open it by a press only.
  /**
   * Opens the help after a mouse rests on the button or the help for
   * {@link HOVER_OPEN} ms, or keeps it open.
   *
   * @param e - The pointer event; a pointer that is not a mouse is ignored.
   */
  function hoverIn(e: React.PointerEvent) {
    if (e.pointerType !== "mouse") return;
    clearTimeout(timer.current);
    const pop = document.getElementById("export-help");
    if (pop?.matches(":popover-open")) return;
    timer.current = setTimeout(() => {
      // A click opens it through the button, so the button stays its
      // invoker: a later click on the button is inside, not a light dismiss.
      byHover.current = true;
      opening.current = true;
      help.current?.click();
      opening.current = false;
    }, HOVER_OPEN);
  }
  // Step 3.1: It closes when the mouse leaves the button and the help.
  /**
   * Closes a hover-opened help {@link HOVER_CLOSE} ms after the mouse leaves
   * the button or the help.
   *
   * @param e - The pointer event; a pointer that is not a mouse is ignored.
   */
  function hoverOut(e: React.PointerEvent) {
    if (e.pointerType !== "mouse") return;
    clearTimeout(timer.current);
    if (!byHover.current) return;
    timer.current = setTimeout(() => {
      const pop = document.getElementById("export-help");
      if (pop?.matches(":popover-open")) pop.hidePopover();
    }, HOVER_CLOSE);
  }
  // Step 3.2: A click keeps it open, so it never closes what the user reads.
  /**
   * Keeps a hover-opened help open after a real click, as if clicked open.
   *
   * @param e - The click on the help button.
   */
  function pin(e: React.MouseEvent) {
    clearTimeout(timer.current);
    if (opening.current || !byHover.current) return;
    e.preventDefault(); // cancels the popover toggle, which would close it
    byHover.current = false;
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Step 1: The label opens the file picker; while files stream in, it
          shows the share read. */}
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
          id="export-help-button"
          type="button"
          onPointerEnter={hoverIn}
          onPointerLeave={hoverOut}
          onClick={pin}
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
          onToggle={(e) => {
            if (e.newState === "open") return;
            byHover.current = false;
            clearTimeout(timer.current);
          }}
          onPointerEnter={hoverIn}
          onPointerLeave={hoverOut}
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
