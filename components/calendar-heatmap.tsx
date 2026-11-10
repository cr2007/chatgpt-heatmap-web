import React, {
  useCallback,
  useEffect,
  useId,
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
import { cn, plural } from "@/lib/utils";
import { useElementSize } from "@/hooks/use-element-size";
import { DayTooltip } from "@/components/day-tooltip";

/** Wait in ms before the tooltip hides, so crossing the gap between cells keeps it. */
const HIDE_DELAY = 80;
const GPT = providerInfo("chatgpt").ramp;
const CLAUDE = providerInfo("claude").ramp;

/** Accessible name of a day cell, for example "2024-03-10: 3 messages (ChatGPT 2, Claude 1)". */
function describeDay(day: string, chatgpt: number, claude: number): string {
  const parts = [
    chatgpt > 0 && `ChatGPT ${chatgpt}`,
    claude > 0 && `Claude ${claude}`,
  ].filter(Boolean);
  return `${day}: ${plural(chatgpt + claude, "message")} (${parts.join(", ")})`;
}

export interface CalendarHeatmapProps {
  data: Record<string, CalHeatmapDay>;
  dayTitles: Record<string, DayTitleBreakdown>;
  /** Shade level edges per provider. */
  edges: Record<Provider, Edges>;
  /** First and last day of the export (`YYYY-MM-DD`); days outside are drawn hollow. */
  firstDay?: string;
  lastDay?: string;
  from: Date;
  to: Date;
  vertical?: boolean;
  /** Counts time zone changes; each new value runs the date-order sweep. 0 means none. */
  sweep?: number;
  /** The panel has a fixed height (the fold layouts), so the calendar fits it. */
  fixedHeight?: boolean;
  /** Largest scale where the page scrolls (see `fitScale`). */
  maxScale?: number;
}

/**
 * Draws one or more years of ChatGPT and Claude activity as an SVG calendar,
 * scaled to fit its panel, with a hover tooltip for each day.
 *
 * Step 1: Lay out the years (pure, in lib/calendar-geometry.ts) and scale
 *         the SVG to the panel, keeping its aspect ratio.
 * Step 2: Make a two-color gradient for each day with both providers.
 * Step 3: Draw the labels and the cells. Each cell carries its place in the
 *         date range as `--t`, which the CSS uses to run color changes in
 *         date order (see app/globals.css).
 * Step 4: Show the tooltip of the hovered day.
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
}: CalendarHeatmapProps) {
  const uid = useId().replace(/:/g, "");
  const [outerRef, panel] = useElementSize<HTMLDivElement>();
  const containerRef = useRef<HTMLDivElement>(null);
  /** The hovered day and the cursor position relative to the grid. */
  const [tip, setTip] = useState<{ day: string; x: number; y: number } | null>(
    null,
  );
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(hideTimer.current), []);

  // Step 1
  // Keyed on the years: the page passes new Date objects on each render.
  const [startYear, endYear] = [from.getFullYear(), to.getFullYear()];
  const layout = useMemo(
    () => layoutCalendar(startYear, endYear, vertical),
    [startYear, endYear, vertical],
  );
  const scale = fitScale(panel, layout, fixedHeight, maxScale);
  const renderedW = Math.round(layout.width * scale) || layout.width;
  const renderedH = Math.round(layout.height * scale) || layout.height;

  // Step 2
  const gradients = Object.entries(data).flatMap(
    ([day, { chatgpt, claude }]) => {
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
    },
  );

  // Step 4: leaving waits a moment, so moving to the next cell updates the
  // open tooltip instead of reopening it.
  const handleEnter = useCallback((e: React.MouseEvent, day: string) => {
    if (!containerRef.current) return;
    clearTimeout(hideTimer.current);
    const b = containerRef.current.getBoundingClientRect();
    setTip({ day, x: e.clientX - b.left, y: e.clientY - b.top });
  }, []);
  const handleLeave = useCallback(() => {
    hideTimer.current = setTimeout(() => setTip(null), HIDE_DELAY);
  }, []);

  /** The shade class of a day: one provider's level, none for a day with
   *  both (its gradient fill sets the colors), empty, or hollow when the day
   *  is outside the export, so it does not read as a day with no prompts. */
  function shadeClass(
    day: string,
    chatgpt: number,
    claude: number,
  ): string | undefined {
    if (chatgpt > 0 && claude > 0) return undefined;
    if (chatgpt > 0) return `lv-${GPT}${level(chatgpt, edges.chatgpt)}`;
    if (claude > 0) return `lv-${CLAUDE}${level(claude, edges.claude)}`;
    if ((firstDay && day < firstDay) || (lastDay && day > lastDay))
      return "lv-out";
    return "lv-0";
  }

  // Step 3: two sweep names, so that each new sweep restarts the animation.
  // The faint edge keeps the palest green apart from the empty grey.
  const cellClass = cn(
    "heat-cell stroke-[rgba(0,0,0,0.08)] dark:stroke-[rgba(255,255,255,0.06)]",
    sweep > 0 && (sweep % 2 ? "sweep-a" : "sweep-b"),
  );

  return (
    <div
      ref={outerRef}
      className="flex h-full w-full items-center justify-center"
    >
      <div ref={containerRef} className="relative">
        <svg
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- SVG has no group element with that meaning
          role="group"
          aria-label={`Calendar heatmap of AI chat activity from ${startYear} to ${endYear}`}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width={renderedW}
          height={renderedH}
          className="block"
        >
          <defs>{gradients}</defs>
          {layout.labels.map((l) => (
            <text
              key={l.key}
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
          {layout.cells.map(({ day, x, y, t }) => {
            const { chatgpt = 0, claude = 0 } = data[day] ?? {};
            const hasData = chatgpt + claude > 0;
            return (
              <rect
                key={day}
                x={x}
                y={y}
                width={CELL}
                height={CELL}
                rx={2}
                fill={
                  chatgpt > 0 && claude > 0 ? `url(#${uid}g${day})` : undefined
                }
                strokeWidth={1}
                className={cn(cellClass, shadeClass(day, chatgpt, claude))}
                style={{ "--t": t.toFixed(3) } as React.CSSProperties}
                onMouseEnter={hasData ? (e) => handleEnter(e, day) : undefined}
                onMouseLeave={hasData ? handleLeave : undefined}
                role={hasData ? "img" : undefined}
                aria-label={
                  hasData ? describeDay(day, chatgpt, claude) : undefined
                }
              />
            );
          })}
        </svg>

        {tip && data[tip.day] && (
          <DayTooltip
            day={tip.day}
            counts={data[tip.day]}
            chats={dayTitles[tip.day]}
            x={tip.x}
            y={tip.y}
          />
        )}
      </div>
    </div>
  );
}
