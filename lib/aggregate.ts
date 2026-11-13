import type {
  ConversationSummary,
  CalHeatmapDay,
  ChatCount,
  DayTitleBreakdown,
  Provider,
} from "./types";
import { dayFormatter } from "./parse";
import { quartiles, type Edges } from "./calendar-geometry";

/** The counts and ranges that the calendar and the figures read. */
export interface AggregatedData {
  /** Prompt counts per `YYYY-MM-DD` local day. */
  data: Record<string, CalHeatmapDay>;
  /** The chats of each local day, busiest first. */
  dayTitles: Record<string, DayTitleBreakdown>;
  /** Shade level edges per provider (see {@link quartiles}). */
  edges: Record<Provider, Edges>;
  /** First day with a prompt, as local midnight. */
  from: Date;
  /** Last day with a prompt, as local midnight. */
  to: Date;
  /** Distinct years that have a prompt, ascending. */
  years: number[];
}

/**
 * Counts prompts per local day in `timeZone` and per chat, for both providers.
 *
 * @remarks
 * A time zone change calls it again on the stored times; it never parses the
 * export again. {@link dayFormatter} makes that cheap.
 *
 * @param chatgptSummary - The ChatGPT chats, or null when none are loaded.
 * @param claudeSummary - The Claude chats, or null when none are loaded.
 * @param timeZone - The IANA zone that sets the local day.
 * @returns The day counts, the chats of each day, the shade edges, the date
 *   range and the years; null when no prompt has a time.
 * @see `summarize` in lib/stats.ts, which reads `data` for the figures.
 * @see test/oracle.test.ts, which checks the counts with `jq`.
 */
export function aggregateDateData(
  chatgptSummary: ConversationSummary[] | null,
  claudeSummary: ConversationSummary[] | null,
  timeZone: string,
): AggregatedData | null {
  const toDay = dayFormatter(timeZone);
  const data: Record<string, CalHeatmapDay> = {};
  const dayTitles: Record<string, DayTitleBreakdown> = {};

  // Step 1: Add one to the day and to the day's chat for each prompt, then
  // list each day's chats, busiest first.
  const sources: [Provider, ConversationSummary[] | null][] = [
    ["chatgpt", chatgptSummary],
    ["claude", claudeSummary],
  ];
  // Chats are keyed by their place in the export, so two chats with the same
  // title stay apart.
  const byChat: Record<string, Record<Provider, Map<number, ChatCount>>> = {};
  for (const [source, summaries] of sources) {
    summaries?.forEach(({ title, times }, chat) => {
      for (const time of times) {
        const day = toDay(time);
        data[day] ??= { chatgpt: 0, claude: 0 };
        data[day][source]++;
        const chats = (byChat[day] ??= {
          chatgpt: new Map(),
          claude: new Map(),
        })[source];
        const entry = chats.get(chat) ?? { title, count: 0 };
        entry.count++;
        chats.set(chat, entry);
      }
    });
  }
  // Busiest chat first; a tie keeps export order (Array.sort is stable).
  const byCount = (m: Map<number, ChatCount>) =>
    [...m.values()].sort((a, b) => b.count - a.count);
  for (const [day, { chatgpt, claude }] of Object.entries(byChat)) {
    dayTitles[day] = { chatgpt: byCount(chatgpt), claude: byCount(claude) };
  }

  // Step 2: Derive the shade edges per provider, the date range and the years.
  const allDays = Object.keys(data).sort();
  if (allDays.length === 0) return null;
  const counts = Object.values(data);

  return {
    data,
    dayTitles,
    edges: {
      chatgpt: quartiles(counts.map((c) => c.chatgpt)),
      claude: quartiles(counts.map((c) => c.claude)),
    },
    from: new Date(allDays[0] + "T00:00:00"),
    to: new Date(allDays[allDays.length - 1] + "T00:00:00"),
    years: [...new Set(allDays.map((d) => Number(d.slice(0, 4))))],
  };
}
