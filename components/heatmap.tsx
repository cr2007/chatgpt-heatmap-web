"use client";

import { aggregateDateData } from "@/lib/aggregate";
import { CalendarHeatmap } from "@/components/calendar-heatmap";
import type { ConversationSummary } from "@/lib/types";

export type { ConversationSummary };

export const AIChatHeatmap = ({
  chatgptSummary,
  claudeSummary,
  vertical = false,
}: {
  chatgptSummary: ConversationSummary[] | null;
  claudeSummary: ConversationSummary[] | null;
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
