import { describe, expect, it } from "bun:test";
import { matchZone, zoneList } from "./time-zones";

describe("zoneList", () => {
  it("adds UTC and the computer's zone when the engine's list lacks them", () => {
    // Chromium's list has no "UTC"; a legacy name can be missing too.
    expect(zoneList("Asia/Calcutta", ["Asia/Kolkata", "Europe/Paris"])).toEqual(
      ["UTC", "Asia/Calcutta", "Asia/Kolkata", "Europe/Paris"],
    );
  });

  it("keeps one copy of each zone", () => {
    expect(zoneList("UTC", ["UTC", "Europe/Paris"])).toEqual([
      "UTC",
      "Europe/Paris",
    ]);
  });
});

describe("matchZone", () => {
  const zones = ["UTC", "America/New_York", "Asia/Kolkata"];

  it.each([
    ["Asia/Kolkata", "Asia/Kolkata"],
    ["  utc ", "UTC"],
    ["america/new york", "America/New_York"],
    ["Asia/Kolk", null],
    ["Mars/Base", null],
    ["", null],
  ])("matches %p to %p", (text, expected) => {
    expect(matchZone(text, zones)).toBe(expected);
  });
});
