export interface ConversationSummary {
  title: string;
  create_day: string;
  convo_create_day: string[];
}

export interface CalHeatmapDay {
  chatgpt: number;
  claude: number;
}

export interface DayTitleBreakdown {
  chatgpt: Record<string, number>;
  claude: Record<string, number>;
}
