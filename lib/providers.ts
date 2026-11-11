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
  /** Numbered export steps for the welcome screen. `code` and **bold** spans
   *  are styled (see components/welcome.tsx). */
  guide: readonly string[];
  /** Prefix of the heatmap shade classes in app/globals.css (`lv-g1` to `lv-g4`). */
  ramp: "g" | "o";
}

/** ChatGPT first, then Claude: the order of every list in the UI. */
export const PROVIDERS: readonly ProviderInfo[] = [
  {
    key: "chatgpt",
    label: "ChatGPT",
    steps:
      "Settings → Data Controls → Export data. Multiple files are supported.",
    border: "border-(--g-line)",
    bg: "bg-(--g-wash)",
    text: "text-(--g-ink)",
    dot: "bg-(--g-dot)",
    guide: [
      "Open **Settings** → **Data Controls**.",
      "Choose **Export data** and confirm.",
      "Open the link in the email and download the zip.",
      "Unzip it and drop `conversations.json` here. More than one file is fine.",
    ],
    ramp: "g",
  },
  {
    key: "claude",
    label: "Claude",
    steps:
      "Settings → Privacy → Export data. Open the file list from the email, download the conversations zip and unzip it.",
    border: "border-(--o-line)",
    bg: "bg-(--o-wash)",
    text: "text-(--o-ink)",
    dot: "bg-(--o-dot)",
    guide: [
      "Open **Settings** → **Privacy**.",
      "Choose **Export data**.",
      "Open the link in the email. It shows a list of files.",
      "Download the `conversations` zip. Each link works for 24 hours.",
      "Unzip it and drop `conversations.json` here.",
    ],
    ramp: "o",
  },
];

/** Looks up one provider's info by key. */
export const providerInfo = (key: Provider): ProviderInfo =>
  PROVIDERS.find((p) => p.key === key)!;
