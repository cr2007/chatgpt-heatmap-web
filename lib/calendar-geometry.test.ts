import { afterAll, beforeAll, describe, it, expect } from "bun:test";
import { shade, dayOfYear } from "./calendar-geometry";

const PALETTE = ["low", "mid", "high"] as const;

describe("shade", () => {
  it.each([
    [3, "low"],
    [4, "mid"],
    [6, "mid"],
    [7, "high"],
  ])("puts %d of 10 in the %s bucket", (count, expected) => {
    expect(shade(count, 10, PALETTE)).toBe(expected);
  });
});

describe("dayOfYear", () => {
  it.each([
    [new Date(2024, 0, 1), 0],
    [new Date(2024, 2, 1), 60], // leap year: 31 + 29
    [new Date(2023, 2, 1), 59],
    [new Date(2023, 11, 31), 364],
  ])("gives %s day %d", (date, expected) => {
    expect(dayOfYear(date)).toBe(expected);
  });

  // A day with a daylight saving change is 23 or 25 hours long.
  describe("in a zone with daylight saving time", () => {
    const saved = process.env.TZ;
    beforeAll(() => { process.env.TZ = "America/New_York"; });
    afterAll(() => { process.env.TZ = saved; });

    it("counts each day once across the March change", () => {
      expect(dayOfYear(new Date(2024, 2, 10))).toBe(69);
      expect(dayOfYear(new Date(2024, 2, 11))).toBe(70);
      expect(dayOfYear(new Date(2024, 11, 31))).toBe(365);
    });
  });
});
