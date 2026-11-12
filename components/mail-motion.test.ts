import { describe, expect, test } from "bun:test";
import {
  cardsFor,
  fileSize,
  MAX_CARDS,
  spring,
} from "@/components/mail-motion";

/** The points of a CSS linear() easing. */
const points = (easing: string) => easing.slice(7, -1).split(", ").map(Number);

describe("spring", () => {
  test("a stopped spring ends where it first reaches its target", () => {
    const { easing, duration } = spring(0.65, 200, true);
    const p = points(easing);
    expect(duration).toBe(66);
    expect(p[0]).toBe(0);
    expect(p.at(-1)).toBe(1);
    // No overshoot: it only moves toward the target.
    expect(p.every((v, i) => i === 0 || v >= p[i - 1])).toBe(true);
    expect(Math.max(...p)).toBe(1);
  });

  test("a free spring overshoots and settles at its target", () => {
    const p = points(spring(0.3, 400).easing);
    expect(Math.max(...p)).toBeGreaterThan(1);
    expect(p.at(-1)).toBe(1);
  });
});

describe("cards", () => {
  const file = (name: string, size: number) => ({ name, size });

  test("one card per file, up to the limit", () => {
    const cards = cardsFor([file("a.json", 512), file("b.json", 16_000)]);
    expect(cards).toEqual([
      { name: "a.json", meta: "512 B" },
      { name: "b.json", meta: "16 kB" },
    ]);
  });

  test("the last card holds the rest", () => {
    const files = Array.from({ length: MAX_CARDS + 2 }, (_, i) =>
      file(`${i}.json`, 1_000_000),
    );
    const cards = cardsFor(files);
    expect(cards).toHaveLength(MAX_CARDS);
    expect(cards.at(-1)).toEqual({ name: "3 more files", meta: "3 MB" });
  });

  test("sizes", () => {
    expect(fileSize(0)).toBe("0 B");
    expect(fileSize(34_900_000)).toBe("34.9 MB");
  });
});
