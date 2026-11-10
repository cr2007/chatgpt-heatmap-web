import type {
  ConversationSummary,
  CalHeatmapDay,
  ChatCount,
  DayTitleBreakdown,
  Provider,
} from "./types";
import { dayFormatter } from "./parse";
import { quartiles, type Edges } from "./calendar-geometry";

export interface AggregatedData {
  data: Record<string, CalHeatmapDay>;
  dayTitles: Record<string, DayTitleBreakdown>;
  /** Shade level edges per provider (see `quartiles`). */
  edges: Record<Provider, Edges>;
  /** First and last day with a prompt, as local midnight. */
  from: Date;
  to: Date;
  /** Distinct years that have a prompt, ascending. */
  years: number[];
}

/**
 * Counts prompts per local day in `timeZone` and per chat, for both providers.
 *
 * Step 1: Add one to the day and to the day's chat for each prompt, then
 *         list each day's chats, busiest first.
 * Step 2: Derive the shade edges per provider, the date range and the years.
 */
export function aggregateDateData(
  chatgptSummary: ConversationSummary[] | null,
  claudeSummary: ConversationSummary[] | null,
  timeZone: string,
): AggregatedData | null {
  const toDay = dayFormatter(timeZone);
  const data: Record<string, CalHeatmapDay> = {};
  const dayTitles: Record<string, DayTitleBreakdown> = {};

  // Step 1
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

  // Step 2
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
