import type { ReactNode } from "react";
import type { Stats } from "@/lib/stats";
import { count, plural } from "@/lib/utils";

/** "Mar 11, 2024" in the reader's locale. */
const longDate = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});
/** "Mon, May 25, 2026" in the reader's locale. */
const weekdayDate = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});
/** A `YYYY-MM-DD` day as a local date (no time zone shift). */
const local = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
};
/**
 * Formats a span of days, or one day when both ends are the same.
 *
 * @param from - the first day, `YYYY-MM-DD`
 * @param to - the last day, `YYYY-MM-DD`
 * @returns "Mar 11, 2024 to Apr 2, 2024" in the reader's locale
 */
const range = (from: string, to: string) =>
  from === to
    ? longDate.format(local(from))
    : `${longDate.format(local(from))} to ${longDate.format(local(to))}`;

/** One figure: a small label, the value, and a note under it. */
function Figure({
  id,
  label,
  value,
  note,
}: {
  /** The id of the figure, such as `figure-streak`. */
  id: string;
  /** The small label above the value. */
  label: string;
  /** The big value. */
  value: ReactNode;
  /** The note under the value. */
  note: ReactNode;
}) {
  return (
    <div
      id={id}
      className="min-w-0 border-zinc-200 @xl:border-l @xl:pl-4 @xl:first:border-l-0 @xl:first:pl-0 dark:border-zinc-800"
    >
      <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tracking-tight">{value}</dd>
      <dd className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
        {note}
      </dd>
    </div>
  );
}

/**
 * Shows the headline and the four figures above the calendar.
 *
 * Definitions are in lib/stats.ts and the README.
 *
 * @see lib/stats.ts
 * @see README.md
 */
export function Summary({
  stats,
  year,
  timeZone,
}: {
  /** The figures of the view ({@link Stats}). */
  stats: Stats;
  /** The year of the view, or null for all years. */
  year: number | null;
  /** The IANA zone that the days are counted in. */
  timeZone: string;
}) {
  const both = stats.chatgpt > 0 && stats.claude > 0;
  const gptShare = Math.round((stats.chatgpt / stats.total) * 100);
  return (
    <section
      id="summary"
      aria-labelledby="summary-title"
      // A container: the figures follow the room they get (a fold pane is
      // half the window), not the window width.
      className="@container flex flex-col gap-4"
    >
      <div>
        <h2
          id="summary-title"
          className="text-2xl font-semibold tracking-tight"
        >
          {plural(stats.total, "prompt")}
          <span className="text-zinc-500 dark:text-zinc-400">
            {year === null
              ? ` in ${plural(stats.span.days, "day")}`
              : ` in ${year}`}
          </span>
        </h2>
        <p
          id="summary-range"
          className="mt-1 text-sm text-zinc-500 dark:text-zinc-400"
        >
          {range(stats.span.from, stats.span.to)}, counted in {timeZone} time
        </p>
      </div>
      <dl
        id="summary-figures"
        className="grid grid-cols-2 gap-x-4 gap-y-4 border-y border-zinc-200 py-4 @xl:grid-cols-4 dark:border-zinc-800"
      >
        <Figure
          id="figure-active-days"
          label="Active days"
          value={count(stats.activeDays)}
          note={`${Math.round((stats.activeDays / stats.span.days) * 100)}% of the days`}
        />
        <Figure
          id="figure-streak"
          label="Longest streak"
          value={plural(stats.streak.days, "day")}
          note={range(stats.streak.from, stats.streak.to)}
        />
        <Figure
          id="figure-busiest-day"
          label="Busiest day"
          value={plural(stats.busiest.count, "prompt")}
          note={weekdayDate.format(local(stats.busiest.day))}
        />
        {both ? (
          <Figure
            id="figure-providers"
            label="By provider"
            value={`${gptShare}% ChatGPT`}
            note={
              <>
                <span
                  aria-hidden="true"
                  className="mt-1 mb-1.5 flex h-1 overflow-hidden rounded-full"
                >
                  <span
                    className="bg-(--g-dot)"
                    style={{ width: `${gptShare}%` }}
                  />
                  <span className="flex-1 bg-(--o-dot)" />
                </span>
                {count(stats.chatgpt)} ChatGPT, {count(stats.claude)} Claude
              </>
            }
          />
        ) : (
          <Figure
            id="figure-average"
            label="Per active day"
            value={plural(
              Math.round((stats.total / stats.activeDays) * 10) / 10,
              "prompt",
            )}
            note="on average"
          />
        )}
      </dl>
    </section>
  );
}
