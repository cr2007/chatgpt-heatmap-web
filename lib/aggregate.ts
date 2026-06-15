import type { ConversationSummary, CalHeatmapDay, DayTitleBreakdown } from "./types";

export interface AggregatedData {
  data: Record<string, CalHeatmapDay>;
  dayTitles: Record<string, DayTitleBreakdown>;
  maxChatgpt: number;
  maxClaude: number;
  from: Date;
  to: Date;
}

function buildFrequencyMap(summaries: ConversationSummary[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const item of summaries) {
    map[item.create_day] = (map[item.create_day] || 0) + 1;
    for (const d of item.convo_create_day) {
      map[d] = (map[d] || 0) + 1;
    }
  }
  return map;
}

function buildTitleCounts(
  summaries: ConversationSummary[],
  source: "chatgpt" | "claude",
  dayTitles: Record<string, DayTitleBreakdown>
): void {
  for (const item of summaries) {
    const activeDays = new Set([item.create_day, ...item.convo_create_day]);
    for (const day of activeDays) {
      const count =
        (item.create_day === day ? 1 : 0) +
        item.convo_create_day.filter((d) => d === day).length;
      if (count === 0) continue;
      if (!dayTitles[day]) dayTitles[day] = { chatgpt: {}, claude: {} };
      dayTitles[day][source][item.title] =
        (dayTitles[day][source][item.title] || 0) + count;
    }
  }
}

export function aggregateDateData(
  chatgptSummary: ConversationSummary[] | null,
  claudeSummary: ConversationSummary[] | null
): AggregatedData | null {
  const chatgptPerDay = chatgptSummary ? buildFrequencyMap(chatgptSummary) : {};
  const claudePerDay  = claudeSummary  ? buildFrequencyMap(claudeSummary)  : {};

  const allDates = [...Object.keys(chatgptPerDay), ...Object.keys(claudePerDay)].sort();
  if (allDates.length === 0) return null;

  const from = new Date(allDates[0] + "T00:00:00");
  const to   = new Date(allDates[allDates.length - 1] + "T00:00:00");

  const maxChatgpt = Math.max(0, ...Object.values(chatgptPerDay));
  const maxClaude  = Math.max(0, ...Object.values(claudePerDay));

  const dayTitles: Record<string, DayTitleBreakdown> = {};
  if (chatgptSummary) buildTitleCounts(chatgptSummary, "chatgpt", dayTitles);
  if (claudeSummary)  buildTitleCounts(claudeSummary,  "claude",  dayTitles);

  const data: Record<string, CalHeatmapDay> = {};
  for (const day of new Set([...Object.keys(chatgptPerDay), ...Object.keys(claudePerDay)])) {
    data[day] = { chatgpt: chatgptPerDay[day] || 0, claude: claudePerDay[day] || 0 };
  }

  return { data, dayTitles, maxChatgpt, maxClaude, from, to };
}
