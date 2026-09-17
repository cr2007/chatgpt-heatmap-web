import { describe, it, expect } from "bun:test";
import { getHeatmapOrientation, getLayoutClassName } from "./layout";

describe("getHeatmapOrientation", () => {
  it("is always horizontal in tent mode, regardless of desktop-split", () => {
    expect(getHeatmapOrientation({ isTentMode: true, isBookMode: false, isDesktopSplit: false })).toBe("horizontal");
    expect(getHeatmapOrientation({ isTentMode: true, isBookMode: false, isDesktopSplit: true })).toBe("horizontal");
  });

  it("is always vertical in book mode, regardless of desktop-split", () => {
    expect(getHeatmapOrientation({ isTentMode: false, isBookMode: true, isDesktopSplit: false })).toBe("vertical");
    expect(getHeatmapOrientation({ isTentMode: false, isBookMode: true, isDesktopSplit: true })).toBe("vertical");
  });

  it("is horizontal in the wide desktop-split grid", () => {
    expect(getHeatmapOrientation({ isTentMode: false, isBookMode: false, isDesktopSplit: true })).toBe("horizontal");
  });

  it("is vertical in the plain stacked layout (mobile, narrow desktop window)", () => {
    expect(getHeatmapOrientation({ isTentMode: false, isBookMode: false, isDesktopSplit: false })).toBe("vertical");
  });
});

describe("getLayoutClassName", () => {
  it("uses layout-stack when there is no data and nothing is folded", () => {
    expect(getLayoutClassName({ hasData: false, isFolded: false, formOnRight: false })).toBe("layout-stack");
  });

  it("switches to layout-split once data is loaded", () => {
    expect(getLayoutClassName({ hasData: true, isFolded: false, formOnRight: false })).toBe("layout-split");
  });

  it("switches to layout-split when folded, even without data", () => {
    expect(getLayoutClassName({ hasData: false, isFolded: true, formOnRight: false })).toBe("layout-split split-no-data");
  });

  it("adds split-reversed only when data is loaded and formOnRight is set", () => {
    expect(getLayoutClassName({ hasData: true, isFolded: false, formOnRight: true })).toBe("layout-split split-reversed");
  });

  it("ignores formOnRight when there is no data", () => {
    expect(getLayoutClassName({ hasData: false, isFolded: true, formOnRight: true })).toBe("layout-split split-no-data");
  });

  it("drops split-no-data once data is loaded", () => {
    expect(getLayoutClassName({ hasData: true, isFolded: true, formOnRight: false })).toBe("layout-split");
  });
});
