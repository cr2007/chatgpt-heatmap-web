import { describe, it, expect } from "bun:test";
import { dayFormatter, detectFormat, parseChatGPT, parseClaude } from "./parse";

const FIXTURES = `${import.meta.dir}/../test/fixtures`;
const chatgpt = await Bun.file(`${FIXTURES}/chatgpt-export.json`).json();
const claude = await Bun.file(`${FIXTURES}/claude-export.json`).json();

/** The local days of one summary's prompt times. */
const daysIn = (s: { times: number[] }, tz: string) =>
  s.times.map(dayFormatter(tz));

/** Finds one parsed conversation by its title. */
const byTitle = <T extends { title: string }>(list: T[], title: string) =>
  list.find((c) => c.title === title)!;

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

describe("parseChatGPT", () => {
  const parsed = parseChatGPT(chatgpt);

  it("trims the title and falls back to Untitled", () => {
    expect(parsed.map((c) => c.title)).toContain("Untitled");
    expect(parsed.map((c) => c.title)).not.toContain("   ");
  });

  it("counts visible prompts, including edits, and skips hidden context", () => {
    expect(
      daysIn(byTitle(parsed, "Edit branch with hidden context"), "UTC"),
    ).toEqual(["2024-03-10", "2024-03-10"]);
  });

  it("skips prompts without a time and messages from other roles", () => {
    expect(daysIn(byTitle(parsed, "Null times and tools"), "UTC")).toEqual([
      "2024-07-01",
      "2024-07-01",
      "2024-07-01",
    ]);
  });

  it("gives an empty chat no prompt days", () => {
    expect(daysIn(byTitle(parsed, "Empty chat"), "UTC")).toEqual([]);
  });

  it("puts each prompt on its local day", () => {
    expect(
      daysIn(byTitle(parsed, "Null times and tools"), "Asia/Kolkata"),
    ).toEqual(["2024-07-01", "2024-07-01", "2024-07-02"]);
  });

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
  const parsed = parseClaude(claude);

  it("falls back to Untitled for a blank name", () => {
    expect(parsed.map((c) => c.title)).toContain("Untitled");
  });

  it("counts only human messages, on their local day", () => {
    expect(daysIn(byTitle(parsed, "Claude across midnight"), "UTC")).toEqual([
      "2024-03-10",
      "2024-03-10",
    ]);
    expect(
      daysIn(byTitle(parsed, "Claude across midnight"), "Asia/Kolkata"),
    ).toEqual(["2024-03-10", "2024-03-11"]);
  });

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
