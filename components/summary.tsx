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
const range = (from: string, to: string) =>
  from === to
    ? longDate.format(local(from))
    : `${longDate.format(local(from))} to ${longDate.format(local(to))}`;

/** One figure: a small label, the value, and a note under it. */
function Figure({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note: ReactNode;
}) {
  return (
    <div className="min-w-0 border-zinc-200 sm:border-l sm:pl-4 sm:first:border-l-0 sm:first:pl-0 dark:border-zinc-800">
      <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tracking-tight">{value}</dd>
      <dd className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
        {note}
      </dd>
    </div>
  );
}

/**
 * The headline and the four figures above the calendar, for all years or
 * for one `year`. Definitions are in lib/stats.ts and the README.
 */
export function Summary({
  stats,
  year,
  timeZone,
}: {
  stats: Stats;
  year: number | null;
  timeZone: string;
}) {
  const both = stats.chatgpt > 0 && stats.claude > 0;
  const gptShare = Math.round((stats.chatgpt / stats.total) * 100);
  return (
    <section aria-label="Summary" className="flex flex-col gap-4">
      <div>
        <p className="text-2xl font-semibold tracking-tight">
          {plural(stats.total, "prompt")}
          <span className="text-zinc-500 dark:text-zinc-400">
            {year === null
              ? ` in ${plural(stats.span.days, "day")}`
              : ` in ${year}`}
          </span>
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {range(stats.span.from, stats.span.to)}, counted in {timeZone} time
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-y border-zinc-200 py-4 sm:grid-cols-4 dark:border-zinc-800">
        <Figure
          label="Active days"
          value={count(stats.activeDays)}
          note={`${Math.round((stats.activeDays / stats.span.days) * 100)}% of the days`}
        />
        <Figure
          label="Longest streak"
          value={plural(stats.streak.days, "day")}
          note={range(stats.streak.from, stats.streak.to)}
        />
        <Figure
          label="Busiest day"
          value={plural(stats.busiest.count, "prompt")}
          note={weekdayDate.format(local(stats.busiest.day))}
        />
        {both ? (
          <Figure
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
