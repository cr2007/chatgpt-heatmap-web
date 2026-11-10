import { describe, it, expect } from "bun:test";
import { detectFormat, parseChatGPT, parseClaude } from "./parse";

const FIXTURES = `${import.meta.dir}/../test/fixtures`;
const chatgpt = await Bun.file(`${FIXTURES}/chatgpt-export.json`).json();
const claude = await Bun.file(`${FIXTURES}/claude-export.json`).json();

/** Finds one parsed conversation by its title. */
const byTitle = <T extends { title: string }>(list: T[], title: string) => list.find((c) => c.title === title)!;

describe("detectFormat", () => {
  it.each([
    ["chatgpt", chatgpt],
    ["claude", claude],
    ["unknown", []],
    ["unknown", [{ foo: "bar" }]],
    ["unknown", [{ create_time: "string", mapping: {} }]],
  ])("detects %s", (expected, input) => {
    expect(detectFormat(input)).toBe(expected);
  });
});

describe("parseChatGPT", () => {
  const parsed = parseChatGPT(chatgpt, "UTC");

  it("trims the title and falls back to Untitled", () => {
    expect(parsed.map((c) => c.title)).toContain("Untitled");
    expect(parsed.map((c) => c.title)).not.toContain("   ");
  });

  it("counts visible prompts, including edits, and skips hidden context", () => {
    expect(byTitle(parsed, "Edit branch with hidden context").days).toEqual(["2024-03-10", "2024-03-10"]);
  });

  it("skips prompts without a time and messages from other roles", () => {
    expect(byTitle(parsed, "Null times and tools").days).toEqual(["2024-07-01", "2024-07-01", "2024-07-01"]);
  });

  it("gives an empty chat no prompt days", () => {
    expect(byTitle(parsed, "Empty chat").days).toEqual([]);
  });

  it("puts each prompt on its local day", () => {
    const kolkata = parseChatGPT(chatgpt, "Asia/Kolkata");
    expect(byTitle(kolkata, "Null times and tools").days).toEqual(["2024-07-01", "2024-07-01", "2024-07-02"]);
  });

  it("skips malformed conversations and times instead of throwing", () => {
    const bad = [{ title: "No mapping", create_time: 1 }, { title: "Bad time", create_time: 1, mapping: {
      a: { message: { author: { role: "user" }, create_time: Number.NaN, content: { content_type: "text" } } },
    } }];
    expect(parseChatGPT(bad, "UTC").flatMap((c) => c.days)).toEqual([]);
  });
});

describe("parseClaude", () => {
  const parsed = parseClaude(claude, "UTC");

  it("falls back to Untitled for a blank name", () => {
    expect(parsed.map((c) => c.title)).toContain("Untitled");
  });

  it("counts only human messages, on their local day", () => {
    expect(byTitle(parsed, "Claude across midnight").days).toEqual(["2024-03-10", "2024-03-10"]);
    const kolkata = parseClaude(claude, "Asia/Kolkata");
    expect(byTitle(kolkata, "Claude across midnight").days).toEqual(["2024-03-10", "2024-03-11"]);
  });

  it("skips malformed conversations and times instead of throwing", () => {
    const bad = [{ name: "No messages", created_at: "2024-01-01T00:00:00Z" }, { name: "Bad time", created_at: "x",
      chat_messages: [{ sender: "human", created_at: "not a date" }] }];
    expect(parseClaude(bad, "UTC").flatMap((c) => c.days)).toEqual([]);
  });
});
