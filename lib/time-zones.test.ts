import { describe, expect, it } from "bun:test";
import {
  buildIndex,
  distance,
  nearestFirst,
  placeOf,
  searchZones,
  zoneList,
} from "./time-zones";

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

describe("searchZones", () => {
  // January: no daylight saving time in the north, so offsets are fixed.
  const index = buildIndex(zoneList(), new Date(Date.UTC(2026, 0, 15)));
  const first = (q: string) => searchZones(index, q)[0]?.zone;
  const resolve = (z: string) =>
    new Intl.DateTimeFormat("en", { timeZone: z }).resolvedOptions().timeZone;

  /** Query, then the zone it must find first. */
  it.each([
    ["dubai", "Asia/Dubai"],
    ["Asia/Dubai", "Asia/Dubai"],
    ["new york", "America/New_York"],
    ["new_york", "America/New_York"],
    ["utc", "UTC"],
    ["kolkata", "Asia/Kolkata"],
    ["calcutta", "Asia/Kolkata"],
    ["kyiv", "Europe/Kyiv"],
    ["sao paulo", "America/Sao_Paulo"],
    ["são paulo", "America/Sao_Paulo"],
    ["ist", "Asia/Kolkata"],
    ["PST", "America/Los_Angeles"],
    ["gulf standard", "Asia/Dubai"],
    ["india standard time", "Asia/Kolkata"],
    // Typos: 1 wrong letter in a short name, 2 in a long one.
    ["dubay", "Asia/Dubai"],
    ["londn", "Europe/London"],
    ["tokio", "Asia/Tokyo"],
    ["newyork", "America/New_York"],
    ["singapur", "Asia/Singapore"],
    ["jerusalm", "Asia/Jerusalem"],
    ["johanesburg", "Africa/Johannesburg"],
    // Countries (Intl.DisplayNames from the tzdata country code).
    ["india", "Asia/Kolkata"],
    ["germany", "Europe/Berlin"],
    ["united arab emirates", "Asia/Dubai"],
    ["japan", "Asia/Tokyo"],
  ])("%s finds %s first", (q, zone) => {
    expect(first(q)).toBe(resolve(zone));
  });

  it("matches offsets in any common form", () => {
    for (const q of ["+4", "gmt+4", "UTC+04:00", "+04"])
      expect(searchZones(index, q).map((e) => e.zone)).toContain("Asia/Dubai");
    expect(searchZones(index, "+5:30").map((e) => e.zone)).toContain(
      resolve("Asia/Kolkata"),
    );
  });

  it("lists every candidate of an ambiguous abbreviation first", () => {
    expect(
      searchZones(index, "ist")
        .slice(0, 3)
        .map((e) => e.zone),
    ).toEqual(["Asia/Kolkata", "Europe/Dublin", "Asia/Jerusalem"].map(resolve));
  });

  it("finds nothing for text that is no zone", () => {
    expect(searchZones(index, "zzzz")).toEqual([]);
    expect(searchZones(index, "Mars/Base")).toEqual([]);
  });
});

describe("nearestFirst", () => {
  const date = new Date(Date.UTC(2026, 0, 15));
  /** Home zone, then the zones that must follow UTC, in order. The
   *  neighbours are real: Dhaka is 245 km from Kolkata, Toronto 550 km
   *  from New York (tzdata coordinates, 0.1 degree). */
  it.each([
    ["Asia/Dubai", ["Asia/Dubai", "Asia/Qatar", "Asia/Muscat", "Asia/Bahrain"]],
    ["Asia/Kolkata", ["Asia/Kolkata", "Asia/Dhaka", "Asia/Thimphu"]],
    [
      "America/New_York",
      ["America/New_York", "America/Toronto", "America/Detroit"],
    ],
    ["Europe/London", ["Europe/London", "Europe/Guernsey", "Europe/Jersey"]],
  ] as const)("from %s", (home, after) => {
    const resolve = (z: string) =>
      new Intl.DateTimeFormat("en", { timeZone: z }).resolvedOptions().timeZone;
    const list = nearestFirst(buildIndex(zoneList(home), date, home)).map(
      (e) => e.zone,
    );
    expect(list.slice(0, after.length + 1)).toEqual(
      ["UTC", ...after].map((z) => (z === "UTC" ? z : resolve(z))),
    );
  });

  it("finds the place of a legacy name and measures in km", () => {
    const kolkata = placeOf("Asia/Calcutta")!;
    expect(kolkata.cc).toBe("IN");
    // Kolkata to Dhaka by great circle: about 245 km.
    expect(Math.round(distance(kolkata, placeOf("Asia/Dhaka")!))).toBeWithin(
      235,
      255,
    );
    expect(placeOf("UTC")).toBeUndefined();
  });
});
