import { describe, it, expect } from "bun:test";
import { detectFormat, parseChatGPT, parseClaude } from "./parse";

describe("detectFormat", () => {
  it("identifies chatgpt format", () => {
    expect(detectFormat([{ create_time: 1000, mapping: {} }])).toBe("chatgpt");
  });
  it("identifies claude format", () => {
    expect(detectFormat([{ created_at: "2024-01-01T00:00:00Z", chat_messages: [] }])).toBe("claude");
  });
  it("returns unknown for empty array", () => {
    expect(detectFormat([])).toBe("unknown");
  });
  it("returns unknown for unrecognised shape", () => {
    expect(detectFormat([{ foo: "bar" }])).toBe("unknown");
  });
  it("rejects chatgpt shape with non-numeric create_time", () => {
    expect(detectFormat([{ create_time: "string", mapping: {} }])).toBe("unknown");
  });
});

describe("parseChatGPT", () => {
  const TZ = "UTC";

  it("parses title and create_day", () => {
    const [r] = parseChatGPT([{ title: "My chat", create_time: 1704067200, mapping: {} }], TZ);
    expect(r.title).toBe("My chat");
    expect(r.create_day).toBe("2024-01-01");
  });

  it("trims whitespace from title", () => {
    const [r] = parseChatGPT([{ title: "  Padded  ", create_time: 1704067200, mapping: {} }], TZ);
    expect(r.title).toBe("Padded");
  });

  it("falls back to Untitled for blank title", () => {
    const [r] = parseChatGPT([{ title: "", create_time: 1704067200, mapping: {} }], TZ);
    expect(r.title).toBe("Untitled");
  });

  it("collects only user message dates from mapping", () => {
    const [r] = parseChatGPT([{
      title: "Chat",
      create_time: 1704067200,
      mapping: {
        a: { message: { author: { role: "user" },      create_time: 1704153600 } },
        b: { message: { author: { role: "assistant" }, create_time: 1704240000 } },
        c: null,
      },
    }], TZ);
    expect(r.convo_create_day).toEqual(["2024-01-02"]);
  });

  it("skips user messages with zero create_time", () => {
    const [r] = parseChatGPT([{
      title: "Chat",
      create_time: 1704067200,
      mapping: { a: { message: { author: { role: "user" }, create_time: 0 } } },
    }], TZ);
    expect(r.convo_create_day).toHaveLength(0);
  });
});

describe("parseClaude", () => {
  const TZ = "UTC";

  it("parses name and created_at", () => {
    const [r] = parseClaude([{ name: "My project", created_at: "2024-03-15T10:00:00.000Z", chat_messages: [] }], TZ);
    expect(r.title).toBe("My project");
    expect(r.create_day).toBe("2024-03-15");
  });

  it("falls back to Untitled for blank name", () => {
    const [r] = parseClaude([{ name: "", created_at: "2024-01-01T00:00:00Z", chat_messages: [] }], TZ);
    expect(r.title).toBe("Untitled");
  });

  it("collects only human message dates", () => {
    const [r] = parseClaude([{
      name: "Chat",
      created_at: "2024-01-01T00:00:00Z",
      chat_messages: [
        { sender: "human",     created_at: "2024-01-02T00:00:00Z" },
        { sender: "assistant", created_at: "2024-01-02T01:00:00Z" },
        { sender: "human",     created_at: "2024-01-03T00:00:00Z" },
      ],
    }], TZ);
    expect(r.convo_create_day).toEqual(["2024-01-02", "2024-01-03"]);
  });
});
