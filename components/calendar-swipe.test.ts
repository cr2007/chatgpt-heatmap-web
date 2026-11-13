import { describe, expect, it } from "bun:test";
import { COMMIT, EDGE, FLING, startsSwipe, swipeTo } from "./calendar-swipe";

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

describe("startsSwipe", () => {
  const w = 400;
  const press = (
    pointerType: string,
    clientX = 200,
    button = 0,
    isPrimary = true,
  ) => ({
    pointerType,
    clientX,
    button,
    isPrimary,
  });
  it.each([
    ["a finger in the middle", press("touch"), true],
    ["a pen in the middle", press("pen"), true],
    ["a mouse with its main button", press("mouse"), true],
    ["a mouse at the screen edge (no back swipe)", press("mouse", 2), true],
    [
      "a finger at the left edge: the back swipe",
      press("touch", EDGE - 1),
      false,
    ],
    [
      "a pen at the right edge: the back swipe",
      press("pen", w - EDGE + 1),
      false,
    ],
    ["a finger just inside the edge", press("touch", EDGE), true],
    ["a right mouse button", press("mouse", 200, 2), false],
    ["a middle mouse button", press("mouse", 200, 1), false],
    ["a second finger", press("touch", 200, 0, false), false],
    ["an unknown pointer", press(""), false],
  ] as const)("%s", (_name, e, expected) => {
    expect(startsSwipe(e, w)).toBe(expected);
  });
});
