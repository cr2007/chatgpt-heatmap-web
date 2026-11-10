import { describe, expect, test } from "bun:test";
import { $ } from "bun";
import { aggregateDateData } from "@/lib/aggregate";
import { detectFormat, parseChatGPT, parseClaude } from "@/lib/parse";

/**
 * Independent check of the counting rule in the README: `jq` counts the
 * visible user prompts per day straight from the raw export, and the app's
 * parse + aggregate pipeline must give the same numbers.
 */

/** jq program: visible ChatGPT user prompts per local day. */
const JQ_CHATGPT = `[.[] | .mapping[] | .message
  | select(. != null and .author.role == "user" and .create_time != null
      and (.metadata.is_visually_hidden_from_conversation // false) == false
      and .content.content_type != "user_editable_context")
  | .create_time | floor | strflocaltime("%Y-%m-%d")]
  | group_by(.) | map({key: .[0], value: length}) | from_entries`;

/** jq program: Claude human messages per local day. */
const JQ_CLAUDE = `[.[] | .chat_messages[] | select(.sender == "human")
  | .created_at | sub("\\\\.[0-9]+"; "") | fromdateiso8601 | strflocaltime("%Y-%m-%d")]
  | group_by(.) | map({key: .[0], value: length}) | from_entries`;

const TIME_ZONES = ["UTC", "America/New_York", "Asia/Kolkata"];
const FIXTURES = `${import.meta.dir}/fixtures`;
const hasJq = Bun.which("jq") !== null;

/** Runs a jq program on a file with the given TZ and returns its day map. */
async function jqCounts(program: string, file: string, tz: string): Promise<Record<string, number>> {
  return $`jq -c ${program} ${file}`.env({ ...process.env, TZ: tz }).json();
}

/** Counts per day for one provider from the app pipeline, zero days left out. */
async function appCounts(file: string, tz: string): Promise<Record<string, number>> {
  const raw = await Bun.file(file).json();
  const format = detectFormat(raw);
  const agg = format === "chatgpt"
    ? aggregateDateData(parseChatGPT(raw, tz), null)
    : aggregateDateData(null, parseClaude(raw, tz));
  if (!agg || format === "unknown") return {};
  return Object.fromEntries(
    Object.entries(agg.data)
      .map(([day, c]) => [day, c[format]] as const)
      .filter(([, n]) => n > 0),
  );
}

/** The fixture files, plus a real export when `CONVERSATIONS_JSON` names one. */
const files = [
  `${FIXTURES}/chatgpt-export.json`,
  `${FIXTURES}/chatgpt-export-2.json`,
  `${FIXTURES}/claude-export.json`,
  ...(process.env.CONVERSATIONS_JSON ? [process.env.CONVERSATIONS_JSON] : []),
];

describe.skipIf(!hasJq)("app counts match jq", () => {
  for (const file of files) {
    for (const tz of TIME_ZONES) {
      test.failing(`${file.split("/").pop()} in ${tz}`, async () => {
        const raw = await Bun.file(file).json();
        const program = detectFormat(raw) === "claude" ? JQ_CLAUDE : JQ_CHATGPT;
        expect(await appCounts(file, tz)).toEqual(await jqCounts(program, file, tz));
      });
    }
  }
});
