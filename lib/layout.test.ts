import { describe, it, expect } from "bun:test";
import {
  DESKTOP_SPLIT_QUERY,
  getHeatmapOrientation,
  getLayoutClassName,
  pickYearView,
} from "./layout";

describe("getHeatmapOrientation", () => {
  it.each([
    ["tent mode, not desktop-split", true, false, false, "horizontal"],
    ["tent mode, desktop-split", true, false, true, "horizontal"],
    ["book mode, not desktop-split", false, true, false, "vertical"],
    ["book mode, desktop-split", false, true, true, "vertical"],
    ["wide desktop-split grid", false, false, true, "horizontal"],
    ["plain stack (mobile, narrow window)", false, false, false, "vertical"],
  ] as const)(
    "%s",
    (_name, isTentMode, isBookMode, isDesktopSplit, expected) => {
      expect(
        getHeatmapOrientation({ isTentMode, isBookMode, isDesktopSplit }),
      ).toBe(expected);
    },
  );
});

describe("getLayoutClassName", () => {
  it.each([
    ["no data, not folded", false, false, false, "layout-stack"],
    ["data loaded", true, false, false, "layout-split"],
    ["folded without data", false, true, false, "layout-split split-no-data"],
    ["data and formOnRight", true, false, true, "layout-split split-reversed"],
    [
      "formOnRight ignored without data",
      false,
      true,
      true,
      "layout-split split-no-data",
    ],
    ["folded with data drops split-no-data", true, true, false, "layout-split"],
  ] as const)("%s", (_name, hasData, isFolded, formOnRight, expected) => {
    expect(getLayoutClassName({ hasData, isFolded, formOnRight })).toBe(
      expected,
    );
  });
});

describe("DESKTOP_SPLIT_QUERY", () => {
  it("matches the media query in app/globals.css", async () => {
    const css = await Bun.file(`${import.meta.dir}/../app/globals.css`).text();
    expect(css).toContain(`@media ${DESKTOP_SPLIT_QUERY} {`);
  });
});

describe("pickYearView", () => {
  const years = [2024, 2025, 2026];
  it.each([
    ["nothing picked, desktop", null, years, true, "all"],
    ["nothing picked, phone", null, years, false, 2026],
    ["a year the data has", 2025, years, true, 2025],
    ["a year the data no longer has", 2019, years, true, "all"],
    ["a year the data no longer has, phone", 2019, years, false, 2026],
    ["all with several years", "all", years, false, "all"],
    ["all with one year", "all", [2026], true, 2026],
    ["no data yet", null, [], true, "all"],
  ] as const)("%s", (_, picked, ys, split, expected) => {
    expect(pickYearView(picked, ys, split)).toBe(expected);
  });
});
