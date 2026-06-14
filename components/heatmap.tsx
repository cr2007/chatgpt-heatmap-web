"use client";

import { CalendarHeatmap, CalHeatmapDay, DayTitleBreakdown } from "@/components/calendar-heatmap";

export interface ChatgptSummary {
  title: string;
  create_day: string;
  convo_create_day: string[];
}

export interface ClaudeSummary {
  title: string;
  create_day: string;
  convo_create_day: string[];
}

interface AggregatedData {
  data: Record<string, CalHeatmapDay>;
  dayTitles: Record<string, DayTitleBreakdown>;
  maxChatgpt: number;
  maxClaude: number;
  from: Date;
  to: Date;
}

function buildFrequencyMap(summaries: ChatgptSummary[] | ClaudeSummary[]): Record<string, number> {
  const map: Record<string, number> = {};
  summaries.forEach((item) => {
    map[item.create_day] = (map[item.create_day] || 0) + 1;
    item.convo_create_day.forEach((d) => {
      map[d] = (map[d] || 0) + 1;
    });
  });
  return map;
}

function buildTitleCounts(
  summaries: ChatgptSummary[] | ClaudeSummary[],
  source: "chatgpt" | "claude",
  dayTitles: Record<string, DayTitleBreakdown>
): void {
  summaries.forEach((item) => {
    const activeDays = new Set([item.create_day, ...item.convo_create_day]);
    activeDays.forEach((day) => {
      const count =
        (item.create_day === day ? 1 : 0) +
        item.convo_create_day.filter((d) => d === day).length;
      if (count === 0) return;
      if (!dayTitles[day]) dayTitles[day] = { chatgpt: {}, claude: {} };
      dayTitles[day][source][item.title] =
        (dayTitles[day][source][item.title] || 0) + count;
    });
  });
}

function aggregateDateData(
  chatgptSummary: ChatgptSummary[] | null,
  claudeSummary: ClaudeSummary[] | null
): AggregatedData | null {
  const chatgptPerDay = chatgptSummary ? buildFrequencyMap(chatgptSummary) : {};
  const claudePerDay  = claudeSummary  ? buildFrequencyMap(claudeSummary)  : {};

  const allDates = [...Object.keys(chatgptPerDay), ...Object.keys(claudePerDay)].sort();
  if (allDates.length === 0) return null;

  const from = new Date(allDates[0] + "T00:00:00");
  const to   = new Date(allDates[allDates.length - 1] + "T00:00:00");

  const maxChatgpt = Object.values(chatgptPerDay).reduce((a, b) => Math.max(a, b), 0);
  const maxClaude  = Object.values(claudePerDay).reduce((a, b) => Math.max(a, b), 0);

  const dayTitles: Record<string, DayTitleBreakdown> = {};
  if (chatgptSummary) buildTitleCounts(chatgptSummary, "chatgpt", dayTitles);
  if (claudeSummary)  buildTitleCounts(claudeSummary,  "claude",  dayTitles);

  const allDayKeys = new Set([...Object.keys(chatgptPerDay), ...Object.keys(claudePerDay)]);
  const data: Record<string, CalHeatmapDay> = {};
  allDayKeys.forEach((day) => {
    data[day] = { chatgpt: chatgptPerDay[day] || 0, claude: claudePerDay[day] || 0 };
  });

  return { data, dayTitles, maxChatgpt, maxClaude, from, to };
}

export const AIChatHeatmap = ({
  chatgptSummary,
  claudeSummary,
  vertical = false,
}: {
  chatgptSummary: ChatgptSummary[] | null;
  claudeSummary: ClaudeSummary[] | null;
  vertical?: boolean;
}) => {
  const agg = aggregateDateData(chatgptSummary, claudeSummary);
  if (!agg) return null;

  return (
    <CalendarHeatmap
      data={agg.data}
      dayTitles={agg.dayTitles}
      maxChatgpt={agg.maxChatgpt}
      maxClaude={agg.maxClaude}
      from={agg.from}
      to={agg.to}
      vertical={vertical}
    />
  );
};
