import type { ConversationSummary } from "./types";

interface RawGPTMessage {
  author?: { role?: string };
  create_time?: number | null;
  content?: { content_type?: string };
  metadata?: { is_visually_hidden_from_conversation?: boolean };
}

interface RawGPTConversation {
  title?: string;
  create_time?: number;
  mapping?: Record<string, { message?: RawGPTMessage | null } | null>;
}

interface RawClaudeConversation {
  name?: string;
  created_at?: string;
  chat_messages?: { sender?: string; created_at?: string }[];
}

/**
 * Returns a function that maps a timestamp (ms) to its `YYYY-MM-DD` day in
 * `timeZone`, or null for an invalid time. One formatter serves the whole
 * export, because building one per message is slow.
 */
function dayFormatter(timeZone: string): (ms: number) => string | null {
  // sv-SE formats dates as YYYY-MM-DD.
  const fmt = new Intl.DateTimeFormat("sv-SE", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  return (ms) => (Number.isFinite(ms) ? fmt.format(ms) : null);
}

/** True for a ChatGPT message the user typed and can see in the chat. */
function isVisiblePrompt(m: RawGPTMessage | null | undefined): m is RawGPTMessage & { create_time: number } {
  return (
    m?.author?.role === "user" &&
    typeof m.create_time === "number" &&
    !m.metadata?.is_visually_hidden_from_conversation &&
    m.content?.content_type !== "user_editable_context" // custom instructions
  );
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

/**
 * Turns a ChatGPT export into one summary per conversation. Every node in
 * `mapping` counts, so edited prompts on other branches count too.
 * Malformed conversations and times are skipped, never thrown.
 */
export function parseChatGPT(raw: unknown[], timeZone: string): ConversationSummary[] {
  const toDay = dayFormatter(timeZone);
  return (raw as RawGPTConversation[]).map((c) => ({
    title: c?.title?.trim() || "Untitled",
    days: Object.values(c?.mapping ?? {})
      .map((node) => node?.message)
      .filter(isVisiblePrompt)
      .flatMap((m) => toDay(m.create_time * 1000) ?? []),
  }));
}

/** Turns a Claude export into one summary per conversation, counting human messages. */
export function parseClaude(raw: unknown[], timeZone: string): ConversationSummary[] {
  const toDay = dayFormatter(timeZone);
  return (raw as RawClaudeConversation[]).map((c) => ({
    title: c?.name?.trim() || "Untitled",
    days: (c?.chat_messages ?? [])
      .filter((m) => m?.sender === "human")
      .flatMap((m) => toDay(Date.parse(m.created_at ?? "")) ?? []),
  }));
}
