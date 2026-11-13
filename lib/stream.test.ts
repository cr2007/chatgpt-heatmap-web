import { describe, expect, it } from "bun:test";
import { readArray, StreamError } from "./stream";

const FIXTURES = `${import.meta.dir}/../test/fixtures`;

/** A byte stream that delivers `bytes` in the given chunks. */
function streamOf(...chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(ctl) {
      for (const c of chunks) ctl.enqueue(c);
      ctl.close();
    },
  });
}

/** Reads a whole stream with readArray and returns every element. */
async function collect(stream: ReadableStream<Uint8Array>): Promise<unknown[]> {
  const all: unknown[] = [];
  for await (const { items } of readArray(stream)) all.push(...items);
  return all;
}

const encode = (s: string) => new TextEncoder().encode(s);

describe("readArray", () => {
  // Every byte position as a chunk boundary, including inside strings,
  // escapes and multi-byte characters.
  for (const name of [
    "chatgpt-export.json",
    "chatgpt-export-2.json",
    "claude-export.json",
  ]) {
    it(`matches JSON.parse for ${name} cut at every byte`, async () => {
      const bytes = await Bun.file(`${FIXTURES}/${name}`).bytes();
      const expected = JSON.parse(new TextDecoder().decode(bytes));
      for (let cut = 0; cut <= bytes.length; cut++) {
        const got = await collect(
          streamOf(bytes.subarray(0, cut), bytes.subarray(cut)),
        );
        if (!Bun.deepEquals(got, expected))
          throw new Error(`differs when cut at byte ${cut}`);
      }
      expect(await collect(streamOf(bytes))).toEqual(expected);
    });
  }

  it("keeps escapes, braces in strings and multi-byte characters", async () => {
    const text =
      '[{"title":"Caf\\u00e9 } ] \\" {","x":[1,{"y":"東京 Zürich"}],"path":"C:\\\\"},{"title":"a\\\\\\"b"}]';
    const bytes = encode(text);
    for (let cut = 0; cut <= bytes.length; cut++) {
      expect(
        await collect(streamOf(bytes.subarray(0, cut), bytes.subarray(cut))),
      ).toEqual(JSON.parse(text));
    }
  });

  it("drops a UTF-8 byte order mark", async () => {
    expect(await collect(streamOf(encode('﻿[{"a":1}]')))).toEqual([{ a: 1 }]);
  });

  it("reports the bytes read with each batch", async () => {
    const seen: number[] = [];
    for await (const { bytes } of readArray(
      streamOf(encode("[{},"), encode("{}]")),
    ))
      seen.push(bytes);
    expect(seen).toEqual([4, 7]);
  });

  it.each([
    ["an object", "{}", "expected a JSON array"],
    ["an empty file", "", "the file is empty"],
    [
      "a cut-off file",
      '[{"a":1},{"b":',
      "the file ends before the array closes",
    ],
    ["a cut-off string", '[{"a":"x', "the file ends before the array closes"],
    ["text after the array", "[{}] x", "unexpected text after the array"],
    ["a bad element", "[{a:1}]", "could not parse JSON"],
  ])("rejects %s", async (_, text, message) => {
    const run = collect(streamOf(encode(text)));
    expect(run).rejects.toThrow(StreamError);
    expect(run).rejects.toThrow(message);
  });

  it("skips primitive elements, so an array of numbers yields nothing", async () => {
    expect(await collect(streamOf(encode("[1, 2, 3]")))).toEqual([]);
  });

  it("stops when the signal aborts", async () => {
    const ctl = new AbortController();
    ctl.abort(new Error("cancelled"));
    const gen = readArray(streamOf(encode("[{}]")), ctl.signal);
    expect(gen.next()).rejects.toThrow("cancelled");
  });
});
