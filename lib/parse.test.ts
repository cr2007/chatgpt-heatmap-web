import { describe, it, expect } from "bun:test";
import { dayFormatter, detectFormat, parseChatGPT, parseClaude } from "./parse";

const FIXTURES = `${import.meta.dir}/../test/fixtures`;
const chatgpt = await Bun.file(`${FIXTURES}/chatgpt-export.json`).json();
const claude = await Bun.file(`${FIXTURES}/claude-export.json`).json();

describe("detectFormat", () => {
  it.each([
    ["chatgpt", chatgpt],
    ["claude", claude],
    ["unknown", []],
    ["unknown", [{ foo: "bar" }]],
    ["unknown", [{ create_time: "string", mapping: {} }]],
  ] as [ReturnType<typeof detectFormat>, unknown[]][])(
    "detects %s",
    (expected, input) => {
      expect(detectFormat(input)).toBe(expected);
    },
  );
});

describe("titles", () => {
  it.each([
    ["chatgpt", parseChatGPT(chatgpt)],
    ["claude", parseClaude(claude)],
  ])("%s trims titles and falls back to Untitled", (_name, parsed) => {
    const titles = parsed.map((c) => c.title);
    expect(titles).toContain("Untitled");
    expect(titles).not.toContain("   ");
  });
});

describe("parseChatGPT", () => {
  it("skips malformed conversations and times instead of throwing", () => {
    const bad = [
      { title: "No mapping", create_time: 1 },
      {
        title: "Bad time",
        create_time: 1,
        mapping: {
          a: {
            message: {
              author: { role: "user" },
              create_time: Number.NaN,
              content: { content_type: "text" },
            },
          },
        },
      },
    ];
    expect(parseChatGPT(bad).flatMap((c) => c.times)).toEqual([]);
  });
});

describe("parseClaude", () => {
  it("skips malformed conversations and times instead of throwing", () => {
    const bad = [
      { name: "No messages", created_at: "2024-01-01T00:00:00Z" },
      {
        name: "Bad time",
        created_at: "x",
        chat_messages: [{ sender: "human", created_at: "not a date" }],
      },
    ];
    expect(parseClaude(bad).flatMap((c) => c.times)).toEqual([]);
  });
});

describe("dayFormatter", () => {
  // Offsets of +5:30, +5:45 and +12:45, and zones with daylight saving time.
  const zones = [
    "UTC",
    "Asia/Kolkata",
    "Asia/Kathmandu",
    "Pacific/Chatham",
    "America/New_York",
    "Europe/London",
    "Australia/Lord_Howe",
  ];

  it("matches Intl for any time, although it caches 15-minute blocks", () => {
    let seed = 7;
    const random = () =>
      (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    for (const timeZone of zones) {
      const plain = new Intl.DateTimeFormat("sv-SE", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const cached = dayFormatter(timeZone);
      for (let i = 0; i < 20_000; i++) {
        const ms =
          Date.UTC(2020, 0, 1) + Math.floor(random() * 7 * 365 * 864e5);
        if (cached(ms) !== plain.format(ms))
          throw new Error(`${timeZone} at ${new Date(ms).toISOString()}`);
      }
    }
  });
});
