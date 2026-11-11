import { useLayoutEffect, useRef } from "react";
import { cn, count } from "@/lib/utils";

import type { YearView } from "@/lib/layout";

/**
 * A row of buttons that picks the calendar view: "All years" scrolls
 * through every year; a year button shows that year and its total.
 */
export function YearTabs({
  years,
  totals,
  view,
  onView,
}: {
  /** Years with prompts, ascending. */
  years: number[];
  /** Prompts per year, in the order of `years`. */
  totals: number[];
  view: YearView;
  onView: (view: YearView) => void;
}) {
  const row = useRef<HTMLFieldSetElement>(null);
  // On a phone the row scrolls sideways: keep the picked year in view. This
  // moves only the row, never the page.
  useLayoutEffect(() => {
    const el = row.current;
    const on = el?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (el && on)
      el.scrollLeft = on.offsetLeft + on.offsetWidth / 2 - el.clientWidth / 2;
  }, [view, years.length]);
  const button = (v: YearView, label: string, total?: number) => (
    <button
      key={String(v)}
      type="button"
      aria-pressed={view === v}
      onClick={() => onView(v)}
      className={cn(
        "flex h-8 shrink-0 items-baseline gap-1.5 rounded-md px-3 text-sm transition-[background-color,color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-hidden",
        view === v
          ? "bg-white font-medium text-zinc-900 shadow-xs ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-50 dark:ring-zinc-700"
          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
      )}
    >
      <span className="leading-8">{label}</span>
      {total !== undefined && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {count(total)}
        </span>
      )}
    </button>
  );
  return (
    <fieldset
      ref={row}
      className="flex max-w-full min-w-0 gap-0.5 overflow-x-auto rounded-lg bg-zinc-100 p-0.5 [scrollbar-width:none] dark:bg-zinc-900"
    >
      <legend className="sr-only">Years to show</legend>
      {years.length > 1 && button("all", "All years")}
      {years.map((y, i) => button(y, String(y), totals[i]))}
    </fieldset>
  );
}
