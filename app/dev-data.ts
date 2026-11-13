import { detectFormat, parseChatGPT, parseClaude } from "@/lib/parse";
import type { LoadedExport, Provider } from "@/lib/types";

/** The loaded export of each provider, or null for none. */
export type Exports = Record<Provider, LoadedExport | null>;

/** Nothing loaded. */
const NO_EXPORTS: Exports = { chatgpt: null, claude: null };

/**
 * Dev only: reads the exports that `dev/test.html` (or a browser check)
 * left in `sessionStorage` as `test-chatgpt` and `test-claude`.
 *
 * @remarks
 * The production build defines `process.env.NODE_ENV`, so the bundler drops
 * this code and the keys from the shipped bundle.
 *
 * @returns The test exports; {@link NO_EXPORTS} in production, with no test
 *   data, or when the data does not parse.
 * @see dev/test.html, the test-data generator.
 * @see scripts/build.ts, which defines `process.env.NODE_ENV`.
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
