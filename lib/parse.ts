import type { ConversationSummary } from "./types";

interface RawGPTEntry {
  message: { author: { role: string }; create_time: number } | null;
}

interface RawGPTConversation {
  title: string;
  create_time: number;
  mapping: Record<string, RawGPTEntry | null>;
}

interface RawClaudeMessage {
  sender: string;
  created_at: string;
}

interface RawClaudeConversation {
  name: string;
  created_at: string;
  chat_messages: RawClaudeMessage[];
}

function toDateSE(date: Date, timeZone: string): string {
  return date.toLocaleDateString("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function detectFormat(arr: unknown[]): "chatgpt" | "claude" | "unknown" {
  if (!arr.length) return "unknown";
  const el = arr[0] as Record<string, unknown>;

  if (typeof el.create_time === "number" && el.mapping && typeof el.mapping === "object")
    return "chatgpt";
  if (typeof el.created_at === "string" && Array.isArray(el.chat_messages))
    return "claude";

  return "unknown";
}

export function parseChatGPT(raw: unknown[], timeZone: string): ConversationSummary[] {
  return (raw as RawGPTConversation[]).map((c) => ({
    title: c.title?.trim() || "Untitled",
    create_day: toDateSE(new Date(c.create_time * 1000), timeZone),
    convo_create_day: Object.values(c.mapping)
      .filter((e): e is RawGPTEntry => e?.message?.author.role === "user")
      .flatMap((e) =>
        e.message?.create_time
          ? [toDateSE(new Date(e.message.create_time * 1000), timeZone)]
          : []
      ),
  }));
}

export function parseClaude(raw: unknown[], timeZone: string): ConversationSummary[] {
  return (raw as RawClaudeConversation[]).map((c) => ({
    title: c.name?.trim() || "Untitled",
    create_day: toDateSE(new Date(c.created_at), timeZone),
    convo_create_day: c.chat_messages
      .filter((m) => m.sender === "human")
      .map((m) => toDateSE(new Date(m.created_at), timeZone)),
  }));
}
