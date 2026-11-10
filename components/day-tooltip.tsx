import { useLayoutEffect, useRef } from "react";
import type { CalHeatmapDay, ChatCount, DayTitleBreakdown } from "@/lib/types";
import { cn, plural } from "@/lib/utils";
import { PROVIDERS } from "@/lib/providers";

/** Chats listed per provider before the rest fold into "+N more chats". */
const MAX_ROWS = 5;
/** Distance in px between the cursor and the tooltip. */
const CURSOR_GAP = 14;
/** Smallest distance in px between the tooltip and the viewport edge. */
const EDGE = 8;

/** "Sun, Mar 10, 2024" in the reader's locale. */
const dateLabel = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

/**
 * The hover card for one heatmap day: the date, the prompt count and the
 * busiest chats per provider. It is decoration for pointer users; each cell
 * already carries the counts in its accessible name.
 *
 * Step 1: Render next to the cursor (`x`, `y` are relative to the parent).
 * Step 2: Before paint, measure the card and flip it to the other side of
 *         the cursor when it would leave the viewport, then clamp it.
 */
export function DayTooltip({
  day,
  counts,
  chats,
  x,
  y,
}: {
  /** `YYYY-MM-DD`. */
  day: string;
  counts: CalHeatmapDay;
  chats: DayTitleBreakdown | undefined;
  x: number;
  y: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Step 2
  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement?.getBoundingClientRect();
    if (!el || !parent) return;
    const { width, height } = el.getBoundingClientRect();
    const cx = parent.left + x;
    const cy = parent.top + y;
    let left = cx + CURSOR_GAP;
    if (left + width > window.innerWidth - EDGE) left = cx - CURSOR_GAP - width;
    let top = cy + CURSOR_GAP;
    if (top + height > window.innerHeight - EDGE)
      top = cy - CURSOR_GAP - height;
    el.style.left = `${Math.max(EDGE, left) - parent.left}px`;
    el.style.top = `${Math.max(EDGE, top) - parent.top}px`;
  }, [x, y, day]);

  const [year, month, date] = day.split("-").map(Number);
  const both = counts.chatgpt > 0 && counts.claude > 0;

  // Step 1
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute z-20 w-max max-w-[260px] rounded-lg border border-zinc-200 bg-white/95 px-3 py-2 text-zinc-900 shadow-lg shadow-zinc-950/10 backdrop-blur-sm animate-tooltip-in dark:border-zinc-800 dark:bg-zinc-900/95 dark:text-zinc-50 dark:shadow-black/40"
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[13px] font-semibold">
          {dateLabel.format(new Date(year, month - 1, date))}
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {plural(counts.chatgpt + counts.claude, "message")}
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
    </div>
  );
}

/** The busiest chats of one provider, then how many more there are. */
function ChatList({ chats }: { chats: ChatCount[] }) {
  const hidden = chats.length - MAX_ROWS;
  return (
    <ul className="mt-1 space-y-0.5">
      {chats.slice(0, MAX_ROWS).map((chat, i) => (
        <li key={i} className="flex items-start justify-between gap-3 text-xs">
          {/* dir="auto": an Arabic or Hebrew title reads right to left. */}
          <span
            dir="auto"
            className="line-clamp-2 min-w-0 wrap-anywhere text-zinc-600 dark:text-zinc-300"
          >
            {chat.title}
          </span>
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
