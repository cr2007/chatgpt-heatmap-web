import { describe, expect, test } from "bun:test";
import { readUpload, type UploadHandlers } from "./use-upload";
import { getToasts } from "@/lib/toast";

const FIXTURES = `${import.meta.dir}/../test/fixtures`;

/** Records every call to the handlers, in order. */
function recorder() {
  const calls: string[] = [];
  const h: UploadHandlers = {
    onProgress: () => {},
    onStream: (p) => calls.push(p ? "stream" : "stream null"),
    onLoad: () => calls.push("load"),
    showError: (msg) => calls.push(`error ${msg}`),
  };
  return { calls, h };
}

/** A file that sends "[" and then waits, like a large file mid-read. */
const slowFile = {
  name: "slow.json",
  size: 100,
  stream: () =>
    new ReadableStream<Uint8Array>({
      start: (c) => c.enqueue(new TextEncoder().encode("[")),
    }),
};

describe("readUpload", () => {
  test("an upload that a newer one cancels reports nothing", async () => {
    // Step 1: The first upload waits on its file; the second one starts.
    const first = new AbortController();
    const a = recorder();
    const reading = readUpload([slowFile], first.signal, a.h);
    first.abort(new DOMException("A newer upload started", "AbortError"));
    const b = recorder();
    const loaded = await readUpload(
      [Bun.file(`${FIXTURES}/claude-export.json`)],
      new AbortController().signal,
      b.h,
    );
    // Step 2: The cancelled one stays silent, so it cannot wipe the newer
    // one's partial result or show a false error.
    expect(await reading).toBe(false);
    expect(a.calls).toEqual([]);
    expect(loaded).toBe(true);
    expect(b.calls.slice(-2)).toEqual(["stream null", "load"]);
  });

  test("a file that is not an export shows why, once", async () => {
    const { calls, h } = recorder();
    const file = {
      name: "notes.json",
      size: 2,
      stream: () =>
        new Blob([
          JSON.stringify({ a: 1 }),
        ]).stream() as ReadableStream<Uint8Array>,
    };
    expect(await readUpload([file], new AbortController().signal, h)).toBe(
      false,
    );
    expect(calls).toEqual([
      "stream null",
      expect.stringMatching(/^error notes\.json: no conversations found/),
    ]);
  });

  test("a loaded export toasts its chat count", async () => {
    const { h } = recorder();
    await readUpload(
      [Bun.file(`${FIXTURES}/claude-export.json`)],
      new AbortController().signal,
      h,
    );
    expect(getToasts().at(-1)?.text).toStartWith(
      "Claude export loaded - 3 chats",
    );
  });
});
