/**
 * Reads a JSON array from a byte stream one element at a time, so a large
 * export never sits in memory as one string or one object tree. Uses only
 * Web APIs (ReadableStream, TextDecoderStream, JSON.parse), so the browser
 * and `bun test` run the same code.
 */

/** Why a stream is not a usable JSON array. */
/** The error when a file does not start with "[". */
export const NOT_ARRAY = "expected a JSON array";

export class StreamError extends Error {}

/**
 * Returns a function that takes text chunks and returns the complete
 * top-level object and array elements found so far, as JSON text.
 *
 * It tracks only nesting depth and string state, so it is cheap; each
 * element is then validated by JSON.parse. Anything else at the top level
 * (commas, whitespace, primitive elements) is skipped: an export is an
 * array of objects, and an array with none fails the caller's checks.
 */
export function arraySplitter() {
  let buf = "";
  let pos = 0; // next index in buf to scan
  let start = -1; // index in buf where the current element starts
  let depth = 0; // 0 before "[", 1 inside the top-level array
  let inStr = false;
  let opened = false;
  let closed = false;

  function push(chunk: string): string[] {
    const out: string[] = [];
    buf += chunk;
    for (let i = pos; i < buf.length; i++) {
      const c = buf.charCodeAt(i);
      if (inStr) {
        // Jump to the next quote (most bytes are message text). It ends the
        // string unless an odd number of backslashes come before it. The
        // open element stays in buf, so the look-back never runs off it.
        const quote = buf.indexOf('"', i);
        if (quote === -1) {
          i = buf.length;
          continue;
        }
        let b = quote - 1;
        while (buf.charCodeAt(b) === 92) b--;
        if ((quote - 1 - b) % 2 === 0) inStr = false;
        i = quote;
        continue;
      }
      if (c === 32 || c === 10 || c === 13 || c === 9) continue; // whitespace
      if (!opened) {
        if (c !== 91) throw new StreamError(NOT_ARRAY);
        opened = true;
        depth = 1;
        continue;
      }
      if (closed) throw new StreamError("unexpected text after the array");
      if (c === 34) inStr = true;
      else if (c === 123 || c === 91) {
        if (++depth === 2) start = i; // "{" or "[" opens an element
      } else if (c === 125 || c === 93) {
        if (--depth === 1) {
          out.push(buf.slice(start, i + 1));
          start = -1;
        } else if (depth === 0) closed = true; // the closing "]"
      }
    }
    // Keep only the unfinished element, so the buffer stays small.
    if (start >= 0) {
      buf = buf.slice(start);
      start = 0;
    } else buf = "";
    pos = buf.length;
    return out;
  }

  /** Throws if the stream ended before the array closed. */
  function end(): void {
    if (!opened) throw new StreamError("the file is empty");
    if (!closed || inStr)
      throw new StreamError("the file ends before the array closes");
  }

  return { push, end };
}

/**
 * Yields the parsed elements of a JSON array stream in batches, one batch
 * per chunk read, and the bytes read so far.
 *
 * Step 1: Count bytes for progress, then decode UTF-8 (a BOM is dropped).
 * Step 2: Split each chunk into elements and parse them with JSON.parse.
 * Step 3: When the stream ends, check that the array closed.
 */
export async function* readArray(
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<{ items: unknown[]; bytes: number }> {
  let read = 0; // bytes taken from the source so far
  // Step 1: each decoded chunk carries the byte count up to its end.
  // `stream: true` keeps a character that is cut across chunks whole.
  const decoder = new TextDecoder();
  const reader = stream
    .pipeThrough(
      new TransformStream<Uint8Array, { text: string; bytes: number }>({
        transform(chunk, ctl) {
          read += chunk.byteLength;
          ctl.enqueue({
            text: decoder.decode(chunk, { stream: true }),
            bytes: read,
          });
        },
        flush(ctl) {
          const text = decoder.decode(); // a cut-off character at the very end
          if (text) ctl.enqueue({ text, bytes: read });
        },
      }),
    )
    .getReader();
  const split = arraySplitter();
  // Cancel at once on abort, even while a read waits for data.
  const onAbort = () => reader.cancel(signal?.reason).catch(() => {});
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    for (;;) {
      if (signal?.aborted) throw signal.reason;
      const { done, value } = await reader.read();
      if (signal?.aborted) throw signal.reason;
      if (done) break;
      // Step 2
      const items = split.push(value.text).map((text) => {
        try {
          return JSON.parse(text) as unknown;
        } catch {
          throw new StreamError("could not parse JSON");
        }
      });
      yield { items, bytes: value.bytes };
    }
    split.end(); // Step 3
  } finally {
    signal?.removeEventListener("abort", onAbort);
    reader.cancel().catch(() => {});
  }
}
