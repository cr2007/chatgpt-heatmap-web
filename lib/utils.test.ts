import { describe, expect, it } from "bun:test";
import { cn, plural } from "./utils";

describe("cn", () => {
  // Overrides like the ones components pass to the shadcn parts, with
  // Tailwind v4 class names that tailwind-merge must know.
  it.each([
    [["px-3 py-1", "px-4"], "py-1 px-4"],
    [["h-10 w-full", "h-9"], "w-full h-9"],
    [["shadow-xs", "shadow-lg"], "shadow-lg"],
    [["outline-hidden", "outline-2"], "outline-hidden outline-2"],
    [["rounded-sm", "rounded-xs"], "rounded-xs"],
    [["bg-white", false, "dark:bg-zinc-900"], "bg-white dark:bg-zinc-900"],
  ])("merges %j", (inputs, expected) => {
    expect(cn(...inputs)).toBe(expected);
  });
});

describe("plural", () => {
  it.each([
    [1, "1 message"],
    [0, "0 messages"],
    [3, "3 messages"],
  ])("writes %d", (n, expected) => {
    expect(plural(n, "message")).toBe(expected);
  });
});
