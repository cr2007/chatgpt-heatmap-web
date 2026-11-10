import React, {
  useId,
  useRef,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
} from "react";
import { useTheme } from "next-themes";
import type { CalHeatmapDay, DayTitleBreakdown } from "@/lib/types";
import { shade, dayOfYear } from "@/lib/calendar-geometry";
import { plural } from "@/lib/utils";
import { DayTooltip } from "@/components/day-tooltip";

/** Cell edge length in SVG units, before panel-fit scaling. */
const CELL = 11;
/** Gap between adjacent cells in SVG units. */
const GAP = 2;
/** Cell edge length plus its gap - the repeat distance between cells. */
const STEP = CELL + GAP;

/** Low/medium/high intensity shades for ChatGPT activity cells. */
const GPT_COLORS = ["#CCFFCC", "#5CE65C", "#008000"] as const;
/** Low/medium/high intensity shades for Claude activity cells. */
const CLAUDE_COLORS = ["#FED7AA", "#F97316", "#C2410C"] as const;
/** Wait in ms before the tooltip hides, so crossing the gap between cells keeps it. */
const HIDE_DELAY = 80;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

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
  maxChatgpt: number;
  maxClaude: number;
  from: Date;
  to: Date;
  vertical?: boolean;
}

/**
 * Renders one or more years of ChatGPT/Claude activity as an inline SVG
 * calendar grid, scaled to fill its container while preserving aspect
 * ratio, with a hover tooltip breaking down each day's conversation titles.
 */
export function CalendarHeatmap({
  data,
  dayTitles,
  maxChatgpt,
  maxClaude,
  from,
  to,
  vertical = false,
}: CalendarHeatmapProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const uid = useId().replace(/:/g, "");
  const outerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  /** The hovered day and the cursor position relative to the grid. */
  const [tip, setTip] = useState<{ day: string; x: number; y: number } | null>(
    null,
  );
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(hideTimer.current), []);
  const [avail, setAvail] = useState({ w: 0, h: 0 });

  // Measure on first paint (synchronous) to avoid a visible flash.
  useLayoutEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    if (width > 0 || height > 0) setAvail({ w: width, h: height });
  }, []);

  // Track panel resizes.
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setAvail({ w: width, h: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const emptyFill = isDark ? "#2a2a2a" : "#eee";
  const textFill = isDark ? "#888" : "#666";
  // A faint edge on every cell keeps the palest greens (e.g. #CCFFCC) from
  // blending into the empty-cell grey in light mode, without darkening the
  // grey itself or touching the colour scale.
  const cellStroke = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";

  // Step 1: derive the pixel geometry for the requested year range and
  // orientation, then compute a single scale factor that fits it to the
  // panel while preserving aspect ratio.
  const startYear = from.getFullYear();
  const endYear = to.getFullYear();
  const numYears = endYear - startYear + 1;

  // Layout constants
  // Horizontal: years stack top-to-bottom, weeks -> columns, dow -> rows
  const H = {
    dowW: 27, // day-of-week label column
    monthH: 18, // month label row
    yearH: 20, // year label row
    yearGap: 22,
    pad: { t: 6, r: 8, b: 8, l: 8 },
  } as const;
  const H_SEC_H = H.yearH + H.monthH + 7 * STEP;

  // Vertical: years stack left-to-right, dow -> columns, weeks -> rows
  const V = {
    monthW: 28, // month label column (left side)
    dowH: 15, // day-of-week label row
    yearH: 16, // year label row
    yearGap: 18,
    pad: { t: 6, r: 6, b: 6, l: 6 },
  } as const;
  const V_SEC_W = V.monthW + 7 * STEP;

  const svgW = vertical
    ? V.pad.l + numYears * V_SEC_W + (numYears - 1) * V.yearGap + V.pad.r
    : H.pad.l + H.dowW + 54 * STEP + H.pad.r;

  const svgH = vertical
    ? V.pad.t + V.yearH + V.dowH + 54 * STEP + V.pad.b
    : H.pad.t + numYears * H_SEC_H + (numYears - 1) * H.yearGap + H.pad.b;

  // Scale SVG to fill the available panel area while preserving aspect ratio.
  // No upper cap: upscaling is fine for narrow single-year panels.
  const scale = (() => {
    if (!avail.w) return 1;
    const sw = avail.w / svgW;
    if (!avail.h) return sw;
    return Math.min(sw, avail.h / svgH);
  })();
  const renderedW = Math.round(svgW * scale) || svgW;
  const renderedH = Math.round(svgH * scale) || svgH;

  // Step 2: build a per-day linear gradient for any day with both ChatGPT
  // and Claude activity, split at the point matching their share of the day.
  const gradDefs: React.ReactElement[] = [];
  Object.entries(data).forEach(([day, { chatgpt, claude }]) => {
    if (chatgpt <= 0 || claude <= 0 || maxChatgpt <= 0 || maxClaude <= 0)
      return;
    const pct = Math.round((chatgpt / (chatgpt + claude)) * 100);
    const s1 = Math.max(2, pct - 12);
    const s2 = Math.min(98, pct + 12);
    gradDefs.push(
      <linearGradient
        key={day}
        id={`${uid}g${day}`}
        x1="0%"
        y1="0%"
        x2="100%"
        y2="0%"
      >
        <stop
          offset={`${s1}%`}
          stopColor={shade(chatgpt, maxChatgpt, GPT_COLORS)}
        />
        <stop
          offset={`${s2}%`}
          stopColor={shade(claude, maxClaude, CLAUDE_COLORS)}
        />
      </linearGradient>,
    );
  });

  // Step 4: show the tooltip for the entered cell. Leaving waits a moment, so
  // moving to the next cell updates the open tooltip instead of reopening it.
  const handleEnter = useCallback((e: React.MouseEvent, day: string) => {
    if (!containerRef.current) return;
    clearTimeout(hideTimer.current);
    const b = containerRef.current.getBoundingClientRect();
    setTip({ day, x: e.clientX - b.left, y: e.clientY - b.top });
  }, []);
  const handleLeave = useCallback(() => {
    hideTimer.current = setTimeout(() => setTip(null), HIDE_DELAY);
  }, []);

  /** Renders one day's `<rect>`, filled solid, gradient-split (both
   *  providers active), or the empty shade. A day with data gets a hover
   *  handler and an accessible name, so screen readers can read the counts. */
  function makeCell(day: string, x: number, y: number): React.ReactElement {
    const { chatgpt = 0, claude = 0 } = data[day] ?? {};
    const hasData = chatgpt + claude > 0;
    let fill: string;
    if (chatgpt > 0 && claude > 0 && maxChatgpt > 0 && maxClaude > 0)
      fill = `url(#${uid}g${day})`;
    else if (chatgpt > 0 && maxChatgpt > 0)
      fill = shade(chatgpt, maxChatgpt, GPT_COLORS);
    else if (claude > 0 && maxClaude > 0)
      fill = shade(claude, maxClaude, CLAUDE_COLORS);
    else fill = emptyFill;
    return (
      <rect
        key={day}
        x={x}
        y={y}
        width={CELL}
        height={CELL}
        rx={2}
        fill={fill}
        stroke={cellStroke}
        strokeWidth={1}
        onMouseEnter={hasData ? (e) => handleEnter(e, day) : undefined}
        onMouseLeave={hasData ? handleLeave : undefined}
        role={hasData ? "img" : undefined}
        aria-label={hasData ? describeDay(day, chatgpt, claude) : undefined}
      />
    );
  }

  // Step 3: lay out each year's labels and cells, one section per year,
  // branching on orientation (weeks as columns vs. weeks as rows).
  const els: React.ReactElement[] = [];

  for (let yi = 0; yi < numYears; yi++) {
    const year = startYear + yi;
    const jan1 = new Date(year, 0, 1);
    const jan1wd = jan1.getDay();

    if (!vertical) {
      // Horizontal
      const yOff = H.pad.t + yi * (H_SEC_H + H.yearGap);
      const gridY = yOff + H.yearH + H.monthH;

      // Year label
      els.push(
        <text
          key={`yr${year}`}
          x={H.pad.l + H.dowW}
          y={yOff + H.yearH - 4}
          fill={textFill}
          fontSize={12}
          fontWeight="600"
        >
          {year}
        </text>,
      );

      // Day-of-week labels (Mon / Wed / Fri)
      (
        [
          [1, "Mon"],
          [3, "Wed"],
          [5, "Fri"],
        ] as [number, string][]
      ).forEach(([row, lbl]) =>
        els.push(
          <text
            key={`dh${year}${row}`}
            x={H.pad.l + 2}
            y={gridY + row * STEP + CELL - 2}
            fill={textFill}
            fontSize={9}
          >
            {lbl}
          </text>,
        ),
      );

      // Month labels
      for (let m = 0; m < 12; m++) {
        const col = Math.floor((dayOfYear(new Date(year, m, 1)) + jan1wd) / 7);
        els.push(
          <text
            key={`mh${year}${m}`}
            x={H.pad.l + H.dowW + col * STEP}
            y={yOff + H.yearH + H.monthH - 4}
            fill={textFill}
            fontSize={10}
          >
            {MONTHS[m]}
          </text>,
        );
      }

      // Cells
      const cur = new Date(year, 0, 1);
      while (cur.getFullYear() === year) {
        const day = cur.toLocaleDateString("sv-SE");
        const col = Math.floor((dayOfYear(cur) + jan1wd) / 7);
        const row = cur.getDay();
        els.push(
          makeCell(day, H.pad.l + H.dowW + col * STEP, gridY + row * STEP),
        );
        cur.setDate(cur.getDate() + 1);
      }
    } else {
      // Vertical
      const xOff = V.pad.l + yi * (V_SEC_W + V.yearGap);
      const gridX = xOff + V.monthW;
      const gridY = V.pad.t + V.yearH + V.dowH;

      // Year label
      els.push(
        <text
          key={`yr${year}`}
          x={gridX}
          y={V.pad.t + V.yearH - 4}
          fill={textFill}
          fontSize={11}
          fontWeight="600"
        >
          {year}
        </text>,
      );

      // Day-of-week labels (S M T W T F S)
      "SMTWTFS".split("").forEach((lbl, col) =>
        els.push(
          <text
            key={`dv${year}${col}`}
            x={gridX + col * STEP + CELL / 2}
            y={V.pad.t + V.yearH + V.dowH - 3}
            fill={textFill}
            fontSize={8}
            textAnchor="middle"
          >
            {lbl}
          </text>,
        ),
      );

      // Month labels (left side, one per month at its first week row)
      const seenM = new Set<number>();
      {
        const cur = new Date(year, 0, 1);
        while (cur.getFullYear() === year) {
          const m = cur.getMonth();
          if (!seenM.has(m)) {
            seenM.add(m);
            const weekIdx = Math.floor((dayOfYear(cur) + jan1wd) / 7);
            els.push(
              <text
                key={`mv${year}${m}`}
                x={xOff + V.monthW - 3}
                y={gridY + weekIdx * STEP + CELL - 2}
                fill={textFill}
                fontSize={8}
                textAnchor="end"
              >
                {MONTHS[m]}
              </text>,
            );
          }
          cur.setDate(cur.getDate() + 1);
        }
      }

      // Cells
      const cur = new Date(year, 0, 1);
      while (cur.getFullYear() === year) {
        const day = cur.toLocaleDateString("sv-SE");
        const weekIdx = Math.floor((dayOfYear(cur) + jan1wd) / 7);
        const col = cur.getDay();
        els.push(makeCell(day, gridX + col * STEP, gridY + weekIdx * STEP));
        cur.setDate(cur.getDate() + 1);
      }
    }
  }

  return (
    <div
      ref={outerRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div ref={containerRef} style={{ position: "relative" }}>
        <svg
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- SVG has no group element with that meaning
          role="group"
          aria-label={`Calendar heatmap of AI chat activity from ${from.getFullYear()} to ${to.getFullYear()}`}
          viewBox={`0 0 ${svgW} ${svgH}`}
          width={renderedW}
          height={renderedH}
          style={{ display: "block" }}
        >
          <defs>{gradDefs}</defs>
          {els}
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
