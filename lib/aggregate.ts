import type {
  ConversationSummary,
  CalHeatmapDay,
  DayTitleBreakdown,
  Provider,
} from "./types";

export interface AggregatedData {
  data: Record<string, CalHeatmapDay>;
  dayTitles: Record<string, DayTitleBreakdown>;
  maxChatgpt: number;
  maxClaude: number;
  /** First and last day with a prompt, as local midnight. */
  from: Date;
  to: Date;
  /** Distinct years that have a prompt, ascending. */
  years: number[];
}

/**
 * Counts prompts per day and per title for both providers.
 *
 * Step 1: Add one to the day and to the day's title for each prompt day.
 * Step 2: Derive the busiest day per provider, the date range and the years.
 */
export function aggregateDateData(
  chatgptSummary: ConversationSummary[] | null,
  claudeSummary: ConversationSummary[] | null,
): AggregatedData | null {
  const data: Record<string, CalHeatmapDay> = {};
  const dayTitles: Record<string, DayTitleBreakdown> = {};

  // Step 1
  const sources: [Provider, ConversationSummary[] | null][] = [
    ["chatgpt", chatgptSummary],
    ["claude", claudeSummary],
  ];
  for (const [source, summaries] of sources) {
    for (const { title, days } of summaries ?? []) {
      for (const day of days) {
        data[day] ??= { chatgpt: 0, claude: 0 };
        data[day][source]++;
        dayTitles[day] ??= { chatgpt: {}, claude: {} };
        dayTitles[day][source][title] =
          (dayTitles[day][source][title] ?? 0) + 1;
      }
    }
  }

  // Step 2
  const allDays = Object.keys(data).sort();
  if (allDays.length === 0) return null;
  const counts = Object.values(data);

  return {
    data,
    dayTitles,
    maxChatgpt: Math.max(...counts.map((c) => c.chatgpt)),
    maxClaude: Math.max(...counts.map((c) => c.claude)),
    from: new Date(allDays[0] + "T00:00:00"),
    to: new Date(allDays[allDays.length - 1] + "T00:00:00"),
    years: [...new Set(allDays.map((d) => Number(d.slice(0, 4))))],
  };
}
