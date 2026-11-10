import { describe, it, expect } from "bun:test";
import { aggregateDateData } from "./aggregate";
import { parseChatGPT, parseClaude } from "./parse";
import type { ConversationSummary } from "./types";

const gpt: ConversationSummary[] = [
  { title: "Chat 1", times: at("2024-01-10", "2024-01-10", "2024-01-11") },
  { title: "Chat 2", times: at("2024-01-15") },
];

const claude: ConversationSummary[] = [
  { title: "Claude A", times: at("2024-01-11", "2024-01-12") },
];

/** Prompt times at noon UTC on the given days. */
function at(...days: string[]): number[] {
  return days.map((d) => Date.parse(`${d}T12:00:00Z`));
}

const FIXTURES = `${import.meta.dir}/../test/fixtures`;

describe("aggregateDateData", () => {
  it("returns null when nothing is loaded", () => {
    expect(aggregateDateData(null, null, "UTC")).toBeNull();
    expect(aggregateDateData([], [], "UTC")).toBeNull();
  });

  it("counts one per prompt day", () => {
    const r = aggregateDateData(gpt, null, "UTC")!;
    expect(r.data["2024-01-10"]).toEqual({ chatgpt: 2, claude: 0 });
    expect(r.data["2024-01-15"]).toEqual({ chatgpt: 1, claude: 0 });
  });

  it("merges both providers on a shared day", () => {
    const r = aggregateDateData(gpt, claude, "UTC")!;
    expect(r.data["2024-01-11"]).toEqual({ chatgpt: 1, claude: 1 });
    expect(r.edges.chatgpt).toEqual([1, 1, 2]);
    expect(r.edges.claude).toEqual([1, 1, 1]);
  });

  it("breaks each day down by provider and chat", () => {
    const r = aggregateDateData(gpt, claude, "UTC")!;
    expect(r.dayTitles["2024-01-10"]).toEqual({
      chatgpt: [{ title: "Chat 1", count: 2 }],
      claude: [],
    });
    expect(r.dayTitles["2024-01-11"]).toEqual({
      chatgpt: [{ title: "Chat 1", count: 1 }],
      claude: [{ title: "Claude A", count: 1 }],
    });
  });

  it("keeps chats with the same title apart, busiest first", () => {
    const r = aggregateDateData(
      [
        { title: "New chat", times: at("2024-02-01") },
        { title: "Other", times: at("2024-02-01", "2024-02-01") },
        {
          title: "New chat",
          times: at("2024-02-01", "2024-02-01", "2024-02-01"),
        },
      ],
      null,
      "UTC",
    )!;
    expect(r.dayTitles["2024-02-01"].chatgpt).toEqual([
      { title: "New chat", count: 3 },
      { title: "Other", count: 2 },
      { title: "New chat", count: 1 },
    ]);
  });

  it("spans from the first to the last prompt day, as local dates", () => {
    const r = aggregateDateData(gpt, claude, "UTC")!;
    const local = (d: Date) => [d.getFullYear(), d.getMonth() + 1, d.getDate()];
    expect(local(r.from)).toEqual([2024, 1, 10]);
    expect(local(r.to)).toEqual([2024, 1, 15]);
  });

  it("lists a year that has prompts but no chat starts", async () => {
    const raw = await Bun.file(`${FIXTURES}/chatgpt-export.json`).json();
    const r = aggregateDateData(parseChatGPT(raw), null, "UTC")!;
    expect(r.years).toEqual([2024, 2025]);
  });

  it("merges two ChatGPT files with a Claude file", async () => {
    const [a, b, c] = await Promise.all(
      [
        "chatgpt-export.json",
        "chatgpt-export-2.json",
        "claude-export.json",
      ].map((f) => Bun.file(`${FIXTURES}/${f}`).json()),
    );
    const r = aggregateDateData(
      parseChatGPT([...a, ...b]),
      parseClaude(c),
      "UTC",
    )!;
    expect(r.data["2024-03-10"]).toEqual({ chatgpt: 3, claude: 2 });
  });
});
