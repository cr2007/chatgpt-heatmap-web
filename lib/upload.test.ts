import { describe, it, expect } from "bun:test";
import { loadExports } from "./upload";

const FIXTURES = `${import.meta.dir}/../test/fixtures`;
const fixture = (name: string) => Bun.file(`${FIXTURES}/${name}`);

describe("loadExports", () => {
  it("merges two ChatGPT files and keeps the Claude file apart", async () => {
    const r = await loadExports([
      fixture("chatgpt-export.json"),
      fixture("chatgpt-export-2.json"),
      fixture("claude-export.json"),
    ]);
    if (!r.ok) throw new Error(r.error);
    expect(r.exports.chatgpt?.name).toBe("2 files");
    expect(r.exports.chatgpt?.files).toEqual([
      "chatgpt-export.json",
      "chatgpt-export-2.json",
    ]);
    expect(r.exports.chatgpt?.chats).toHaveLength(6);
    expect(r.exports.claude?.name).toBe("claude-export.json");
    expect(r.exports.claude?.chats).toHaveLength(3);
  });

  it("leaves out a provider the batch does not include", async () => {
    const r = await loadExports([fixture("claude-export.json")]);
    expect(r.ok && Object.keys(r.exports)).toEqual(["claude"]);
  });

  it("reports progress up to 1, with the chats read so far", async () => {
    const seen: number[] = [];
    await loadExports([fixture("chatgpt-export.json")], {
      onProgress: (fraction, partial) => {
        seen.push(fraction);
        expect(partial.chatgpt?.chats.length ?? 0).toBeGreaterThanOrEqual(0);
      },
    });
    expect(seen.at(-1)).toBe(1);
  });

  it.each([
    [
      "broken.json",
      "{not json",
      "broken.json: no conversations found. Upload conversations.json from a ChatGPT or Claude export.",
    ],
    ["bad.json", "[{not json}]", "bad.json: could not parse JSON"],
    ["cut.json", '[{"a":1', "cut.json: the file ends before the array closes"],
    [
      "empty.json",
      "[]",
      "empty.json: no conversations found. Upload conversations.json from a ChatGPT or Claude export.",
    ],
    [
      "numbers.json",
      "[1,2]",
      "numbers.json: no conversations found. Upload conversations.json from a ChatGPT or Claude export.",
    ],
    [
      "manifest.json",
      '{"data_files":[{"category":"conversations"}]}',
      "manifest.json: no conversations found. Upload conversations.json from a ChatGPT or Claude export.",
    ],
    [
      "projects.json",
      '[{"uuid":"p1","name":"Thesis","docs":[]}]',
      "projects.json: no conversations found. Upload conversations.json from a ChatGPT or Claude export.",
    ],
    [
      "conversations-000.zip",
      "PK",
      "conversations-000.zip: this is a zip file. Unzip it, then upload the conversations.json inside.",
    ],
    [
      "other.json",
      '[{"foo":1}]',
      "other.json: no conversations found. Upload conversations.json from a ChatGPT or Claude export.",
    ],
  ])("rejects %s", async (name, text, error) => {
    expect(await loadExports([new File([text], name)])).toEqual({
      ok: false,
      error,
    });
  });

  it("streams files at the same time, and a failure stops the others", async () => {
    let cancelled = false;
    // A file that sends "[" and then never ends.
    const endless = {
      name: "endless.json",
      size: 1,
      stream: () =>
        new ReadableStream<Uint8Array>({
          start: (ctl) => ctl.enqueue(new TextEncoder().encode("[")),
          cancel: () => {
            cancelled = true;
          },
        }),
    };
    const result = await loadExports([endless, new File(["{}"], "bad.json")]);
    expect(result).toEqual({
      ok: false,
      error:
        "bad.json: no conversations found. Upload conversations.json from a ChatGPT or Claude export.",
    });
    expect(cancelled).toBe(true);
  });

  it("rejects two Claude exports", async () => {
    expect(
      await loadExports([
        fixture("claude-export.json"),
        fixture("claude-export.json"),
      ]),
    ).toEqual({
      ok: false,
      error: "Upload at most one Claude export",
    });
  });

  it("stops with the abort reason when cancelled", async () => {
    const ctl = new AbortController();
    ctl.abort(new Error("replaced by a newer upload"));
    expect(
      loadExports([fixture("chatgpt-export.json")], { signal: ctl.signal }),
    ).rejects.toThrow("replaced by a newer upload");
  });
});
