import { useEffect, useLayoutEffect, useRef } from "react";
import { cn, count } from "@/lib/utils";
import type { YearView } from "@/lib/layout";

/**
 * A row of buttons that picks the calendar view: "All years" scrolls
 * through every year; a year button shows that year and its total.
 *
 * Step 1: On a phone the row scrolls sideways: keep the picked button in
 *         view. This moves only the row, never the page.
 * Step 2: One pill behind the picked button marks it. It moves to the new
 *         pick with the spring (translate and width, measured), so the eye
 *         follows the change; it is placed again when the row resizes.
 * Step 3: The pill slides only after its first placement, so the first
 *         paint does not animate.
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
  // A total that grows (a time zone change, a streaming upload) widens its
  // button but not the scrolling row, so the labels are part of the key.
  const labels = `${years.join()}|${totals.join()}`;
  const pill = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = row.current;
    const on = el?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!el || !on) return;
    // Step 1
    el.scrollLeft = on.offsetLeft + on.offsetWidth / 2 - el.clientWidth / 2;
    // Step 2
    const place = () => {
      if (!pill.current) return;
      pill.current.style.width = `${on.offsetWidth}px`;
      pill.current.style.translate = `${on.offsetLeft}px 0`;
    };
    place();
    const resize = new ResizeObserver(place);
    resize.observe(el);
    return () => resize.disconnect();
  }, [view, labels]);

  // Step 3
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      pill.current?.setAttribute("data-ready", ""),
    );
    return () => cancelAnimationFrame(frame);
  }, []);

  const button = (v: YearView, label: string, total?: number) => (
    <button
      key={String(v)}
      id={`year-tab-${v}`}
      type="button"
      aria-pressed={view === v}
      onClick={() => onView(v)}
      className={cn(
        "relative flex h-8 shrink-0 items-baseline gap-1.5 rounded-md px-3 text-sm transition-[color,scale] duration-(--dur-press) ease-out focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-hidden active:scale-[0.97]",
        view === v
          ? "font-medium text-zinc-900 dark:text-zinc-50"
          : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
      )}
    >
      <span className="leading-8">{label}</span>
      {total !== undefined && (
        <span className="text-xs text-zinc-600 dark:text-zinc-400">
          {count(total)}
        </span>
      )}
    </button>
  );
  return (
    <fieldset
      ref={row}
      id="year-tabs"
      className="relative isolate flex max-w-full min-w-0 gap-0.5 overflow-x-auto rounded-lg bg-zinc-100 p-0.5 [scrollbar-width:none] dark:bg-zinc-900"
    >
      <legend className="sr-only">Years to show</legend>
      <span
        ref={pill}
        aria-hidden="true"
        // A small, absolutely placed marker: its width may animate with no
        // layout cost to anything else.
        className="pointer-events-none absolute top-0.5 left-0 -z-10 h-8 rounded-md bg-white shadow-xs ring-1 ring-zinc-200 data-ready:transition-[translate,width] data-ready:duration-(--dur-spring) data-ready:ease-spring dark:bg-zinc-800 dark:ring-zinc-700"
      />
      {years.length > 1 && button("all", "All years")}
      {years.map((y, i) => button(y, String(y), totals[i]))}
    </fieldset>
  );
}
