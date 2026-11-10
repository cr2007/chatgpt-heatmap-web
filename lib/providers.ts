import type { Provider } from "./types";

/** Copy and colors of one AI provider, shared by the form, tooltip and heatmap. */
export interface ProviderInfo {
  key: Provider;
  label: string;
  /** Where to find the export, shown in the "How to export" cards. */
  steps: string;
  /** Tailwind classes for cards, badges and chips. */
  border: string;
  bg: string;
  text: string;
  dot: string;
  /** Heatmap cell fills for low, medium and high activity. */
  shades: readonly [string, string, string];
}

/** ChatGPT first, then Claude: the order of every list in the UI. */
export const PROVIDERS: readonly ProviderInfo[] = [
  {
    key: "chatgpt",
    label: "ChatGPT",
    steps:
      "Settings → Data Controls → Export data. Multiple files are supported.",
    border: "border-green-300 dark:border-green-900/40",
    bg: "bg-green-50 dark:bg-green-950/20",
    text: "text-green-700 dark:text-green-400",
    dot: "bg-green-500",
    shades: ["#CCFFCC", "#5CE65C", "#008000"],
  },
  {
    key: "claude",
    label: "Claude",
    steps:
      "Settings → Privacy → Export data. Open the file list from the email, download the conversations zip and unzip it.",
    border: "border-orange-300 dark:border-orange-900/40",
    bg: "bg-orange-50 dark:bg-orange-950/20",
    text: "text-orange-700 dark:text-orange-400",
    dot: "bg-orange-500",
    shades: ["#FED7AA", "#F97316", "#C2410C"],
  },
];

/** Looks up one provider's info by key. */
export const providerInfo = (key: Provider): ProviderInfo =>
  PROVIDERS.find((p) => p.key === key)!;
