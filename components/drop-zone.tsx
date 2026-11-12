import { useRef, useState, useSyncExternalStore } from "react";
import { LoaderCircle, Upload } from "lucide-react";
import { cn, plural } from "@/lib/utils";
import { getFileDrag, subscribeFileDrag } from "@/lib/file-drag";

/** How far (px) the content leans toward the dragged files. */
const LEAN = 6;
/** Length (ms) of the collapse into the drop point (app/globals.css). */
const ABSORB = 220;

/**
 * The drop target of the overlay that takes a drop anywhere on the loaded
 * page (components/page-drop.tsx): it fills its parent, with a spinner and
 * a progress line while reading. The welcome screen has the post box
 * (components/mail-slot.tsx) instead.
 *
 * Step 1: Files over the page: the zone says it is ready and how many files
 *         there are (lib/file-drag.ts).
 * Step 2: Files over the zone: a soft accent well follows the pointer and
 *         the content leans toward it. The pointer writes CSS variables once
 *         a frame, so the effect needs no React render.
 * Step 3: On drop the well collapses into the drop point, then reading starts.
 */
export function DropZone({
  inputId,
  progress,
  uploads,
  onFiles,
}: {
  inputId: string;
  /** Share of bytes read (0 to 1), or null when idle. */
  progress: number | null;
  /** Upload count; a new value restarts the progress line. */
  uploads: number;
  onFiles: (files: FileList) => Promise<unknown>;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [absorbing, setAbsorbing] = useState(false);
  const drag = useSyncExternalStore(subscribeFileDrag, getFileDrag);
  const frame = useRef(0);
  const isReading = progress !== null;
  const phase = absorbing
    ? "absorb"
    : isDragging
      ? "over"
      : drag.active
        ? "ready"
        : "idle";
  const files = drag.count ? plural(drag.count, "file") : "the files";

  /** Step 2: moves the well and the lean to the pointer, once a frame. */
  function follow(el: HTMLElement, x: number, y: number) {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const b = el.getBoundingClientRect();
      const lean = (d: number, size: number) =>
        Math.max(-LEAN, Math.min(LEAN, (d / size) * LEAN * 2)).toFixed(1);
      el.style.setProperty("--px", `${x - b.left}px`);
      el.style.setProperty("--py", `${y - b.top}px`);
      el.style.setProperty(
        "--lx",
        `${lean(x - b.left - b.width / 2, b.width)}px`,
      );
      el.style.setProperty(
        "--ly",
        `${lean(y - b.top - b.height / 2, b.height)}px`,
      );
    });
  }

  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- drop target; keyboard users reach the linked file input
    <label
      htmlFor={inputId}
      id={`${inputId}-zone`}
      data-drag={phase}
      className={cn(
        "drop-zone relative flex h-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-white/70 px-6 dark:bg-zinc-900/70",
        "cursor-pointer select-none transition-[border-color,background-color,scale] duration-200",
        // The file input is hidden, so the zone shows its keyboard focus.
        "has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-accent",
        phase === "over" || phase === "absorb"
          ? "border-accent/70 scale-[1.01]"
          : phase === "ready"
            ? "border-accent/60 bg-accent/[0.03]"
            : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600 hover:bg-zinc-50/40 dark:hover:bg-zinc-800/30",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setIsDragging(true);
        follow(e.currentTarget, e.clientX, e.clientY);
      }}
      onDragLeave={(e) => {
        // Moving onto a child (the icon, the text) also fires dragleave; ignore it.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          setIsDragging(false);
      }}
      onDrop={async (e) => {
        e.preventDefault();
        setIsDragging(false);
        // Step 3
        setAbsorbing(true);
        setTimeout(() => setAbsorbing(false), ABSORB);
        await onFiles(e.dataTransfer.files);
      }}
    >
      <span aria-hidden="true" className="drop-well" />
      <span className="drop-content relative flex flex-col items-center gap-2 text-center">
        {isReading ? (
          <LoaderCircle
            aria-hidden="true"
            className="h-5 w-5 animate-spin text-accent"
            strokeWidth={1.5}
          />
        ) : (
          <Upload
            aria-hidden="true"
            className={cn(
              "h-5 w-5 transition-[translate,color] duration-200",
              phase === "over" || phase === "ready"
                ? "-translate-y-0.5 text-accent"
                : "text-zinc-500 dark:text-zinc-400",
            )}
            strokeWidth={1.5}
          />
        )}
        <p aria-live="polite" className="text-lg font-semibold">
          {isReading
            ? "Reading files..."
            : phase === "over"
              ? `Release to read ${files}`
              : phase === "ready"
                ? `Drop ${files} here`
                : "Drop conversations.json here"}
        </p>
        <p
          aria-hidden={isReading}
          className="text-sm text-zinc-500 tabular-nums dark:text-zinc-400"
        >
          {isReading
            ? `${Math.round(progress * 100)}%`
            : "A new export replaces the one from the same provider."}
        </p>
      </span>
      {/* Thin line on the bottom edge. A new key per upload starts it empty;
          at the end it stays full and fades out. */}
      <span
        key={uploads}
        role={isReading ? "progressbar" : undefined}
        aria-label={isReading ? "Reading files" : undefined}
        aria-valuenow={isReading ? Math.round(progress * 100) : undefined}
        aria-valuemin={isReading ? 0 : undefined}
        aria-valuemax={isReading ? 100 : undefined}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left bg-accent transition-[scale,opacity] duration-200 ease-out"
        style={{
          scale: `${progress ?? 1} 1`,
          opacity: isReading ? 1 : 0,
        }}
      />
      <input
        id={inputId}
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
  );
}
