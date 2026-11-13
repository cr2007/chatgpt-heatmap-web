import type { CalHeatmapDay } from "./types";

/** A run of days, as `YYYY-MM-DD`. */
export interface DayRun {
  /** Days in the run, both ends included, 1 or more. */
  days: number;
  /** The first day, as `YYYY-MM-DD`. */
  from: string;
  /** The last day, as `YYYY-MM-DD`. */
  to: string;
}

/** The figures above the calendar. Every day is a local day in the chosen zone. */
export interface Stats {
  /**
   * Counted prompts of both providers.
   * @see README.md, section "What a cell counts".
   */
  total: number;
  /** Counted ChatGPT prompts. */
  chatgpt: number;
  /** Counted Claude prompts. */
  claude: number;
  /** Days with at least one prompt. */
  activeDays: number;
  /** Days from the first to the last active day, both included. */
  span: DayRun;
  /** The longest run of consecutive active days; a tie keeps the earliest. */
  streak: DayRun;
  /** The day with the most prompts; a tie keeps the earliest. */
  busiest: { day: string; count: number };
}

/** Day number of a `YYYY-MM-DD` day (days since 1970, calendar arithmetic only). */
const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / 864e5;

/**
 * Computes the figures for all days, or only for `year`.
 *
 * @param data - The prompt counts per `YYYY-MM-DD` local day.
 * @param year - The year to keep; leave it out for all years.
 * @returns The figures, or null when no day in the range has a prompt.
 * @see `aggregateDateData` in lib/aggregate.ts, which makes `data`.
 * @see test/oracle.test.ts, which checks the figures with `jq`.
 */
export function summarize(
  data: Record<string, CalHeatmapDay>,
  year?: number,
): Stats | null {
  // Step 1: Keep the days of the range that have prompts, in date order.
  const days = Object.keys(data)
    .filter((d) => year === undefined || d.startsWith(`${year}-`))
    .filter((d) => data[d].chatgpt + data[d].claude > 0)
    .sort();
  if (!days.length) return null;

  // Step 2: Add up the counts and find the busiest day.
  let chatgpt = 0;
  let claude = 0;
  let busiest = { day: days[0], count: 0 };
  for (const day of days) {
    const c = data[day];
    chatgpt += c.chatgpt;
    claude += c.claude;
    if (c.chatgpt + c.claude > busiest.count)
      busiest = { day, count: c.chatgpt + c.claude };
  }

  // Step 3: Walk the days once to find the longest run without a gap.
  let streak: DayRun = { days: 1, from: days[0], to: days[0] };
  let start = 0;
  for (let i = 1; i <= days.length; i++) {
    const breaks =
      i === days.length || dayNumber(days[i]) - dayNumber(days[i - 1]) !== 1;
    if (!breaks) continue;
    if (i - start > streak.days)
      streak = { days: i - start, from: days[start], to: days[i - 1] };
    start = i;
  }

  const first = days[0];
  const last = days[days.length - 1];
  return {
    total: chatgpt + claude,
    chatgpt,
    claude,
    activeDays: days.length,
    span: {
      days: dayNumber(last) - dayNumber(first) + 1,
      from: first,
      to: last,
    },
    streak,
    busiest,
  };
}
