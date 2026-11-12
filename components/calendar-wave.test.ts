import { describe, expect, test } from "bun:test";
import { shape, startDelay } from "@/components/calendar-wave";
import { placeBack } from "@/components/calendar-morph";

/** The upward move (SVG units) in a transform made by `shape`. */
const lift = (t: string) =>
  -Number(/translate\(0px, (-?[\d.]+)px\)/.exec(t)![1]);

describe("startDelay", () => {
  test("the wave runs left to right to a later year, right to left to an earlier one", () => {
    expect(startDelay(0, 53, 1)).toBe(0);
    expect(startDelay(52, 53, 1)).toBe(600);
    expect(startDelay(52, 53, -1)).toBe(0);
    expect(startDelay(0, 53, -1)).toBe(600);
  });

  test("7 weekday columns (a vertical calendar) take as long as 53 week columns", () => {
    expect(startDelay(6, 7, 1)).toBe(600);
    expect(startDelay(3, 7, 1)).toBe(300);
  });

  test("one column starts at once", () => {
    expect(startDelay(0, 1, 1)).toBe(0);
  });
});

describe("shape", () => {
  test("at rest a cell does not move", () => {
    expect(shape(5.5, 89, { lift: 0, v: 1 })).toBe(
      "translate(0px, 0px) scale(1, 1)",
    );
  });

  test("at the top the column has jumped 9 units", () => {
    expect(lift(shape(5.5, 89, { lift: 1, v: 1 }))).toBeCloseTo(9);
  });

  test("a squash against the ceiling packs the lower cells up under it", () => {
    const squash = { lift: 1, v: 0.96, h: 1.02 };
    expect(lift(shape(83.5, 89, squash))).toBeGreaterThan(
      lift(shape(5.5, 89, squash)),
    );
  });

  test("a year-long column (vertical calendar) squashes like 7 cells, not 53", () => {
    const squash = { lift: 1, v: 0.96 };
    expect(lift(shape(689, 689, squash)) - 9).toBeCloseTo(
      lift(shape(91, 91, squash)) - 9,
    );
  });
});

describe("placeBack", () => {
  test("a calendar pushed down on a scrolled page is scrolled back", () => {
    expect(placeBack(12, 200)).toEqual({ scroll: 12, pad: 0 });
  });

  test("a calendar pulled up at the top of the page gets padding", () => {
    expect(placeBack(-12, 0)).toEqual({ scroll: 0, pad: 12 });
  });

  test("scrolls as far as the page allows, then pads the rest", () => {
    expect(placeBack(-30, 10)).toEqual({ scroll: -10, pad: 20 });
  });
});
