import { describe, it, expect } from "bun:test";
import { readExports } from "./upload";

const FIXTURES = `${import.meta.dir}/../test/fixtures`;
/** Reads a fixture as an uploaded file. */
const file = async (name: string) => ({ name, text: await Bun.file(`${FIXTURES}/${name}`).text() });

describe("readExports", () => {
  it("merges two ChatGPT files and keeps the Claude file apart", async () => {
    const r = readExports(await Promise.all(["chatgpt-export.json", "chatgpt-export-2.json", "claude-export.json"].map(file)));
    if (!r.ok) throw new Error(r.error);
    expect(r.exports.chatgpt?.name).toBe("2 files");
    expect(r.exports.chatgpt?.data).toHaveLength(6);
    expect(r.exports.claude?.name).toBe("claude-export.json");
  });

  it("leaves out a provider the batch does not include", async () => {
    const r = readExports([await file("claude-export.json")]);
    expect(r.ok && Object.keys(r.exports)).toEqual(["claude"]);
  });

  it.each([
    ["broken.json", "{not json", "broken.json: could not parse JSON"],
    ["object.json", "{}", "object.json: expected a non-empty array of conversations"],
    ["empty.json", "[]", "empty.json: expected a non-empty array of conversations"],
    ["other.json", '[{"foo":1}]', "other.json: unrecognised format - expected a ChatGPT or Claude conversations.json"],
  ])("rejects %s", (name, text, error) => {
    expect(readExports([{ name, text }])).toEqual({ ok: false, error });
  });

  it("rejects two Claude exports", async () => {
    const c = await file("claude-export.json");
    expect(readExports([c, c])).toEqual({ ok: false, error: "Upload at most one Claude export" });
  });
});
