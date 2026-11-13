import { useEffect, useLayoutEffect, useRef } from "react";
import { X } from "lucide-react";
import type { CalHeatmapDay, ChatCount, DayTitleBreakdown } from "@/lib/types";
import { cn, formatDay, plural } from "@/lib/utils";
import { PROVIDERS } from "@/lib/providers";
import { rubber } from "@/components/year-tabs";

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
function DayDetails({
  day,
  counts,
  chats,
  roomy = false,
  titleId,
}: DayProps & {
  /** Larger text, for the touch sheet. */
  roomy?: boolean;
  /** Id of the date, so a region can name itself with it. */
  titleId?: string;
}) {
  const both = counts.chatgpt > 0 && counts.claude > 0;
  const small = roomy ? "text-sm" : "text-xs";
  return (
    <>
      <div className="flex items-baseline justify-between gap-4">
        <span
          id={titleId}
          className={cn("font-semibold", roomy ? "text-base" : "text-[13px]")}
        >
          {formatDay(day)}
        </span>
        <span className={cn(small, "text-zinc-500 dark:text-zinc-400")}>
          {plural(counts.chatgpt + counts.claude, "prompt")}
        </span>
      </div>
      {PROVIDERS.filter((p) => counts[p.key] > 0).map((p) => (
        <section key={p.key} className="mt-2">
          <p
            className={cn(
              "flex items-center gap-1.5 font-medium",
              small,
              p.text,
            )}
          >
            <span className={cn("size-1.5 rounded-full", p.dot)} />
            {p.label}
            {both && <span className="ml-auto pl-3">{counts[p.key]}</span>}
          </p>
          <ChatList chats={chats?.[p.key] ?? []} small={small} />
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
 * A swipe down closes the sheet past this share of its height, or at this speed in px/ms.
 *
 * @see https://github.com/emilkowalski/vaul/blob/main/src/constants.ts
 *   (CLOSE_THRESHOLD 0.25, VELOCITY_THRESHOLD 0.4)
 */
const CLOSE = { share: 0.25, speed: 0.4 };

/**
 * The day details as a sheet at the bottom of the window, for a tap with a finger.
 *
 * @remarks
 * A floating card sits under the finger and is small to read; Maps and
 * Photos show the picked item in a sheet instead. It does not block the
 * page: another tap on a day changes its content in place, a tap outside the
 * calendar, Escape or the close button closes it, and a swipe down does too
 * (it follows the finger; {@link CLOSE} decides). It stays in the page while
 * closed, so it can slide out; `inert` keeps it out of reach meanwhile. The
 * tapped cell names it as its description (`id`).
 *
 * @see {@link DayTooltip} for a mouse, a pen or the keyboard.
 */
export function DaySheet({
  id,
  open,
  onClose,
  ...day
}: DayProps & {
  /** Id of the sheet; the tapped cell names it. */
  id: string;
  /** The sheet shows; false slides it out. */
  open: boolean;
  /** Closes the sheet (the button, Escape or a swipe down). */
  onClose: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const drag = useRef<{
    id: number;
    y0: number;
    on: boolean;
    track: { t: number; y: number }[];
  } | null>(null);

  // A sheet taller than its room (a phone on its side, a busy day) scrolls:
  // then only its top edge takes the swipe down, and the rest scrolls.
  useLayoutEffect(() => {
    const el = ref.current;
    el?.toggleAttribute("data-scrolls", el.scrollHeight > el.clientHeight + 1);
  });

  // Escape closes it, as it closes the floating card.
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open, onClose]);

  // Step 1: A press anywhere but the close button may become a swipe down.
  function onPointerDown(e: React.PointerEvent<HTMLElement>) {
    const t = e.target as Element;
    if (drag.current || !e.isPrimary || t.closest("button")) return;
    if (ref.current?.hasAttribute("data-scrolls") && !t.closest("[data-grab]"))
      return;
    drag.current = { id: e.pointerId, y0: e.clientY, on: false, track: [] };
  }
  // Step 2: Down, it follows the finger 1:1; up, a short rubber band.
  function onPointerMove(e: React.PointerEvent<HTMLElement>) {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const dy = e.clientY - d.y0;
    if (!d.on) {
      if (Math.abs(dy) < 4) return;
      d.on = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      // A slide still running is caught where it stands: the drag starts from there.
      const t = getComputedStyle(e.currentTarget).translate.split(" ")[1];
      d.y0 -= t?.endsWith("%")
        ? (parseFloat(t) / 100) * e.currentTarget.offsetHeight
        : parseFloat(t) || 0;
      e.currentTarget.style.transition = "none";
    }
    d.track.push({ t: e.timeStamp, y: e.clientY });
    if (d.track.length > 6) d.track.shift();
    const y = e.clientY - d.y0;
    e.currentTarget.style.translate = `0 ${y > 0 ? y : -rubber(-y, 24)}px`;
  }
  // Step 3: Release: close on distance or speed, else spring back.
  function end(e: React.PointerEvent<HTMLElement>, cancel: boolean) {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    if (!d.on) return;
    const el = e.currentTarget;
    const [a, b] = [d.track[0], d.track.at(-1)];
    const v = a && b && b.t > a.t ? (b.y - a.y) / (b.t - a.t) : 0;
    const dy = e.clientY - d.y0;
    // A flick back up keeps it open, however far the pull went.
    const close =
      !cancel &&
      dy > 0 &&
      v > -CLOSE.speed &&
      (dy >= CLOSE.share * el.offsetHeight || v >= CLOSE.speed);
    el.style.transition = "";
    el.style.translate = "";
    if (close) onClose();
  }

  return (
    <section
      ref={ref}
      id={id}
      aria-labelledby={`${id}-date`}
      data-open={open || undefined}
      inert={!open}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => end(e, false)}
      onPointerCancel={(e) => end(e, true)}
      className="day-sheet fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[70dvh] w-full max-w-lg overflow-hidden overscroll-contain rounded-t-2xl border border-b-0 border-zinc-200 bg-white px-5 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-zinc-900 shadow-[0_-8px_32px_-12px] shadow-zinc-950/20 select-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:shadow-black/60"
    >
      <span data-grab aria-hidden="true" className="-mx-5 block pt-0 pb-2">
        <span className="mx-auto block h-1 w-9 rounded-full bg-zinc-300 dark:bg-zinc-700" />
      </span>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 pt-1">
          <DayDetails {...day} roomy titleId={`${id}-date`} />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close day details"
          className="-mt-1 -mr-3 grid size-11 shrink-0 place-items-center rounded-full text-zinc-500 transition-[background-color,color,scale] duration-(--dur-micro) ease-out hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-hidden active:scale-[0.92] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
    </section>
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
function ChatList({
  chats,
  small,
}: {
  chats: ChatCount[];
  /** The text size class: `text-xs`, or `text-sm` in the sheet. */
  small: string;
}) {
  const hidden = chats.length - MAX_ROWS;
  return (
    <ul className="mt-1 space-y-0.5">
      {chats.slice(0, MAX_ROWS).map((chat, i) => (
        <li
          key={i}
          className={cn("flex items-start justify-between gap-3", small)}
        >
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
        <li className={cn(small, "text-zinc-500 dark:text-zinc-400")}>
          +{plural(hidden, "more chat")}
        </li>
      )}
    </ul>
  );
}
