import { useCallback, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import { PROVIDERS } from "@/lib/providers";
import { loadExports, type Exports, type UploadFile } from "@/lib/upload";
import { plural } from "@/lib/utils";

/** What {@link readUpload} reports to: the page and the upload state. */
export interface UploadHandlers {
  /** The share of bytes read (0 to 1). */
  onProgress: (fraction: number) => void;
  /** A partial result while files stream in, then null. */
  onStream: (partial: Exports | null) => void;
  /** The final exports. */
  onLoad: (exports: Exports) => void;
  /** An error the user must see. */
  showError: (msg: string) => void;
}

/**
 * Reads one upload and reports it: the partial results, the final exports
 * and a toast per provider, or the error.
 *
 * @remarks
 * Kept apart from the hook so a test can run two uploads that overlap. An
 * upload that a newer one cancelled reports nothing, because the newer one
 * owns the state now.
 *
 * @param files - The dropped or picked files.
 * @param signal - Aborts when a newer upload starts.
 * @param h - Where the results go ({@link UploadHandlers}).
 * @returns True when the exports loaded; false on an error or a cancel.
 * @see {@link loadExports}, which reads the files.
 */
export async function readUpload(
  files: UploadFile[],
  signal: AbortSignal,
  h: UploadHandlers,
): Promise<boolean> {
  try {
    // Step 1: Stream the files; each progress step shows the partial result.
    const result = await loadExports(files, {
      signal,
      onProgress: (fraction, partial) => {
        h.onProgress(fraction);
        h.onStream(partial);
      },
    });
    // Step 2: On success, keep the exports and toast each provider. On an
    // error, drop the partial result and show why.
    h.onStream(null);
    if (!result.ok) {
      h.showError(result.error);
      return false;
    }
    h.onLoad(result.exports);
    for (const p of PROVIDERS) {
      const chats = result.exports[p.key]?.chats;
      if (!chats?.length) continue;
      const outside = chats.reduce((n, c) => n + (c.outside ?? 0), 0);
      if (!chats.some((c) => c.times.length)) {
        toast(
          "error",
          `${p.label} export has no dated prompts, so there is nothing to draw.`,
        );
        continue;
      }
      toast(
        "success",
        `${p.label} export loaded - ${plural(chats.length, "chat")}` +
          (outside
            ? `. ${plural(outside, "prompt")} with a date before November 2022 or in the future ${outside === 1 ? "does" : "do"} not count.`
            : ""),
      );
    }
    return true;
  } catch (e) {
    if (signal.aborted) return false; // the newer upload owns the state now
    h.onStream(null);
    h.showError(
      `Could not read the file: ${e instanceof Error ? e.message : String(e)}`,
    );
    return false;
  }
}

/**
 * Holds the upload state and streams dropped or picked files into the page.
 *
 * @param handlers - `onLoad` gets the final exports. `onStream` gets partial
 *   results, then null.
 * @returns The progress (0 to 1, or null when idle), the upload count, the
 *   error text, the shake state with `resetShake`, and `processFiles`.
 * @see {@link readUpload}, which reads and reports one upload.
 */
export function useUpload({
  onLoad,
  onStream,
}: {
  onLoad: (exports: Exports) => void;
  onStream: (partial: Exports | null) => void;
}) {
  const [error, setError] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  /** Share of bytes read (0 to 1) while files stream in; null when idle. */
  const [progress, setProgress] = useState<number | null>(null);
  /** Counts uploads, so each one gets a fresh progress line. */
  const [uploads, setUploads] = useState(0);
  /** Cancels the upload in progress when a newer one starts. */
  const uploadRef = useRef<AbortController | null>(null);

  /**
   * Shows an error by the drop zone (it stays) and as a toast (it is
   * announced, see {@link toast}).
   *
   * @param msg - The error text.
   */
  const showError = useCallback((msg: string) => {
    setError(msg);
    setIsShaking(true);
    toast("error", msg);
  }, []);

  /** Ends the error shake. */
  const resetShake = useCallback(() => setIsShaking(false), []);

  /**
   * Streams every dropped or picked file and hands the result to the page.
   *
   * @param fileList - The dropped or picked files.
   * @returns True when the exports loaded (the mail slot pushes its card
   *   in), false on an error or a newer upload.
   */
  const processFiles = useCallback(
    async (fileList: FileList): Promise<boolean> => {
      // Step 1: Cancel an older upload that is still running.
      uploadRef.current?.abort(
        new DOMException("A newer upload started", "AbortError"),
      );
      const upload = new AbortController();
      uploadRef.current = upload;
      setError("");
      setProgress(0);
      setUploads((n) => n + 1);
      // Step 2: Read and report it (`readUpload`).
      try {
        return await readUpload(Array.from(fileList), upload.signal, {
          onProgress: setProgress,
          onStream,
          onLoad,
          showError,
        });
      } finally {
        if (uploadRef.current === upload) setProgress(null);
      }
    },
    [onLoad, onStream, showError],
  );

  return { progress, uploads, error, isShaking, resetShake, processFiles };
}
