import { describe, expect, it } from "bun:test";
import { summarize } from "./stats";
import type { CalHeatmapDay } from "./types";

const day = (chatgpt: number, claude = 0): CalHeatmapDay => ({
  chatgpt,
  claude,
});

describe("summarize", () => {
  const data = {
    "2024-12-30": day(1),
    "2024-12-31": day(2, 1),
    "2025-01-01": day(0, 4), // the streak crosses the new year
    "2025-01-03": day(4),
    "2025-01-04": day(1),
    "2025-02-10": day(0, 0), // a day with no prompts is not active
  };

  it("adds up prompts and active days over the whole range", () => {
    const s = summarize(data)!;
    expect([s.total, s.chatgpt, s.claude, s.activeDays]).toEqual([13, 8, 5, 5]);
    expect(s.span).toEqual({ days: 6, from: "2024-12-30", to: "2025-01-04" });
  });

  it("finds the longest run, across a year end", () => {
    expect(summarize(data)!.streak).toEqual({
      days: 3,
      from: "2024-12-30",
      to: "2025-01-01",
    });
  });

  it("keeps the earliest of two busiest days", () => {
    expect(summarize(data)!.busiest).toEqual({ day: "2025-01-01", count: 4 });
  });

  it("limits every figure to one year", () => {
    const s = summarize(data, 2025)!;
    expect([s.total, s.activeDays]).toEqual([9, 3]);
    expect(s.streak).toEqual({ days: 2, from: "2025-01-03", to: "2025-01-04" });
  });

  it("is null when the range has no prompts", () => {
    expect(summarize({})).toBeNull();
    expect(summarize(data, 2023)).toBeNull();
  });
});
