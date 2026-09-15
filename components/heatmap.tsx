
import { aggregateDateData } from "@/lib/aggregate";
import { CalendarHeatmap } from "@/components/calendar-heatmap";
import type { ConversationSummary } from "@/lib/types";

export type { ConversationSummary };

export const AIChatHeatmap = ({
  chatgptSummary,
  claudeSummary,
  vertical = false,
  viewFrom,
  viewTo,
}: {
  chatgptSummary: ConversationSummary[] | null;
  claudeSummary: ConversationSummary[] | null;
  vertical?: boolean;
  viewFrom?: Date;
  viewTo?: Date;
}) => {
  const agg = aggregateDateData(chatgptSummary, claudeSummary);
  if (!agg) return null;

  return (
    <CalendarHeatmap
      data={agg.data}
      dayTitles={agg.dayTitles}
      maxChatgpt={agg.maxChatgpt}
      maxClaude={agg.maxClaude}
      from={viewFrom ?? agg.from}
      to={viewTo ?? agg.to}
      vertical={vertical}
    />
  );
};
