import type { Provider } from "./types";

/** Copy and colors of one AI provider, shared by the form, tooltip and heatmap. */
export interface ProviderInfo {
  /** The provider key, "chatgpt" or "claude". */
  key: Provider;
  /** The name the UI shows, "ChatGPT" or "Claude". */
  label: string;
  /** Tailwind border class for cards, badges and chips. */
  border: string;
  /** Tailwind background class for cards, badges and chips. */
  bg: string;
  /** Tailwind text class for cards, badges and chips. */
  text: string;
  /** Tailwind background class for the provider dot. */
  dot: string;
  /**
   * Numbered export steps for the welcome screen and the "How to export"
   * popover. `code` and **bold** spans are styled. Three short steps each,
   * so one provider fits the help on a 360 px phone with no scroll.
   * @see components/export-guide.tsx
   */
  guide: readonly string[];
  /**
   * Prefix of the heatmap shade classes (`lv-g1` to `lv-g4`).
   * @see app/globals.css
   */
  ramp: "g" | "o";
}

/** ChatGPT first, then Claude: the order of every list in the UI. */
export const PROVIDERS: readonly ProviderInfo[] = [
  {
    key: "chatgpt",
    label: "ChatGPT",
    border: "border-(--g-line)",
    bg: "bg-(--g-wash)",
    text: "text-(--g-ink)",
    dot: "bg-(--g-dot)",
    guide: [
      "Open **Settings** → **Data controls** → **Export data**, then confirm.",
      "Open the link in the email and download the zip. The link works for 24 hours.",
      "Unzip it and drop `conversations.json` here.",
    ],
    ramp: "g",
  },
  {
    key: "claude",
    label: "Claude",
    border: "border-(--o-line)",
    bg: "bg-(--o-wash)",
    text: "text-(--o-ink)",
    dot: "bg-(--o-dot)",
    guide: [
      "Open **Settings** → **Privacy** → **Export data** on the web or the desktop app.",
      "Open the link in the email and download the `conversations` zip from its list. The link works for 24 hours.",
      "Unzip it and drop `conversations.json` here.",
    ],
    ramp: "o",
  },
];

/**
 * Looks up one provider's info by key.
 *
 * @param key - "chatgpt" or "claude".
 * @returns The entry of {@link PROVIDERS} for that key.
 */
export const providerInfo = (key: Provider): ProviderInfo =>
  PROVIDERS.find((p) => p.key === key)!;
