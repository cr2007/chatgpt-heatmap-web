import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CalHeatmapDay, DayTitleBreakdown, Provider } from "@/lib/types";
import {
  CELL,
  fitScale,
  layoutCalendar,
  level,
  type Edges,
} from "@/lib/calendar-geometry";
import { providerInfo } from "@/lib/providers";
import { cn, formatDay, plural } from "@/lib/utils";
import { useElementSize } from "@/hooks/use-element-size";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DaySheet, DayTooltip } from "@/components/day-details";
import { useCalendarSwipe, type Swipe } from "@/components/calendar-swipe";
import { playMorph } from "@/components/calendar-morph";

/** Wait in ms before the tooltip hides, so crossing the gap between cells keeps it. */
const HIDE_DELAY = 80;
/** Shade class prefixes of each provider (`ramp` in lib/providers.ts, from
 *  {@link providerInfo}). */
const GPT = providerInfo("chatgpt").ramp;
const CLAUDE = providerInfo("claude").ramp;

/**
 * Gives the accessible name of a day cell.
 *
 * @param name - The readable day, for example "Sun, Mar 10, 2024".
 * @param chatgpt - ChatGPT prompts on the day.
 * @param claude - Claude prompts on the day.
 * @param outside - The day is outside the export.
 * @returns For example "Sun, Mar 10, 2024: 3 prompts (ChatGPT 2, Claude 1)".
 */
function describeDay(
  name: string,
  chatgpt: number,
  claude: number,
  outside: boolean,
): string {
  if (outside) return `${name}: outside the export`;
  if (chatgpt + claude === 0) return `${name}: no prompts`;
  const parts = [
    chatgpt > 0 && `ChatGPT ${chatgpt}`,
    claude > 0 && `Claude ${claude}`,
  ].filter(Boolean);
  return `${name}: ${plural(chatgpt + claude, "prompt")} (${parts.join(", ")})`;
}

/**
 * Moves a day by a number of days, in UTC so no clock change shifts it.
 *
 * @param day - A `YYYY-MM-DD` day.
 * @param n - Days to add; a negative number goes back.
 * @returns The `YYYY-MM-DD` day `n` days after `day`.
 */
const addDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * 864e5)
    .toISOString()
    .slice(0, 10);

/**
 * Picks the shade class of a day.
 *
 * A day outside the export is hollow, so it does not read as a day with
 * no prompts.
 *
 * @param day - The `YYYY-MM-DD` day.
 * @param chatgpt - ChatGPT prompts on the day.
 * @param claude - Claude prompts on the day.
 * @param edges - The shade level edges per provider.
 * @param firstDay - The first day of the export, if known.
 * @param lastDay - The last day of the export, if known.
 * @returns One provider's level class; `undefined` for a day with both
 *   (its gradient fill sets the colors); `lv-0` when empty; `lv-out` when
 *   outside the export.
 */
function shadeClass(
  day: string,
  chatgpt: number,
  claude: number,
  edges: Record<Provider, Edges>,
  firstDay?: string,
  lastDay?: string,
): string | undefined {
  if (chatgpt > 0 && claude > 0) return undefined;
  if (chatgpt > 0) return `lv-${GPT}${level(chatgpt, edges.chatgpt)}`;
  if (claude > 0) return `lv-${CLAUDE}${level(claude, edges.claude)}`;
  if ((firstDay && day < firstDay) || (lastDay && day > lastDay))
    return "lv-out";
  return "lv-0";
}

/** Props of {@link CalendarHeatmap}. */
interface CalendarHeatmapProps {
  /** Prompt counts per provider, by `YYYY-MM-DD` day. */
  data: Record<string, CalHeatmapDay>;
  /** The chats of each day, for the day details. */
  dayTitles: Record<string, DayTitleBreakdown>;
  /** Shade level edges per provider. */
  edges: Record<Provider, Edges>;
  /** First day of the export (`YYYY-MM-DD`); days before it are hollow. */
  firstDay?: string;
  /** Last day of the export (`YYYY-MM-DD`); days after it are hollow. */
  lastDay?: string;
  /** Only its year counts: the calendar starts on January 1. */
  from: Date;
  /** Only its year counts: the calendar ends on December 31. */
  to: Date;
  /**
   * Weeks run down the page (the phone layout), not across.
   *
   * @defaultValue false
   */
  vertical?: boolean;
  /**
   * Counts time zone changes; each new value runs the date-order sweep.
   * 0 means none.
   *
   * @defaultValue 0
   */
  sweep?: number;
  /**
   * The panel has a fixed height (the fold layouts), so the calendar fits it.
   *
   * @defaultValue false
   */
  fixedHeight?: boolean;
  /**
   * Largest scale where the page scrolls (see {@link fitScale}).
   *
   * @defaultValue 1
   */
  maxScale?: number;
  /** Id of the root; the day details get `${id}-tip` and the drawing
   *  `${id}-svg`. */
  id?: string;
  /** Half-open foldables: show the day details in this pane (DayPane) in
   *  place of a floating card. `id` is the pane's id; `onPick` gets each
   *  picked day, or null. */
  pane?: { id: string; onPick: (day: string | null) => void };
  /** A sideways touch swipe goes to the previous or next view ({@link useCalendarSwipe}). */
  swipe?: Swipe;
}

/**
 * Draws one or more years of ChatGPT and Claude activity as an SVG calendar.
 *
 * It scales to fit its panel and shows a tooltip for each day on hover,
 * keyboard focus or a tap.
 *
 * @see {@link layoutCalendar} for the place of each cell and label.
 * @see {@link playMorph} for the year change motion.
 * @see {@link DayTooltip} for the day details.
 */
export function CalendarHeatmap({
  data,
  dayTitles,
  edges,
  firstDay,
  lastDay,
  from,
  to,
  vertical = false,
  sweep = 0,
  fixedHeight = false,
  maxScale = 1,
  id,
  pane,
  swipe,
}: CalendarHeatmapProps) {
  const uid = useId().replace(/:/g, "");
  const tipId = `${id ?? uid}-tip`;
  const sheetId = `${id ?? uid}-sheet`;
  const [outerRef, panel] = useElementSize<HTMLDivElement>();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  /** The day whose details show, and where, relative to the grid. A tap
   *  keeps them open until the next tap. */
  const [shownTip, setTip] = useState<{
    /** The view (first and last year) they opened in. */
    view: string;
    day: string;
    x: number;
    y: number;
    tap?: boolean;
    sheet?: boolean;
  } | null>(null);
  /** The day in the sheet; it stays while the sheet slides out. */
  const [sheetDay, setSheetDay] = useState<string | null>(null);
  const hints = useRef<{ prev: HTMLElement | null; next: HTMLElement | null }>({
    prev: null,
    next: null,
  });
  const swiped = useCalendarSwipe(outerRef, containerRef, hints, swipe);
  /** The kind of a pointer press under way, so the focus it gives is not taken for the keyboard's. */
  const pressedWith = useRef("");
  /** The day that keeps the tab stop; null means the latest day with prompts. */
  const [active, setActive] = useState<string | null>(null);
  /** The day that has keyboard focus (`:focus-visible`), for its ring. */
  const [keyed, setKeyed] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(hideTimer.current), []);
  /**
   * Sets the shown day, and tells the pane when there is one.
   *
   * @param next - The day and its place in the grid, or null to hide.
   */
  function show(next: Omit<NonNullable<typeof tip>, "view"> | null) {
    setTip(next && { ...next, view });
    if (next?.sheet) setSheetDay(next.day);
    pane?.onPick(next?.day ?? null);
  }

  // Step 1: Lay out the years (lib/calendar-geometry.ts); scale the SVG to the panel.
  // Keyed on the years: the page passes new Date objects on each render.
  const [startYear, endYear] = [from.getFullYear(), to.getFullYear()];
  // A new view closes floating details: their day may not be in it (a pane keeps it).
  const view = `${startYear}-${endYear}`;
  const tip = pane || shownTip?.view === view ? shownTip : null;
  const layout = useMemo(
    () =>
      layoutCalendar(startYear, endYear, vertical, {
        from: firstDay,
        to: lastDay,
      }),
    [startYear, endYear, vertical, firstDay, lastDay],
  );
  // Very large screens grow the root font (app/globals.css); the calendar
  // grows with it, so it keeps its share of the page.
  const rem =
    typeof document === "undefined"
      ? 1
      : parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
  const scale = fitScale(panel, layout, fixedHeight, maxScale * rem);
  // A new view of the years plays the morph that the page prepared
  // (components/calendar-morph.ts); without one it is a no-op.
  useLayoutEffect(() => {
    if (svgRef.current) playMorph(svgRef.current);
  }, [startYear, endYear]);
  /** Each drawn day's readable name, made once per layout. */
  const names = useMemo(
    () => new Map(layout.cells.map((c) => [c.day, formatDay(c.day)])),
    [layout],
  );
  /** The latest drawn day with prompts, or the first drawn day. */
  const latestDay = useMemo(
    () =>
      Object.keys(data)
        .filter((d) => names.has(d))
        .sort()
        .at(-1) ?? layout.cells[0]?.day,
    [data, names, layout],
  );
  const tabStop = active && names.has(active) ? active : latestDay;
  const renderedW = Math.round(layout.width * scale) || layout.width;
  const renderedH = Math.round(layout.height * scale) || layout.height;

  // Step 2: Make a two-color gradient for each day with both providers.
  const gradients = useMemo(
    () =>
      Object.entries(data).flatMap(([day, { chatgpt, claude }]) => {
        if (chatgpt <= 0 || claude <= 0) return [];
        const pct = Math.round((chatgpt / (chatgpt + claude)) * 100);
        return (
          <linearGradient
            key={day}
            id={`${uid}g${day}`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop
              offset={`${Math.max(2, pct - 12)}%`}
              className={`st-${GPT}${level(chatgpt, edges.chatgpt)}`}
            />
            <stop
              offset={`${Math.min(98, pct + 12)}%`}
              className={`st-${CLAUDE}${level(claude, edges.claude)}`}
            />
          </linearGradient>
        );
      }),
    [data, edges, uid],
  );

  // Step 4: Show the day details. With `pane`, they go to the pane and stay
  // until the next pick.
  // Step 4.1: On hover, at the cursor.
  /**
   * Shows the details of a day at the mouse.
   *
   * @param e - The pointer event; a finger is ignored (a mouse or a pen hovers).
   * @param day - The `YYYY-MM-DD` day under the pointer.
   */
  function handleEnter(e: React.PointerEvent, day: string) {
    // A finger has no hover; an open sheet stays until a tap or a close.
    if (e.pointerType === "touch" || tip?.sheet || !containerRef.current)
      return;
    clearTimeout(hideTimer.current);
    const b = containerRef.current.getBoundingClientRect();
    show({ day, x: e.clientX - b.left, y: e.clientY - b.top });
  }
  // Step 4.2: Leaving waits a moment, so the next cell updates the open tooltip
  // instead of reopening it. A pane keeps the last day.
  /**
   * Hides floating details after {@link HIDE_DELAY}; a tap or a pane keeps
   * them.
   *
   * @param day - The `YYYY-MM-DD` day left. Details of another day stay: the
   *   pointer already entered it (React sends that enter first).
   */
  function handleLeave(day: string) {
    if (pane) return;
    hideTimer.current = setTimeout(
      () => setTip((t) => (t?.tap || t?.day !== day ? t : null)),
      HIDE_DELAY,
    );
  }

  // Step 4.3: On keyboard focus or a tap, at the cell.
  /**
   * Shows the details of a day under its cell (keyboard focus or a tap).
   *
   * A day with no prompts hides the details.
   *
   * @param day - The `YYYY-MM-DD` day.
   * @param cell - The day's cell, which gives the place.
   * @param tap - A tap opened them, so they stay until the next tap.
   * @param sheet - A finger opened them: they show in the sheet.
   * @defaultValue `tap` and `sheet` are false.
   */
  function showAtCell(day: string, cell: Element, tap = false, sheet = false) {
    const box = containerRef.current?.getBoundingClientRect();
    if (!box || !data[day]) return show(null);
    clearTimeout(hideTimer.current);
    const c = cell.getBoundingClientRect();
    show({
      day,
      x: c.left + c.width / 2 - box.left,
      y: c.bottom - box.top,
      tap,
      sheet: sheet && !pane,
    });
  }

  // Step 4.4: One cell is a tab stop; the arrow keys move by day and by week.
  /**
   * Moves the tab stop between days with the keyboard.
   *
   * Arrow keys move by a day along a week and by a week across weeks; Home
   * and End go to the first and last drawn day; Escape hides the details.
   *
   * @param e - A key press on a focused cell.
   * @see https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/ for the
   *   roving tab stop.
   * @see https://www.w3.org/WAI/ARIA/apg/patterns/grid/ for the arrow, Home
   *   and End keys.
   */
  function onKeyDown(e: React.KeyboardEvent<SVGSVGElement>) {
    const day = (e.target as Element).getAttribute("data-day");
    if (!day) return;
    if (e.key === "Escape") return show(null);
    const along = vertical
      ? ["ArrowLeft", "ArrowRight"]
      : ["ArrowUp", "ArrowDown"];
    const across = vertical
      ? ["ArrowUp", "ArrowDown"]
      : ["ArrowLeft", "ArrowRight"];
    const next =
      e.key === along[0]
        ? addDays(day, -1)
        : e.key === along[1]
          ? addDays(day, 1)
          : e.key === across[0]
            ? addDays(day, -7)
            : e.key === across[1]
              ? addDays(day, 7)
              : e.key === "Home"
                ? layout.cells[0]?.day
                : e.key === "End"
                  ? layout.cells.at(-1)?.day
                  : undefined;
    if (!next) return;
    e.preventDefault();
    if (!names.has(next)) return;
    setActive(next);
    containerRef.current
      ?.querySelector<SVGRectElement>(`[data-day="${next}"]`)
      ?.focus();
  }

  // A tap outside the calendar closes details that a tap opened (a pane keeps them).
  useEffect(() => {
    if (!tip?.tap || pane) return;
    const close = (e: PointerEvent) => {
      if (!(e.target as Element).closest?.(`[data-day], #${sheetId}`))
        setTip(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [tip?.tap, pane, sheetId]);

  /**
   * Hides tap details on a second tap of the same day, else shows them.
   *
   * A tap or a click opens the sheet, with a finger, a pen or a mouse (a
   * hover shows the card). The release of a swipe is no tap.
   *
   * @param e - The pointer up event.
   * @param day - The `YYYY-MM-DD` day.
   */
  function onTapUp(e: React.PointerEvent<SVGRectElement>, day: string) {
    if (swiped.current || e.button > 0) return;
    if (tip?.tap && tip.day === day && !pane) show(null);
    else showAtCell(day, e.currentTarget, true, true);
  }
  // The cells call the handlers of the latest render through this ref.
  const on = useRef({ handleEnter, handleLeave, showAtCell, onTapUp });
  useLayoutEffect(() => {
    on.current = { handleEnter, handleLeave, showAtCell, onTapUp };
  });
  // A hover ends with the native pointerleave: React's onPointerLeave comes
  // from pointerout, which a browser may skip when a pen leaves hover range.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const leave = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const day = (e.target as Element).getAttribute?.("data-day");
      if (day) on.current.handleLeave(day);
    };
    // Capture: pointerleave does not bubble, but the capture phase still runs.
    svg.addEventListener("pointerleave", leave, true);
    return () => svg.removeEventListener("pointerleave", leave, true);
  }, []);
  // The open details describe their cell, and a tapped day is marked as
  // picked (set here, so the cells stay memoized).
  // The ring of the picked or keyed day: drawn over the cells, apart from its
  // cell by a page-coloured gap, so it shows on every shade.
  const ringDay = tip?.tap ? tip.day : keyed;
  const ring = useMemo(
    () => ringDay && layout.cells.find((c) => c.day === ringDay),
    [layout, ringDay],
  );
  const describedBy = pane?.id ?? (tip?.sheet ? sheetId : tipId);
  useLayoutEffect(() => {
    const cell = tip
      ? svgRef.current?.querySelector(`[data-day="${tip.day}"]`)
      : null;
    if (!cell) return;
    cell.setAttribute("aria-describedby", describedBy);
    cell.toggleAttribute("data-picked", !!tip?.tap);
    return () => {
      cell.removeAttribute("aria-describedby");
      cell.removeAttribute("data-picked");
    };
  }, [tip, describedBy, layout]);

  /** Closes the sheet; stable, so the sheet keeps one Escape listener. */
  const closeSheet = useCallback(() => setTip(null), []);
  // A sheet that opens over its cell scrolls the page, so the cell stays in view.
  const sheetFor = tip?.sheet ? tip.day : null;
  useEffect(() => {
    const sheet = sheetFor && document.getElementById(sheetId);
    const cell = svgRef.current?.querySelector(`[data-day="${sheetFor}"]`);
    if (!sheet || !cell) return;
    const over =
      cell.getBoundingClientRect().bottom -
      (innerHeight - sheet.offsetHeight - 16);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (over > 0)
      scrollBy({ top: over, behavior: reduced ? "instant" : "smooth" });
  }, [sheetFor, sheetId]);

  // Step 3: Draw the cells; `--t` orders color changes by date, 2 sweep names restart it.
  // The faint edge keeps the palest shade apart from the empty grey.
  const cells = useMemo(() => {
    const cellClass = cn(
      "heat-cell stroke-[rgba(0,0,0,0.08)] dark:stroke-[rgba(255,255,255,0.06)]",
      sweep > 0 && (sweep % 2 ? "sweep-a" : "sweep-b"),
    );
    return layout.cells.map(({ day, x, y, t }) => {
      const { chatgpt = 0, claude = 0 } = data[day] ?? {};
      const hasData = chatgpt + claude > 0;
      const outside =
        (!!firstDay && day < firstDay) || (!!lastDay && day > lastDay);
      return (
        <rect
          key={day}
          x={x}
          y={y}
          width={CELL}
          height={CELL}
          rx={2}
          fill={chatgpt > 0 && claude > 0 ? `url(#${uid}g${day})` : undefined}
          strokeWidth={1}
          className={cn(
            cellClass,
            shadeClass(day, chatgpt, claude, edges, firstDay, lastDay),
          )}
          style={{ "--t": t.toFixed(3) } as React.CSSProperties}
          data-day={day}
          tabIndex={day === tabStop ? 0 : -1}
          // Pointer events with a mouse check: a tap also fires
          // compatibility mouse events, which would close its details.
          onPointerEnter={
            hasData ? (e) => on.current.handleEnter(e, day) : undefined
          }
          onPointerDown={(e) => {
            // A scroll or a swipe never focuses the cell: forget the press soon.
            pressedWith.current = e.pointerType;
            setTimeout(() => (pressedWith.current = ""), 1000);
          }}
          onFocus={(e) => {
            setActive(day);
            setKeyed(e.currentTarget.matches(":focus-visible") ? day : null);
            // A pointer press is handled on its release (onTapUp); the
            // keyboard shows the card at the cell.
            if (pressedWith.current === "")
              on.current.showAtCell(day, e.currentTarget);
            pressedWith.current = "";
          }}
          onBlur={() => {
            setKeyed(null);
            on.current.handleLeave(day);
          }}
          onPointerUp={(e) => on.current.onTapUp(e, day)}
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- an SVG cell cannot be an <img>
          role="img"
          aria-label={describeDay(
            names.get(day) ?? day,
            chatgpt,
            claude,
            outside,
          )}
        />
      );
    });
  }, [layout, data, edges, firstDay, lastDay, sweep, uid, tabStop, names]);

  return (
    <div
      ref={outerRef}
      id={id}
      className={cn(
        "relative flex h-full w-full items-center justify-center",
        // The browser keeps the vertical scroll and the zoom; a sideways move is the swipe.
        swipe && "touch-pan-y touch-pinch-zoom",
      )}
    >
      <div ref={containerRef} className="relative">
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the key handler moves the roving tab stop between the focusable cells */}
        <svg
          ref={svgRef}
          id={`${id ?? uid}-svg`}
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- SVG has no group element with that meaning
          role="group"
          aria-label={`Calendar heatmap of AI chat activity from ${startYear} to ${endYear}. Use the arrow keys to move between days.`}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width={renderedW}
          height={renderedH}
          className="block"
          onKeyDown={onKeyDown}
        >
          <defs>{gradients}</defs>
          {layout.labels.map((l) => (
            <text
              key={l.key}
              data-key={l.key}
              x={l.x}
              y={l.y}
              className="fill-[#666] dark:fill-[#888]"
              fontSize={l.size}
              fontWeight={l.bold ? 600 : undefined}
              textAnchor={l.anchor}
            >
              {l.text}
            </text>
          ))}
          {cells}
          {ring && (
            <rect
              aria-hidden="true"
              className="cell-ring"
              x={ring.x - 2.5}
              y={ring.y - 2.5}
              width={CELL + 5}
              height={CELL + 5}
              rx={3.5}
            />
          )}
        </svg>

        {!pane && tip && !tip.sheet && data[tip.day] && (
          <DayTooltip
            id={tipId}
            day={tip.day}
            counts={data[tip.day]}
            chats={dayTitles[tip.day]}
            x={tip.x}
            y={tip.y}
          />
        )}
      </div>
      {/* Swipe hints: the view a release goes to (components/calendar-swipe.ts). */}
      {(["prev", "next"] as const).map(
        (key) =>
          swipe?.[key] && (
            <span
              key={key}
              ref={(el) => {
                hints.current[key] = el;
              }}
              aria-hidden="true"
              className={cn(
                "swipe-hint pointer-events-none absolute top-0 z-10 inline-flex h-9 items-center gap-1 rounded-full border border-zinc-200 bg-white/90 text-sm font-medium text-zinc-700 opacity-0 shadow-sm backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-200",
                key === "prev" ? "left-0 pr-3 pl-2" : "right-0 pr-2 pl-3",
              )}
            >
              {key === "prev" && <ChevronLeft aria-hidden="true" size={16} />}
              {swipe[key]}
              {key === "next" && <ChevronRight aria-hidden="true" size={16} />}
            </span>
          ),
      )}
      {/* The sheet sits in <body>: a transformed ancestor (the page's
          entrance, the swipe) would move a fixed element with it. */}
      {!pane &&
        sheetDay &&
        data[sheetDay] &&
        createPortal(
          <DaySheet
            id={sheetId}
            open={!!tip?.sheet}
            onClose={closeSheet}
            day={sheetDay}
            counts={data[sheetDay]}
            chats={dayTitles[sheetDay]}
          />,
          document.body,
        )}
    </div>
  );
}
