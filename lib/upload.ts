import { detectFormat } from "./parse";
import type { LoadedExport, Provider } from "./types";

/** One picked or dropped file, already read as text. */
export interface UploadedFile {
  name: string;
  text: string;
}

export type ReadResult =
  | { ok: true; exports: Partial<Record<Provider, LoadedExport>> }
  | { ok: false; error: string };

/**
 * Checks a batch of uploaded files and groups them by provider.
 *
 * Step 1: Parse each file as JSON and require a non-empty array.
 * Step 2: Reject the batch if a file is not a ChatGPT or Claude export.
 * Step 3: Reject more than one Claude export (only one is supported).
 * Step 4: Merge all ChatGPT files into one export.
 */
export function readExports(files: UploadedFile[]): ReadResult {
  const gpt: { name: string; data: unknown[] }[] = [];
  const claude: { name: string; data: unknown[] }[] = [];

  for (const { name, text } of files) {
    // Step 1
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, error: `${name}: could not parse JSON` };
    }
    if (!Array.isArray(json) || json.length === 0) {
      return { ok: false, error: `${name}: expected a non-empty array of conversations` };
    }

    // Step 2
    const format = detectFormat(json);
    if (format === "unknown") {
      return { ok: false, error: `${name}: unrecognised format - expected a ChatGPT or Claude conversations.json` };
    }
    (format === "chatgpt" ? gpt : claude).push({ name, data: json });
  }

  // Step 3
  if (claude.length > 1) return { ok: false, error: "Upload at most one Claude export" };

  // Step 4
  const exports: Partial<Record<Provider, LoadedExport>> = {};
  if (gpt.length > 0) {
    exports.chatgpt = {
      name: gpt.length === 1 ? gpt[0].name : `${gpt.length} files`,
      data: gpt.flatMap((f) => f.data),
    };
  }
  if (claude.length === 1) exports.claude = claude[0];
  return { ok: true, exports };
}
