import { detectFormat, parseChatGPT, parseClaude } from "@/lib/parse";
import type { LoadedExport, Provider } from "@/lib/types";

export type Exports = Record<Provider, LoadedExport | null>;

/** Nothing loaded. */
export const NO_EXPORTS: Exports = { chatgpt: null, claude: null };

/**
 * Dev only: reads the exports that `dev/test.html` (or a browser check)
 * left in `sessionStorage` as `test-chatgpt` and `test-claude`. The
 * production build defines `process.env.NODE_ENV`, so the bundler drops
 * this code and the keys from the shipped bundle.
 */
export function loadTestData(): Exports {
  if (process.env.NODE_ENV === "production") return NO_EXPORTS;
  try {
    const read = (key: string): LoadedExport | null => {
      const json = sessionStorage.getItem(key);
      if (!json) return null;
      const raw = JSON.parse(json) as unknown[];
      const parse = detectFormat(raw) === "claude" ? parseClaude : parseChatGPT;
      return { name: "Test data", files: ["Test data"], chats: parse(raw) };
    };
    return { chatgpt: read("test-chatgpt"), claude: read("test-claude") };
  } catch {
    return NO_EXPORTS;
  }
}
