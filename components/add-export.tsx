import { useEffect, useRef, useState } from "react";
import { CircleQuestionMark, LoaderCircle, Plus } from "lucide-react";
import { PROVIDERS } from "@/lib/providers";
import type { Provider } from "@/lib/types";
import { ExportGuide } from "@/components/export-guide";
import { HOVER_END, hovering } from "@/app/hover-input";
import { cn } from "@/lib/utils";

/**
 * Safari before 17 has no Popover API: the help would show all the time.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Popover_API
 */
const HAS_POPOVER =
  typeof HTMLElement !== "undefined" && "popover" in HTMLElement.prototype;
/** Gap in px between the help button and its popover. */
const GAP = 8;
/** A mouse or a pen rests this long (ms) on the help button before the help opens,
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
}: {
  /** Share of bytes read (0 to 1), or null when idle. */
  progress: number | null;
  /** Reads the picked files; the input clears after it settles. */
  onFiles: (files: FileList) => Promise<unknown>;
  /** The providers that have an export. */
  loaded: Provider[];
}) {
  const help = useRef<HTMLButtonElement>(null);
  /** The help is open because a mouse or a pen rests on it (not clicked open). */
  const byHover = useRef(false);
  /** About to open the help (by a programmatic click), so the click is not
   *  a pin. */
  const opening = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // A pen that lifts away sends no leave (app/hover-input.ts): a help that a
  // hover opened closes when the hover ends.
  useEffect(() => {
    const ended = () => {
      clearTimeout(timer.current);
      const pop = document.getElementById("export-help");
      if (byHover.current && pop?.matches(":popover-open")) pop.hidePopover();
    };
    addEventListener(HOVER_END, ended);
    return () => {
      removeEventListener(HOVER_END, ended);
      clearTimeout(timer.current);
    };
  }, []);
  const reading = progress !== null;
  /** The provider whose steps the help shows; null until the user picks one. */
  const [picked, setPicked] = useState<Provider | null>(null);
  // One provider at a time, so the help fits a phone with no scroll; at first
  // the one with no export loaded yet.
  const shown =
    PROVIDERS.find((p) => p.key === picked) ??
    PROVIDERS.find((p) => !loaded.includes(p.key)) ??
    PROVIDERS[0];

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
    // Step 1.1: Its width (the class: 24rem at most), so its left edge stays
    // inside too; right-aligned to a button near the edge, it ran off a phone.
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const w = Math.min(24 * rem, right - left - 2 * GAP);
    const end = Math.max(Math.min(b.right, right - GAP), left + GAP + w);
    el.style.top = `${b.bottom + GAP}px`;
    el.style.right = `${width - end}px`;
    el.style.maxWidth = `${right - left - 2 * GAP}px`;
    // Step 1.2: No taller than the room below the button; the rest scrolls.
    el.style.maxHeight = `${innerHeight - b.bottom - 2 * GAP}px`;
  }

  // Step 3: A mouse that rests on the help button opens it too. Touch and the
  // keyboard open it by a press only.
  /**
   * Opens the help after a mouse or a pen rests on the button or the help for
   * {@link HOVER_OPEN} ms, or keeps it open.
   *
   * @param e - The pointer event; a finger, or a pointer that cannot hover
   *   now (Chrome's mouse after a tap), is ignored.
   */
  function hoverIn(e: React.PointerEvent) {
    if (e.pointerType === "touch" || !hovering()) return;
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
   * @param e - The pointer event; a finger is ignored.
   */
  function hoverOut(e: React.PointerEvent) {
    if (e.pointerType === "touch") return;
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
    <div className="flex items-center gap-1">
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
          // A press inside keeps a hover-opened help open: the user is using it.
          // It pops in from its button, except when the keyboard opens it.
          onPointerDown={() => {
            clearTimeout(timer.current);
            byHover.current = false;
          }}
          className="fixed inset-auto m-0 w-[min(24rem,calc(100vw-1rem))] overflow-y-auto overscroll-contain origin-top-right rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 sm:p-5 shadow-xl shadow-zinc-950/10 open:animate-pop-in [:focus-visible~&]:animate-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:shadow-black/40"
        >
          {/* The title and the switch share a row where they fit. */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="export-help-title" className="text-base font-semibold">
              How to export
            </h2>
            {/* Step 4: The provider switch: a native radio group, so the arrow
              keys move it. The picked half rises (a colour change, no motion;
              instant from the keyboard, as the year tabs);
              its zinc-500 ring differs from the track by 3:1, as the year
              tabs' pill (WCAG 1.4.11). */}
            <fieldset
              id="export-help-providers"
              className="grid grid-cols-2 gap-0.5 rounded-lg [&:has(:focus-visible)_label]:transition-none bg-zinc-100 p-0.5 text-sm font-medium dark:bg-zinc-800"
            >
              <legend className="sr-only">Steps for</legend>
              {PROVIDERS.map((p) => (
                <label
                  key={p.key}
                  data-provider={p.key}
                  className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2.5 text-zinc-500 transition-[background-color,color,box-shadow,scale] duration-(--dur-micro) ease-out select-none hover:text-zinc-900 active:scale-[0.97] has-checked:bg-white has-checked:text-zinc-900 has-checked:shadow-xs has-checked:ring-1 has-checked:ring-zinc-500 has-focus-visible:ring-2 has-focus-visible:ring-accent dark:text-zinc-400 dark:hover:text-zinc-50 dark:has-checked:bg-zinc-950 dark:has-checked:text-zinc-50"
                >
                  <input
                    type="radio"
                    name="export-help-provider"
                    value={p.key}
                    checked={p.key === shown.key}
                    onChange={() => setPicked(p.key)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={cn("size-2 rounded-sm", p.dot)}
                  />
                  {p.label}
                </label>
              ))}
            </fieldset>
          </div>
          <ExportGuide
            providers={[shown]}
            idPrefix="export-help"
            headings={false}
            className="mt-3"
          />
        </div>
      )}
    </div>
  );
}
