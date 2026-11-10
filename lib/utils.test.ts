import { describe, expect, it } from "bun:test";
import { cn, plural, splitName } from "./utils";

describe("cn", () => {
  // Overrides like the ones components pass to cn(), with
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

describe("plural with large counts", () => {
  it("groups digits in the reader's locale", () => {
    expect(plural(1284, "chat")).toBe(`${(1284).toLocaleString()} chats`);
    expect(plural(1, "conversation")).toBe("1 conversation");
  });
});

describe("splitName", () => {
  it("keeps short names whole", () => {
    expect(splitName("conversations.json")).toEqual(["conversations.json", ""]);
  });
  it("keeps the end of a long name, with its extension", () => {
    expect(splitName("conversations (2) - Work laptop export.json")).toEqual([
      "conversations (2) - Work laptop ",
      "export.json",
    ]);
  });
});
