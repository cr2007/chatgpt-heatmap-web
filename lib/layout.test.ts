import { describe, it, expect } from "bun:test";
import {
  DESKTOP_SPLIT_QUERY,
  getHeatmapOrientation,
  getLayoutClassName,
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
