import type { ConversationSummary } from "./types";

/** The fields of a ChatGPT message that the count reads. */
interface RawGPTMessage {
  author?: { role?: string };
  create_time?: number | null;
  content?: { content_type?: string };
  metadata?: { is_visually_hidden_from_conversation?: boolean };
}

/** The fields of a ChatGPT conversation that the count reads. */
interface RawGPTConversation {
  title?: string | null;
  create_time?: number;
  mapping?: Record<string, { message?: RawGPTMessage | null } | null>;
}

/** The fields of a Claude conversation that the count reads. */
interface RawClaudeConversation {
  name?: string;
  created_at?: string;
  chat_messages?: { sender?: string; created_at?: string }[];
}

/** ChatGPT's launch day (UTC). No AI chat export has an earlier prompt, so an
 *  earlier time comes from a wrong clock or a broken file. */
export const FIRST_PROMPT = Date.UTC(2022, 10, 30);
/** A day in ms: a prompt time may be this far in the future (clock skew). */
const DAY = 24 * 60 * 60 * 1000;

/**
 * Sorts one prompt time into the summary.
 *
 * A time from ChatGPT's launch ({@link FIRST_PROMPT}) to one day from now
 * counts; any other time only adds to `outside`.
 *
 * @param summary - The chat summary to add to.
 * @param time - The prompt time, in ms since 1970.
 * @param latest - The latest time that counts, in ms since 1970.
 */
function keep(summary: ConversationSummary, time: number, latest: number) {
  if (time >= FIRST_PROMPT && time <= latest) summary.times.push(time);
  else summary.outside = (summary.outside ?? 0) + 1;
}

/** Width of the cached time blocks: 15 minutes in ms. */
const BLOCK = 15 * 60 * 1000;
/** The day function of the last zone used. Only one is kept: each one caches
 *  about 1 MB per 70,000 prompts, and the app shows one zone at a time. */
let cached: { timeZone: string; fn: (ms: number) => string } | undefined;

/**
 * Makes a function that maps a time to its local day in `timeZone`.
 *
 * @remarks
 * It caches the day of each 15-minute UTC block: every UTC offset in use is
 * a whole number of 15-minute steps, so local midnight falls on a block edge
 * and a block never spans two days. Formatting with Intl is the slow part,
 * so the cache makes a time zone change cheap.
 *
 * @param timeZone - The IANA zone, for example "Asia/Kolkata".
 * @returns A function from a time (ms since 1970) to its `YYYY-MM-DD` day.
 *   A second call with the same zone gives the same function ({@link cached}).
 */
export function dayFormatter(timeZone: string): (ms: number) => string {
  if (cached?.timeZone !== timeZone) {
    // sv-SE formats dates as YYYY-MM-DD.
    const fmt = new Intl.DateTimeFormat("sv-SE", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const cache = new Map<number, string>();
    const fn = (ms: number) => {
      const block = Math.floor(ms / BLOCK);
      let day = cache.get(block);
      if (day === undefined)
        cache.set(block, (day = fmt.format(block * BLOCK)));
      return day;
    };
    cached = { timeZone, fn };
  }
  return cached.fn;
}

/**
 * Tells if a ChatGPT message is a prompt the user typed and can see.
 *
 * @param m - One message from the `mapping` of a chat.
 * @returns True for a visible user prompt with a numeric time.
 * @see README.md, section "What a cell counts".
 */
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

/**
 * Tells a ChatGPT export from a Claude export.
 *
 * @param arr - The parsed export; only its first conversation is read.
 * @returns "chatgpt", "claude", or "unknown" for any other shape.
 */
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
 * Keeps the title and the prompt times of one ChatGPT conversation.
 *
 * @remarks
 * Every node in `mapping` counts, so edited prompts on other branches count
 * too. Malformed data and invalid times are skipped, never thrown.
 *
 * @param conversation - One parsed element of the export.
 * @returns The trimmed title ("" when missing or blank) and the prompt times in ms.
 * @see {@link isVisiblePrompt}, which picks the counted messages.
 */
export function summarizeChatGPT(conversation: unknown): ConversationSummary {
  const c = conversation as RawGPTConversation | null;
  const summary: ConversationSummary = {
    title: c?.title?.trim() ?? "",
    times: [],
  };
  const latest = Date.now() + DAY;
  for (const node of Object.values(c?.mapping ?? {})) {
    const m = node?.message;
    if (isVisiblePrompt(m) && Number.isFinite(m.create_time))
      keep(summary, m.create_time * 1000, latest);
  }
  return summary;
}

/**
 * Keeps the title and the human message times of one Claude conversation.
 *
 * @param conversation - One parsed element of the export.
 * @returns The trimmed title ("" when missing or blank) and the message times in ms.
 */
export function summarizeClaude(conversation: unknown): ConversationSummary {
  const c = conversation as RawClaudeConversation | null;
  const summary: ConversationSummary = {
    title: c?.name?.trim() ?? "",
    times: [],
  };
  const latest = Date.now() + DAY;
  for (const m of c?.chat_messages ?? []) {
    const t = m?.sender === "human" ? Date.parse(m.created_at ?? "") : NaN;
    if (Number.isFinite(t)) keep(summary, t, latest);
  }
  return summary;
}

/**
 * Summarizes a whole parsed ChatGPT export.
 *
 * @param raw - The parsed array of conversations.
 * @returns One summary per conversation, in export order.
 * @see {@link summarizeChatGPT}
 */
export const parseChatGPT = (raw: unknown[]) => raw.map(summarizeChatGPT);

/**
 * Summarizes a whole parsed Claude export.
 *
 * @param raw - The parsed array of conversations.
 * @returns One summary per conversation, in export order.
 * @see {@link summarizeClaude}
 */
export const parseClaude = (raw: unknown[]) => raw.map(summarizeClaude);
