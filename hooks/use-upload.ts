import { useCallback, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import { PROVIDERS } from "@/lib/providers";
import { loadExports, type Exports } from "@/lib/upload";
import { plural } from "@/lib/utils";

/**
 * Holds the upload state and streams dropped or picked files into the page.
 * `onLoad` gets the final exports. `onStream` gets partial results, then null.
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

  /** Shows an error by the drop zone (it stays) and as a toast (it is announced). */
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
   * Step 1: cancel an older upload that is still running.
   * Step 2: stream the files; each progress step shows the partial result.
   * Step 3: on success, keep the exports and toast each provider; on an
   *         error, drop the partial result and show why.
   * Resolves true when the exports loaded (the mail slot pushes its card
   * in), false on an error or a newer upload.
   */
  const processFiles = useCallback(
    async (fileList: FileList): Promise<boolean> => {
      // Step 1
      uploadRef.current?.abort(
        new DOMException("A newer upload started", "AbortError"),
      );
      const upload = new AbortController();
      uploadRef.current = upload;
      setError("");
      setProgress(0);
      setUploads((n) => n + 1);
      try {
        // Step 2
        const result = await loadExports(Array.from(fileList), {
          signal: upload.signal,
          onProgress: (fraction, partial) => {
            setProgress(fraction);
            onStream(partial);
          },
        });
        // Step 3
        onStream(null);
        if (!result.ok) {
          showError(result.error);
          return false;
        }
        onLoad(result.exports);
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
            `${p.label} export loaded - ${plural(chats.length, "conversation")}` +
              (outside
                ? `. ${plural(outside, "prompt")} with a date before November 2022 or in the future ${outside === 1 ? "does" : "do"} not count.`
                : ""),
          );
        }
        return true;
      } catch (e) {
        if (upload.signal.aborted) return false; // the newer upload owns the state now
        onStream(null);
        showError(
          `Could not read the file: ${e instanceof Error ? e.message : String(e)}`,
        );
        return false;
      } finally {
        if (uploadRef.current === upload) setProgress(null);
      }
    },
    [onLoad, onStream, showError],
  );

  return { progress, uploads, error, isShaking, resetShake, processFiles };
}
