export type Provider = "chatgpt" | "claude";

/** One uploaded export, kept raw so it can be parsed again in a new time zone. */
export interface LoadedExport {
  /** File name, or "N files" for a merged ChatGPT upload. */
  name: string;
  /** The conversations array from the JSON file. */
  data: unknown[];
}

export interface ConversationSummary {
  title: string;
  /** One local `YYYY-MM-DD` day per visible user prompt (see the README count rule). */
  days: string[];
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
