import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { CELL, layoutCalendar, shade } from "./calendar-geometry";

const PALETTE = ["low", "mid", "high"] as const;
const STEP = CELL + 2;

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

describe("layoutCalendar", () => {
  // A zone with daylight saving time: a 23-hour local day once shifted a
  // whole run of Sundays into the wrong column.
  const saved = process.env.TZ;
  beforeAll(() => {
    process.env.TZ = "America/New_York";
  });
  afterAll(() => {
    process.env.TZ = saved;
  });

  it.each([false, true])(
    "puts each day after the one before it (vertical: %p)",
    (vertical) => {
      const { cells } = layoutCalendar(2023, 2025, vertical);
      // A week moves on at each Sunday; other days step to the next weekday.
      const [weekAxis, dayAxis] = vertical
        ? (["y", "x"] as const)
        : (["x", "y"] as const);
      for (let i = 1; i < cells.length; i++) {
        const [a, b] = [cells[i - 1], cells[i]];
        if (a.day.slice(0, 4) !== b.day.slice(0, 4)) continue; // a new year section
        const sunday = new Date(`${b.day}T00:00:00Z`).getUTCDay() === 0;
        expect(b[weekAxis] - a[weekAxis]).toBe(sunday ? STEP : 0);
        expect(b[dayAxis] - a[dayAxis]).toBe(sunday ? -6 * STEP : STEP);
      }
    },
  );

  it("covers every day once, including the leap day", () => {
    const { cells } = layoutCalendar(2023, 2024, false);
    expect(cells).toHaveLength(365 + 366);
    expect(cells.map((c) => c.day)).toContain("2024-02-29");
    expect(new Set(cells.map((c) => c.day)).size).toBe(cells.length);
    expect(cells[0].t).toBe(0);
    expect(cells.at(-1)!.t).toBe(1);
  });

  it("puts each month label over the week of its first day", () => {
    const { cells, labels } = layoutCalendar(2024, 2024, false);
    const march1 = cells.find((c) => c.day === "2024-03-01")!;
    expect(labels.find((l) => l.text === "Mar")!.x).toBe(march1.x);
  });
});
