import { describe, expect, it } from "bun:test";
import { sampleYear } from "./sample";

describe("sampleYear", () => {
  it("is the same on every call, so the example does not change", () => {
    expect(sampleYear()).toEqual(sampleYear());
  });

  it("covers 2025 only, with both providers", () => {
    const { data } = sampleYear();
    const days = Object.keys(data);
    expect(days.every((d) => d.startsWith("2025-"))).toBe(true);
    expect(days.some((d) => data[d].chatgpt > 0)).toBe(true);
    expect(days.some((d) => data[d].claude > 0)).toBe(true);
  });
});
