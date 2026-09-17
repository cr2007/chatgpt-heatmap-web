import { describe, it, expect } from "bun:test";
import { shade, dayOfYear } from "./calendar-geometry";

const PALETTE = ["low", "mid", "high"] as const;

describe("shade", () => {
  it("picks the lightest shade for low activity", () => {
    expect(shade(1, 10, PALETTE)).toBe("low");
  });

  it("picks the darkest shade at the max", () => {
    expect(shade(10, 10, PALETTE)).toBe("high");
  });

  it("picks the middle shade around the midpoint", () => {
    expect(shade(5, 10, PALETTE)).toBe("mid");
  });

  it("stays in the low bucket just under the 0.34 threshold", () => {
    expect(shade(3.3, 10, PALETTE)).toBe("low");
  });

  it("moves into the high bucket just under 1.0", () => {
    expect(shade(9.9, 10, PALETTE)).toBe("high");
  });
});

describe("dayOfYear", () => {
  it("is 0 for January 1st", () => {
    expect(dayOfYear(new Date(2024, 0, 1))).toBe(0);
  });

  it("is 1 for January 2nd", () => {
    expect(dayOfYear(new Date(2024, 0, 2))).toBe(1);
  });

  it("counts through a leap day", () => {
    // 2024 is a leap year: Mar 1st is day 60 (31 Jan + 29 Feb).
    expect(dayOfYear(new Date(2024, 2, 1))).toBe(60);
  });

  it("counts through a non-leap February", () => {
    // 2023 is not a leap year: Mar 1st is day 59 (31 Jan + 28 Feb).
    expect(dayOfYear(new Date(2023, 2, 1))).toBe(59);
  });

  it("is 364 for December 31st in a non-leap year", () => {
    expect(dayOfYear(new Date(2023, 11, 31))).toBe(364);
  });
});
