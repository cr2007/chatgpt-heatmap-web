import { detectFormat, summarizeChatGPT, summarizeClaude } from "./parse";
import { readArray, StreamError } from "./stream";
import type { LoadedExport, Provider } from "./types";

/** A picked or dropped file. A browser `File` and a `BunFile` both fit. */
export interface UploadFile {
  name?: string;
  size: number;
  stream(): ReadableStream<Uint8Array>;
}

export type Exports = Partial<Record<Provider, LoadedExport>>;

export type ReadResult =
  { ok: true; exports: Exports } | { ok: false; error: string };

/** Progress callback: the share of bytes read, and what is loaded so far. */
export type OnProgress = (fraction: number, partial: Exports) => void;

/** Shortest time in ms between two progress callbacks. */
const PROGRESS_EVERY = 200;
/** Longest run of work in ms before the browser gets a turn to paint. */
const YIELD_AFTER = 12;

/** Lets the browser paint and handle input; a macrotask, not a microtask. */
const yieldToBrowser = () => new Promise<void>((r) => setTimeout(r, 0));

/** One file of the batch as it streams in. */
interface FileState {
  name: string;
  format?: "chatgpt" | "claude";
  chats: LoadedExport["chats"];
  bytes: number;
}

/** Joins the files read so far into one export per provider; ChatGPT files merge in upload order. */
function toExports(states: FileState[]): Exports {
  const gpt = states.filter((s) => s.format === "chatgpt");
  const claude = states.find((s) => s.format === "claude");
  return {
    ...(gpt.length && {
      chatgpt: {
        name: gpt.length === 1 ? gpt[0].name : `${gpt.length} files`,
        chats: gpt.length === 1 ? gpt[0].chats : gpt.flatMap((s) => s.chats),
      },
    }),
    ...(claude && { claude: { name: claude.name, chats: claude.chats } }),
  };
}

/**
 * Streams a batch of uploaded files into compact exports. All files stream
 * at the same time, so ChatGPT and Claude data fill in together.
 *
 * Step 1: Set up one state per file and a stop signal that ends every file
 *         when one fails or the caller aborts.
 * Step 2: Stream each file (`readOne`):
 *   Step 2.1: The first conversation sets the file's format; an unknown
 *             format or a second Claude file fails.
 *   Step 2.2: Keep only each conversation's title and prompt times.
 *   Step 2.3: At most every 200 ms, report progress with the partial result.
 *   Step 2.4: About every 12 ms, give the browser a turn.
 * Step 3: Return the first failure, or the merged exports.
 *
 * An abort through `signal` rejects with the signal's reason.
 */
export async function loadExports(
  files: UploadFile[],
  {
    signal,
    onProgress,
  }: { signal?: AbortSignal; onProgress?: OnProgress } = {},
): Promise<ReadResult> {
  // Step 1
  signal?.throwIfAborted();
  const total = files.reduce((n, f) => n + f.size, 0) || 1;
  const states: FileState[] = files.map((f) => ({
    name: f.name?.split("/").pop() || "file",
    chats: [],
    bytes: 0,
  }));
  // Stops every file when one fails or the caller aborts.
  const stop = new AbortController();
  const onAbort = () => stop.abort(signal?.reason);
  signal?.addEventListener("abort", onAbort, { once: true });
  let failure: string | undefined;
  let lastYield = performance.now();
  let lastProgress = 0;

  /** Streams one file; returns why it failed, or nothing. */
  async function readOne(
    file: UploadFile,
    s: FileState,
  ): Promise<string | undefined> {
    try {
      for await (const { items, bytes } of readArray(
        file.stream(),
        stop.signal,
      )) {
        s.bytes = bytes;
        for (const item of items) {
          // Step 2.1
          if (!s.format) {
            const format = detectFormat([item]);
            if (format === "unknown")
              return `${s.name}: unrecognised format - expected a ChatGPT or Claude conversations.json`;
            if (
              format === "claude" &&
              states.some((o) => o.format === "claude")
            )
              return "Upload at most one Claude export";
            s.format = format;
          }
          // Step 2.2
          s.chats.push(
            s.format === "chatgpt"
              ? summarizeChatGPT(item)
              : summarizeClaude(item),
          );
        }
        const now = performance.now();
        // Step 2.3
        if (onProgress && now - lastProgress >= PROGRESS_EVERY) {
          lastProgress = now;
          onProgress(
            states.reduce((n, o) => n + o.bytes, 0) / total,
            toExports(states),
          );
        }
        // Step 2.4
        if (now - lastYield >= YIELD_AFTER) {
          await yieldToBrowser();
          lastYield = performance.now();
        }
      }
    } catch (e) {
      if (stop.signal.aborted) return; // another file failed, or the caller aborted
      if (e instanceof StreamError) return `${s.name}: ${e.message}`;
      throw e;
    }
    return s.format
      ? undefined
      : `${s.name}: expected a non-empty array of conversations`;
  }

  // Step 2
  try {
    await Promise.all(
      files.map(async (file, i) => {
        const error = await readOne(file, states[i]);
        if (error && !failure) {
          failure = error;
          stop.abort();
        }
      }),
    );
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
  // Step 3
  if (signal?.aborted) throw signal.reason;
  if (failure) return { ok: false, error: failure };
  const exports = toExports(states);
  onProgress?.(1, exports);
  return { ok: true, exports };
}
