import { describe, expect, test } from "bun:test";
import { magnet, project, rubber } from "@/components/year-tabs";

describe("magnet", () => {
  test("holds the pill on a tab near each end, and crosses the middle faster", () => {
    expect(magnet(0.1, 0.22)).toBe(0);
    expect(magnet(0.22, 0.22)).toBe(0);
    expect(magnet(0.5, 0.22)).toBeCloseTo(0.5);
    expect(magnet(0.78, 0.22)).toBeCloseTo(1);
    expect(magnet(0.95, 0.22)).toBe(1);
  });

  test("never jumps: small steps of the pointer make small steps of the pill", () => {
    let last = 0;
    for (let t = 0; t <= 1; t += 0.01) {
      const m = magnet(t, 0.22);
      expect(m).toBeGreaterThanOrEqual(last);
      expect(m - last).toBeLessThan(0.02);
      last = m;
    }
  });
});

describe("rubber", () => {
  test("gives way less the further it is pulled, and never past its room", () => {
    expect(rubber(0, 40)).toBe(0);
    expect(rubber(20, 40)).toBeLessThan(20);
    expect(rubber(80, 40) - rubber(40, 40)).toBeLessThan(rubber(40, 40));
    expect(rubber(10_000, 40)).toBeLessThan(40);
  });
});

describe("project", () => {
  test("a flick carries on in its direction; no speed, no carry", () => {
    expect(project(0)).toBe(0);
    expect(project(1)).toBeCloseTo(99);
    expect(project(-0.5)).toBeCloseTo(-49.5);
  });
});
