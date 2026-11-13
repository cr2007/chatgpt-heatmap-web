import { useLayoutEffect, useRef } from "react";
import type { CalHeatmapDay, ChatCount, DayTitleBreakdown } from "@/lib/types";
import { cn, formatDay, plural } from "@/lib/utils";
import { PROVIDERS } from "@/lib/providers";

/** Chats listed per provider before the rest fold into "+N more chats". */
const MAX_ROWS = 5;
/** Distance in px between the cursor and the tooltip. */
const CURSOR_GAP = 14;
/** Smallest distance in px between the tooltip and the viewport edge. */
const EDGE = 8;

/** What one day shows: its counts and its chats per provider. */
interface DayProps {
  /** `YYYY-MM-DD`. */
  day: string;
  /** Prompts of each provider on the day. */
  counts: CalHeatmapDay;
  /** The day's chats per provider, busiest first. */
  chats: DayTitleBreakdown | undefined;
}

/** One day's details: the date, the prompt count and the busiest chats per
 *  provider. */
function DayDetails({ day, counts, chats }: DayProps) {
  const both = counts.chatgpt > 0 && counts.claude > 0;
  return (
    <>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[13px] font-semibold">{formatDay(day)}</span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {plural(counts.chatgpt + counts.claude, "prompt")}
        </span>
      </div>
      {PROVIDERS.filter((p) => counts[p.key] > 0).map((p) => (
        <section key={p.key} className="mt-2">
          <p
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium",
              p.text,
            )}
          >
            <span className={cn("size-1.5 rounded-full", p.dot)} />
            {p.label}
            {both && <span className="ml-auto pl-3">{counts[p.key]}</span>}
          </p>
          <ChatList chats={chats?.[p.key] ?? []} />
        </section>
      ))}
    </>
  );
}

/**
 * The day details as a card that floats by the cursor or the cell.
 *
 * @remarks
 * Flat screens only. The focused or tapped cell names it as its
 * description (`id`), so a screen reader also reads the chats. `x` and `y`
 * are the cursor or cell place in px, relative to the parent; the card
 * flips to the other side when it would leave the viewport (it keeps
 * {@link CURSOR_GAP} px from the cursor and {@link EDGE} px from the edge).
 *
 * @see {@link DayPane} for a half-open foldable.
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/
 */
export function DayTooltip({
  id,
  x,
  y,
  ...day
}: DayProps & { id: string; x: number; y: number }) {
  const ref = useRef<HTMLDivElement>(null);

  // Step 2: Before paint, measure the card and flip it to the other side of
  // the cursor when it would leave the viewport, then clamp it.
  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement?.getBoundingClientRect();
    if (!el || !parent) return;
    // Step 2.1: Keep it below the sticky top bar; a very busy day is cut at
    // the window's bottom edge, never at its date.
    const bar = document.getElementById("app-bar")?.getBoundingClientRect();
    const minTop = Math.max(EDGE, (bar?.bottom ?? 0) + EDGE);
    el.style.maxHeight = `${window.innerHeight - minTop - EDGE}px`;
    const { width, height } = el.getBoundingClientRect();
    const cx = parent.left + x;
    const cy = parent.top + y;
    let left = cx + CURSOR_GAP;
    if (left + width > window.innerWidth - EDGE) left = cx - CURSOR_GAP - width;
    let top = cy + CURSOR_GAP;
    if (top + height > window.innerHeight - EDGE)
      top = cy - CURSOR_GAP - height;
    el.style.left = `${Math.max(EDGE, left) - parent.left}px`;
    el.style.top = `${Math.max(minTop, top) - parent.top}px`;
  }, [x, y, day.day]);

  // Step 1: Render next to the cursor (`x`, `y` are relative to the parent).
  return (
    <div
      ref={ref}
      id={id}
      role="tooltip"
      className="pointer-events-none absolute z-20 w-max max-w-[min(260px,calc(100vw-16px))] overflow-hidden rounded-lg border border-zinc-200 bg-white/95 px-3 py-2 text-zinc-900 shadow-lg shadow-zinc-950/10 backdrop-blur-sm animate-tooltip-in dark:border-zinc-800 dark:bg-zinc-900/95 dark:text-zinc-50 dark:shadow-black/40"
    >
      <DayDetails {...day} />
    </div>
  );
}

/**
 * The day details in a pane beside the calendar, when a foldable is half
 * open.
 *
 * @remarks
 * The other screen half holds them, so nothing floats over the fold
 * (Apple's overlay arrangement, Android's list and detail).
 *
 * @see {@link DayTooltip} for flat screens.
 */
export function DayPane({
  id,
  day,
}: {
  /** Id of the pane; the picked cell names it as its description. */
  id: string;
  /** The picked day, or null before the first pick. */
  day: DayProps | null;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="rounded-xl border border-zinc-200 bg-white/70 p-4 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-50"
    >
      <h2 id={`${id}-title`} className="sr-only">
        Day details
      </h2>
      {day ? (
        <DayDetails {...day} />
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Tap a day to see its chats.
        </p>
      )}
    </section>
  );
}

/** The busiest {@link MAX_ROWS} chats of one provider, then how many more there are. */
function ChatList({ chats }: { chats: ChatCount[] }) {
  const hidden = chats.length - MAX_ROWS;
  return (
    <ul className="mt-1 space-y-0.5">
      {chats.slice(0, MAX_ROWS).map((chat, i) => (
        <li key={i} className="flex items-start justify-between gap-3 text-xs">
          {/* dir="auto": an Arabic or Hebrew title reads right to left. */}
          {chat.title ? (
            <span
              dir="auto"
              className="line-clamp-2 min-w-0 wrap-anywhere text-zinc-600 dark:text-zinc-300"
            >
              {chat.title}
            </span>
          ) : (
            // A chat with no title; a chat named "Untitled" shows upright.
            <span className="min-w-0 text-zinc-500 italic dark:text-zinc-400">
              Untitled chat
            </span>
          )}
          <span className="shrink-0 text-zinc-500 dark:text-zinc-400">
            {chat.count}
          </span>
        </li>
      ))}
      {hidden > 0 && (
        <li className="text-xs text-zinc-500 dark:text-zinc-400">
          +{plural(hidden, "more chat")}
        </li>
      )}
    </ul>
  );
}
