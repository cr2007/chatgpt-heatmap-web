import { describe, expect, test } from "bun:test";
import { $ } from "bun";
import { aggregateDateData } from "@/lib/aggregate";
import { detectFormat, FIRST_PROMPT } from "@/lib/parse";
import { loadExports } from "@/lib/upload";
import { summarize } from "@/lib/stats";

/**
 * Independent check of the counting rule in the README: `jq` counts the
 * visible user prompts per day straight from the raw export, and the app's
 * parse + aggregate pipeline must give the same numbers.
 */

/** ChatGPT's launch (2022-11-30 UTC) in seconds; earlier prompt times do not count. */
const FIRST = String(FIRST_PROMPT / 1000);

/** jq program: visible ChatGPT user prompts per local day, launch to one day from now. */
const JQ_CHATGPT = `[.[] | .mapping[] | .message
  | select(. != null and .author.role == "user" and .create_time != null
      and (.metadata.is_visually_hidden_from_conversation // false) == false
      and .content.content_type != "user_editable_context")
  | .create_time | select(. >= $first and . <= now + 86400)
  | floor | strflocaltime("%Y-%m-%d")]
  | group_by(.) | map({key: .[0], value: length}) | from_entries`;

/** jq program: Claude human messages per local day, launch to one day from now. */
const JQ_CLAUDE = `[.[] | .chat_messages[] | select(.sender == "human")
  | .created_at | sub("\\\\.[0-9]+"; "") | fromdateiso8601
  | select(. >= $first and . <= now + 86400) | strflocaltime("%Y-%m-%d")]
  | group_by(.) | map({key: .[0], value: length}) | from_entries`;

/**
 * jq program, run on a day map from the programs above: the figures above
 * the calendar (total, active days, longest streak, busiest day with the
 * earliest day winning a tie). Written apart from lib/stats.ts on purpose.
 */
const JQ_STATS = `to_entries | {
  total: (map(.value) | add),
  activeDays: length,
  busiest: (sort_by(-.value, .key) | .[0] | {day: .key, count: .value}),
  streak: ([.[].key | strptime("%Y-%m-%d") | mktime / 86400 | floor] as $d
    | reduce range(0; $d | length) as $i ({best: 0, run: 0};
        .run = (if $i > 0 and $d[$i] - $d[$i - 1] == 1 then .run + 1 else 1 end)
        | .best = ([.best, .run] | max))
    | .best)
}`;

const TIME_ZONES = ["UTC", "America/New_York", "Asia/Kolkata"];
const FIXTURES = `${import.meta.dir}/fixtures`;
const hasJq = Bun.which("jq") !== null;

/** Runs a jq program on a file with the given TZ and returns its JSON (a day map by default). */
async function jqCounts<T = Record<string, number>>(
  program: string,
  file: string,
  tz: string,
): Promise<T> {
  return $`jq -c --argjson first ${FIRST} ${program} ${file}`
    .env({ ...process.env, TZ: tz })
    .json();
}

/**
 * Counts per day for one provider from the app pipeline (the streamed upload,
 * then aggregation), zero days left out.
 */
async function appCounts(
  file: string,
  tz: string,
): Promise<Record<string, number>> {
  const r = await loadExports([Bun.file(file)]);
  if (!r.ok) throw new Error(r.error);
  const format = r.exports.chatgpt ? "chatgpt" : "claude";
  const agg = aggregateDateData(
    r.exports.chatgpt?.chats ?? null,
    r.exports.claude?.chats ?? null,
    tz,
  );
  if (!agg) return {};
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
      test(`${file.split("/").pop()} in ${tz}`, async () => {
        const raw = await Bun.file(file).json();
        const program = detectFormat(raw) === "claude" ? JQ_CLAUDE : JQ_CHATGPT;
        expect(await appCounts(file, tz)).toEqual(
          await jqCounts(program, file, tz),
        );
      });
    }
  }
});

// The export chip's hover shows the prompts of each export: the sum of its
// chats' prompt times, so the same rule as the cells.
describe.skipIf(!hasJq)("export prompt count matches jq", () => {
  for (const file of files) {
    test(file.split("/").pop()!, async () => {
      const raw = await Bun.file(file).json();
      const program = detectFormat(raw) === "claude" ? JQ_CLAUDE : JQ_CHATGPT;
      const r = await loadExports([Bun.file(file)]);
      if (!r.ok) throw new Error(r.error);
      const chats = (r.exports.chatgpt ?? r.exports.claude)!.chats;
      expect(chats.reduce((n, c) => n + c.times.length, 0)).toBe(
        await jqCounts<number>(`${program} | [.[]] | add // 0`, file, "UTC"),
      );
    });
  }
});

describe.skipIf(!hasJq)("figures match jq", () => {
  for (const file of files) {
    for (const tz of TIME_ZONES) {
      test(`${file.split("/").pop()} in ${tz}`, async () => {
        const raw = await Bun.file(file).json();
        const program = detectFormat(raw) === "claude" ? JQ_CLAUDE : JQ_CHATGPT;
        const counts = await appCounts(file, tz);
        const data = Object.fromEntries(
          Object.entries(counts).map(([d, n]) => [
            d,
            { chatgpt: n, claude: 0 },
          ]),
        );
        const s = summarize(data)!;
        expect({
          total: s.total,
          activeDays: s.activeDays,
          busiest: s.busiest,
          streak: s.streak.days,
        }).toEqual(await jqCounts(`${program} | ${JQ_STATS}`, file, tz));
      });
    }
  }
});
