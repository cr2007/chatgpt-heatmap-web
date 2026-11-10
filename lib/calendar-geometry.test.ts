import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import {
  CELL,
  fitScale,
  layoutCalendar,
  level,
  quartiles,
} from "./calendar-geometry";

const STEP = CELL + 2;

describe("quartiles and level", () => {
  it("ignores days with no prompts", () => {
    expect(quartiles([0, 0, 1, 2, 3, 4])).toEqual([1, 2, 3]);
  });

  it("keeps one very busy day from flattening the rest", () => {
    // 812 prompts on one day: the other days must still use all levels.
    const counts = [1, 2, 3, 4, 5, 6, 7, 8, 812];
    const edges = quartiles(counts);
    expect(counts.map((n) => level(n, edges))).toEqual([
      1, 1, 1, 2, 2, 3, 3, 4, 4,
    ]);
  });

  it("puts equal days on one level, and no prompts on level 0", () => {
    const edges = quartiles([5, 5, 5]);
    expect(level(5, edges)).toBe(1);
    expect(level(0, edges)).toBe(0);
    expect(quartiles([])).toEqual([0, 0, 0]);
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

describe("fitScale", () => {
  const layout = { width: 131, height: 745 }; // one year, vertical

  it("recovers after a narrow moment where the page scrolls", () => {
    // The panel height there is the calendar's own height from the last render.
    let size = { width: 342, height: 745 };
    size = {
      width: 72,
      height: 745 * fitScale({ width: 72, height: size.height }, layout, false),
    };
    expect(fitScale({ width: 342, height: size.height }, layout, false)).toBe(
      1,
    );
  });

  it("fits both sides of a fixed-height panel, and may grow", () => {
    expect(fitScale({ width: 600, height: 1490 }, layout, true)).toBe(2);
    expect(fitScale({ width: 600, height: 372.5 }, layout, true)).toBe(0.5);
  });

  it("is 1 before the panel is measured", () => {
    expect(fitScale({ width: 0, height: 0 }, layout, false)).toBe(1);
  });
});
