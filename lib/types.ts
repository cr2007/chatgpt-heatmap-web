export type Provider = "chatgpt" | "claude";

/** One uploaded export, reduced to what the heatmap needs. */
export interface LoadedExport {
  /** File name, or "N files" for a merged ChatGPT upload. */
  name: string;
  /** One summary per conversation, in export order. */
  chats: ConversationSummary[];
}

export interface ConversationSummary {
  title: string;
  /** The time (ms since 1970) of each visible user prompt (see the README count rule). */
  times: number[];
  /** Prompts with a time before ChatGPT's launch or in the future; they do not count. */
  outside?: number;
}

export interface CalHeatmapDay {
  chatgpt: number;
  claude: number;
}

/** One chat on one day: its title and how many prompts it got that day. */
export interface ChatCount {
  title: string;
  count: number;
}

/** The chats of one day per provider, busiest first. */
export interface DayTitleBreakdown {
  chatgpt: ChatCount[];
  claude: ChatCount[];
}
