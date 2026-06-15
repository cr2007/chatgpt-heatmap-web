import { describe, it, expect } from "bun:test";
import { aggregateDateData } from "./aggregate";
import type { ConversationSummary } from "./types";

const gpt: ConversationSummary[] = [
  { title: "Chat 1", create_day: "2024-01-10", convo_create_day: ["2024-01-10", "2024-01-11"] },
  { title: "Chat 2", create_day: "2024-01-15", convo_create_day: ["2024-01-15"] },
];

const claude: ConversationSummary[] = [
  { title: "Claude A", create_day: "2024-01-11", convo_create_day: ["2024-01-11", "2024-01-12"] },
];

describe("aggregateDateData", () => {
  it("returns null for two null inputs", () => {
    expect(aggregateDateData(null, null)).toBeNull();
  });

  it("returns null for two empty arrays", () => {
    expect(aggregateDateData([], [])).toBeNull();
  });

  it("derives from/to from the date range", () => {
    const r = aggregateDateData(gpt, null)!;
    expect(r.from.toISOString().slice(0, 10)).toBe("2024-01-10");
    expect(r.to.toISOString().slice(0, 10)).toBe("2024-01-15");
  });

  it("counts chatgpt messages per day", () => {
    const r = aggregateDateData(gpt, null)!;
    expect(r.data["2024-01-10"].chatgpt).toBe(2);
    expect(r.data["2024-01-11"].chatgpt).toBe(1);
    expect(r.data["2024-01-15"].chatgpt).toBe(2);
  });

  it("sets claude to 0 when only chatgpt provided", () => {
    const r = aggregateDateData(gpt, null)!;
    expect(r.data["2024-01-10"].claude).toBe(0);
  });

  it("counts claude messages per day", () => {
    const r = aggregateDateData(null, claude)!;
    expect(r.data["2024-01-11"].claude).toBe(2);
    expect(r.data["2024-01-12"].claude).toBe(1);
    expect(r.data["2024-01-11"].chatgpt).toBe(0);
  });

  it("merges both providers on overlap days", () => {
    const r = aggregateDateData(gpt, claude)!;
    expect(r.data["2024-01-11"].chatgpt).toBe(1);
    expect(r.data["2024-01-11"].claude).toBe(2);
  });

  it("computes maxChatgpt and maxClaude", () => {
    const r = aggregateDateData(gpt, claude)!;
    expect(r.maxChatgpt).toBe(2);
    expect(r.maxClaude).toBe(2);
  });

  it("records title counts in dayTitles", () => {
    const r = aggregateDateData(gpt, null)!;
    expect(r.dayTitles["2024-01-10"].chatgpt["Chat 1"]).toBe(2);
    expect(r.dayTitles["2024-01-15"].chatgpt["Chat 2"]).toBe(2);
  });

  it("splits title counts by source", () => {
    const r = aggregateDateData(gpt, claude)!;
    expect(r.dayTitles["2024-01-11"].chatgpt["Chat 1"]).toBe(1);
    expect(r.dayTitles["2024-01-11"].claude["Claude A"]).toBe(2);
  });
});
