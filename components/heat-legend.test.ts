import { describe, expect, it } from "bun:test";
import { ranges } from "./heat-legend";

describe("legend ranges", () => {
  it("names each level's prompts a day", () => {
    expect(ranges([3, 6, 12])).toEqual([
      "1 to 3 prompts",
      "4 to 6 prompts",
      "7 to 12 prompts",
      "13 or more",
    ]);
  });

  it("says when equal edges leave a level empty", () => {
    expect(ranges([1, 1, 2])).toEqual([
      "1 prompt",
      "no days",
      "2 prompts",
      "3 or more",
    ]);
  });
});
