import { describe, it, expect } from "bun:test";
import { foldPosture, getHeatmapOrientation, pickYearView } from "./layout";

describe("getHeatmapOrientation", () => {
  it.each([
    ["tent posture, medium (an open Fold)", "tent", false, true, "horizontal"],
    [
      "tent posture, narrow (a Flip in Flex mode)",
      "tent",
      false,
      false,
      "vertical",
    ],
    ["book posture", "book", true, true, "vertical"],
    ["desktop or expanded window", undefined, true, true, "horizontal"],
    [
      "medium window, not expanded (a tablet in portrait)",
      undefined,
      false,
      true,
      "vertical",
    ],
    ["phone or narrow window", undefined, false, false, "vertical"],
  ] as const)("%s", (_name, posture, isWide, isMedium, expected) => {
    expect(getHeatmapOrientation({ posture, isWide, isMedium })).toBe(expected);
  });
});

describe("foldPosture", () => {
  /** Two halves of a 744x860 Galaxy Z Fold 6 inner screen (DevTools sizes). */
  const sideBySide = [
    { x: 0, y: 0, width: 372, height: 860 },
    { x: 372, y: 0, width: 372, height: 860 },
  ];
  const stacked = [
    { x: 0, y: 0, width: 860, height: 372 },
    { x: 0, y: 372, width: 860, height: 372 },
  ];
  /** Surface Duo: two screens and a 34 px hinge, side by side in a landscape window. */
  const duo = [
    { x: 0, y: 0, width: 540, height: 720 },
    { x: 574, y: 0, width: 540, height: 720 },
  ];
  const one = [{ x: 0, y: 0, width: 744, height: 860 }];
  it.each([
    ["segments side by side, folded", sideBySide, true, true, "book"],
    ["segments stacked, folded", stacked, true, false, "tent"],
    ["two screens side by side in landscape", duo, false, false, "book"],
    ["a seamless fold lying flat", sideBySide, false, true, undefined],
    ["one segment, even when folded", one, true, true, undefined],
    ["no segments API, folded portrait", undefined, true, true, "book"],
    ["no segments API, folded landscape", undefined, true, false, "tent"],
    ["no segments API, not folded", undefined, false, true, undefined],
  ] as const)("%s", (_name, segments, folded, portrait, expected) => {
    expect(foldPosture(segments, folded, portrait)).toBe(expected);
  });
});

describe("pickYearView", () => {
  const years = [2024, 2025, 2026];
  it.each([
    ["nothing picked: every year", null, years, "all"],
    ["nothing picked, one year", null, [2026], 2026],
    ["a year the data has", 2025, years, 2025],
    ["a year the data no longer has", 2019, years, "all"],
    ["all with several years", "all", years, "all"],
    ["all with one year", "all", [2026], 2026],
    ["no data yet", null, [], "all"],
  ] as const)("%s", (_, picked, ys, expected) => {
    expect(pickYearView(picked, ys)).toBe(expected);
  });
});
