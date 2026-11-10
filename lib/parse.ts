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

/** Width of the cached time blocks: 15 minutes in ms. */
const BLOCK = 15 * 60 * 1000;
/** One day function per time zone, kept for the session. */
const dayFns = new Map<string, (ms: number) => string>();

/**
 * Returns a function that maps a timestamp (ms) to its `YYYY-MM-DD` day in
 * `timeZone`. It caches the day of each 15-minute UTC block: every UTC
 * offset in use is a whole number of 15-minute steps, so local midnight
 * falls on a block edge and a block never spans two days. Formatting with
 * Intl is the slow part, so the cache makes a time zone change cheap.
 */
export function dayFormatter(timeZone: string): (ms: number) => string {
  let fn = dayFns.get(timeZone);
  if (!fn) {
    // sv-SE formats dates as YYYY-MM-DD.
    const fmt = new Intl.DateTimeFormat("sv-SE", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const cache = new Map<number, string>();
    fn = (ms) => {
      const block = Math.floor(ms / BLOCK);
      let day = cache.get(block);
      if (day === undefined)
        cache.set(block, (day = fmt.format(block * BLOCK)));
      return day;
    };
    dayFns.set(timeZone, fn);
  }
  return fn;
}

/** True for a ChatGPT message the user typed and can see in the chat. */
function isVisiblePrompt(
  m: RawGPTMessage | null | undefined,
): m is RawGPTMessage & { create_time: number } {
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

  if (
    typeof el.create_time === "number" &&
    el.mapping &&
    typeof el.mapping === "object"
  )
    return "chatgpt";
  if (typeof el.created_at === "string" && Array.isArray(el.chat_messages))
    return "claude";

  return "unknown";
}

/**
 * Keeps the title and the prompt times (ms) of one ChatGPT conversation.
 * Every node in `mapping` counts, so edited prompts on other branches count
 * too. Malformed data and invalid times are skipped, never thrown.
 */
export function summarizeChatGPT(conversation: unknown): ConversationSummary {
  const c = conversation as RawGPTConversation | null;
  const times: number[] = [];
  for (const node of Object.values(c?.mapping ?? {})) {
    const m = node?.message;
    if (isVisiblePrompt(m) && Number.isFinite(m.create_time))
      times.push(m.create_time * 1000);
  }
  return { title: c?.title?.trim() || "Untitled", times };
}

/** Keeps the title and the human message times (ms) of one Claude conversation. */
export function summarizeClaude(conversation: unknown): ConversationSummary {
  const c = conversation as RawClaudeConversation | null;
  const times: number[] = [];
  for (const m of c?.chat_messages ?? []) {
    const t = m?.sender === "human" ? Date.parse(m.created_at ?? "") : NaN;
    if (Number.isFinite(t)) times.push(t);
  }
  return { title: c?.name?.trim() || "Untitled", times };
}

/** Summarizes a whole parsed ChatGPT export. */
export const parseChatGPT = (raw: unknown[]) => raw.map(summarizeChatGPT);

/** Summarizes a whole parsed Claude export. */
export const parseClaude = (raw: unknown[]) => raw.map(summarizeClaude);
