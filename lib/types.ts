/** The AI services whose exports the app reads. */
export type Provider = "chatgpt" | "claude";

/** One uploaded export, reduced to what the heatmap needs. */
export interface LoadedExport {
  /** File name, or "N files" for a merged ChatGPT upload. */
  name: string;
  /** Every file in the export, in upload order (ChatGPT files can merge). */
  files: string[];
  /** One summary per conversation, in export order. */
  chats: ConversationSummary[];
}

/** One chat, reduced to its title and its prompt times. */
export interface ConversationSummary {
  /** The chat title; "Untitled" when the export has none. */
  title: string;
  /**
   * The time (ms since 1970) of each visible user prompt.
   * @see README.md, section "What a cell counts".
   */
  times: number[];
  /** Prompts with a time before ChatGPT's launch or in the future; they do not count. */
  outside?: number;
}

/** The prompt counts of one local day per provider. */
export interface CalHeatmapDay {
  /** ChatGPT prompts that day, 0 or more. */
  chatgpt: number;
  /** Claude prompts that day, 0 or more. */
  claude: number;
}

/** One chat on one day: its title and how many prompts it got that day. */
export interface ChatCount {
  /** The chat title. */
  title: string;
  /** Prompts in this chat that day, 1 or more. */
  count: number;
}

/** The chats of one day per provider, busiest first. */
export interface DayTitleBreakdown {
  /** The ChatGPT chats of the day, busiest first. */
  chatgpt: ChatCount[];
  /** The Claude chats of the day, busiest first. */
  claude: ChatCount[];
}
