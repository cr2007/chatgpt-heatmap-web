import { describe, expect, it } from "bun:test";
import { COMMIT, FLING, swipeTo } from "./calendar-swipe";

describe("swipeTo", () => {
  const w = 400;
  it.each([
    ["a slow pull past the share, to the left: next", -COMMIT * w, 0, 1],
    ["a slow pull past the share, to the right: previous", COMMIT * w, 0, -1],
    ["a slow short pull: none", -COMMIT * w + 1, -0.1, 0],
    ["a flick to the left: next", -FLING.distance, -FLING.speed, 1],
    ["a flick too short: none", -FLING.distance + 1, -1, 0],
    ["a flick too slow: none", -60, -FLING.speed + 0.01, 0],
    ["a long pull flicked back: none", -COMMIT * w - 50, FLING.speed, 0],
    ["no movement: none", 0, 0, 0],
  ] as const)("%s", (_name, dx, v, expected) => {
    expect(swipeTo(dx, v, w)).toBe(expected);
  });
});
