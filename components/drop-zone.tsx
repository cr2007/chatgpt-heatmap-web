import { useState } from "react";
import { LoaderCircle, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The drop target and file picker, with a spinner and a progress line while
 * reading. `hero` is the large form on the welcome screen, with a button.
 */
export function DropZone({
  inputId,
  progress,
  uploads,
  error,
  onFiles,
  hero = false,
}: {
  inputId: string;
  /** Share of bytes read (0 to 1), or null when idle. */
  progress: number | null;
  /** Upload count; a new value restarts the progress line. */
  uploads: number;
  error: string;
  onFiles: (files: FileList) => Promise<void>;
  hero?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const isReading = progress !== null;

  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- drop target; keyboard users reach the linked file input
    <label
      htmlFor={inputId}
      className={cn(
        "group/drop relative flex flex-col gap-2 overflow-hidden rounded-xl border-2 border-dashed",
        hero
          ? "items-start px-6 py-7 text-left"
          : "h-full items-center justify-center px-4 py-4 text-center",
        "cursor-pointer select-none transition-[border-color,background-color,scale] duration-200",
        // The file input is hidden, so the zone shows its keyboard focus.
        "has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-violet-500 dark:has-[input:focus-visible]:ring-violet-400",
        isDragging
          ? "border-violet-500/60 bg-violet-500/5 scale-[1.01] dark:border-violet-400/60 dark:bg-violet-400/5"
          : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600 hover:bg-zinc-50/40 dark:hover:bg-zinc-800/30",
        error && !isDragging && "border-red-500/60 dark:border-red-400/60",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        // Moving onto a child (the icon, the text) also fires dragleave; ignore it.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          setIsDragging(false);
      }}
      onDrop={async (e) => {
        e.preventDefault();
        setIsDragging(false);
        await onFiles(e.dataTransfer.files);
      }}
    >
      {isReading ? (
        <LoaderCircle
          aria-hidden="true"
          className="h-5 w-5 animate-spin text-violet-500 dark:text-violet-400"
          strokeWidth={1.5}
        />
      ) : (
        <Upload
          aria-hidden="true"
          className={cn(
            "h-5 w-5 transition-[translate,color] duration-200",
            isDragging
              ? "-translate-y-0.5 text-violet-500 dark:text-violet-400"
              : "text-zinc-500 dark:text-zinc-400",
          )}
          strokeWidth={1.5}
        />
      )}
      {hero ? (
        <>
          <p aria-live="polite" className="text-base font-semibold">
            {isReading ? "Reading files..." : "Drop conversations.json here"}
          </p>
          {!isReading && (
            <span className="mt-1 inline-flex h-10 items-center rounded-lg bg-[color-mix(in_srgb,rgb(var(--accent))_85%,black)] px-4 text-sm font-semibold text-white shadow-xs transition-[background-color,scale] duration-150 group-hover/drop:bg-[color-mix(in_srgb,rgb(var(--accent))_75%,black)] group-active/drop:scale-[0.97]">
              Choose export files
            </span>
          )}
          <p
            aria-hidden={isReading}
            className="text-sm text-zinc-500 tabular-nums dark:text-zinc-400"
          >
            {isReading
              ? `${Math.round(progress * 100)}%`
              : "Add one export or both. More than one ChatGPT file is fine."}
          </p>
        </>
      ) : (
        <div>
          <p aria-live="polite" className="text-xs font-medium leading-tight">
            {isReading ? "Reading files..." : "Drop export files here"}
          </p>
          {/* The percentage is for the eye; the progress bar carries it for screen readers. */}
          <p
            aria-hidden={isReading}
            className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-tight tabular-nums"
          >
            {isReading
              ? `${Math.round(progress * 100)}%`
              : "or click to browse"}
          </p>
        </div>
      )}
      {/* Thin line on the bottom edge. A new key per upload starts it empty;
          at the end it stays full and fades out. */}
      <span
        key={uploads}
        role={isReading ? "progressbar" : undefined}
        aria-label={isReading ? "Reading files" : undefined}
        aria-valuenow={isReading ? Math.round(progress * 100) : undefined}
        aria-valuemin={isReading ? 0 : undefined}
        aria-valuemax={isReading ? 100 : undefined}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left bg-violet-500 transition-[scale,opacity] duration-200 ease-out dark:bg-violet-400"
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
