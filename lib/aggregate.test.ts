import { describe, it, expect } from "bun:test";
import { aggregateDateData } from "./aggregate";
import { parseChatGPT, parseClaude } from "./parse";
import type { ConversationSummary } from "./types";

// Each chat starts a day before its first prompt, so a count that includes
// the chat start shows up on 2024-01-09 and 2024-01-10.
const gpt: ConversationSummary[] = [
  { title: "Chat 1", create_day: "2024-01-09", convo_create_day: ["2024-01-10", "2024-01-10", "2024-01-11"] },
  { title: "Chat 2", create_day: "2024-01-14", convo_create_day: ["2024-01-15"] },
];

const claude: ConversationSummary[] = [
  { title: "Claude A", create_day: "2024-01-10", convo_create_day: ["2024-01-11", "2024-01-12"] },
];

const FIXTURES = `${import.meta.dir}/../test/fixtures`;

describe("aggregateDateData", () => {
  it("returns null when nothing is loaded", () => {
    expect(aggregateDateData(null, null)).toBeNull();
    expect(aggregateDateData([], [])).toBeNull();
  });

  it.failing("counts one per prompt and never counts the chat start", () => {
    const r = aggregateDateData(gpt, null)!;
    expect(r.data["2024-01-09"]).toBeUndefined();
    expect(r.data["2024-01-10"]).toEqual({ chatgpt: 2, claude: 0 });
    expect(r.data["2024-01-15"]).toEqual({ chatgpt: 1, claude: 0 });
  });

  it("merges both providers on a shared day", () => {
    const r = aggregateDateData(gpt, claude)!;
    expect(r.data["2024-01-11"]).toEqual({ chatgpt: 1, claude: 1 });
    expect(r.maxChatgpt).toBe(2);
    expect(r.maxClaude).toBe(1);
  });

  it.failing("breaks each day down by provider and title", () => {
    const r = aggregateDateData(gpt, claude)!;
    expect(r.dayTitles["2024-01-10"]).toEqual({ chatgpt: { "Chat 1": 2 }, claude: {} });
    expect(r.dayTitles["2024-01-11"]).toEqual({ chatgpt: { "Chat 1": 1 }, claude: { "Claude A": 1 } });
  });

  it.failing("spans from the first to the last prompt day, as local dates", () => {
    const r = aggregateDateData(gpt, claude)!;
    const local = (d: Date) => [d.getFullYear(), d.getMonth() + 1, d.getDate()];
    expect(local(r.from)).toEqual([2024, 1, 10]);
    expect(local(r.to)).toEqual([2024, 1, 15]);
  });

  it.failing("lists a year that has prompts but no chat starts", async () => {
    const raw = await Bun.file(`${FIXTURES}/chatgpt-export.json`).json();
    const r = aggregateDateData(parseChatGPT(raw, "UTC"), null) as unknown as { years: number[] };
    expect(r.years).toEqual([2024, 2025]);
  });

  it.failing("merges two ChatGPT files with a Claude file", async () => {
    const [a, b, c] = await Promise.all(
      ["chatgpt-export.json", "chatgpt-export-2.json", "claude-export.json"].map((f) => Bun.file(`${FIXTURES}/${f}`).json()),
    );
    const r = aggregateDateData(parseChatGPT([...a, ...b], "UTC"), parseClaude(c, "UTC"))!;
    expect(r.data["2024-03-10"]).toEqual({ chatgpt: 3, claude: 2 });
  });
});
