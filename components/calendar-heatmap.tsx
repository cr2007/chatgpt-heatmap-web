
import React, { useId, useRef, useState, useCallback, useEffect, useLayoutEffect } from "react";
import { useTheme } from "next-themes";
import type { CalHeatmapDay, DayTitleBreakdown } from "@/lib/types";
import { shade, dayOfYear } from "@/lib/calendar-geometry";

/** Cell edge length in SVG units, before panel-fit scaling. */
const CELL = 11;
/** Gap between adjacent cells in SVG units. */
const GAP  = 2;
/** Cell edge length plus its gap - the repeat distance between cells. */
const STEP = CELL + GAP;

/** Low/medium/high intensity shades for ChatGPT activity cells. */
const GPT_COLORS    = ["#CCFFCC", "#5CE65C", "#008000"] as const;
/** Low/medium/high intensity shades for Claude activity cells. */
const CLAUDE_COLORS = ["#FED7AA", "#F97316", "#C2410C"] as const;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

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
  data, dayTitles, maxChatgpt, maxClaude, from, to, vertical = false,
}: CalendarHeatmapProps) {
  const { theme, resolvedTheme } = useTheme();
  const isDark = (theme === "system" ? resolvedTheme : theme) === "dark";

  const uid = useId().replace(/:/g, "");
  const outerRef    = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tip,   setTip]   = useState<{ day: string; cx: number; cy: number } | null>(null);
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

  const emptyFill  = isDark ? "#2a2a2a" : "#eee";
  const textFill   = isDark ? "#888"    : "#666";
  // A faint edge on every cell keeps the palest greens (e.g. #CCFFCC) from
  // blending into the empty-cell grey in light mode, without darkening the
  // grey itself or touching the colour scale.
  const cellStroke = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";

  // Step 1: derive the pixel geometry for the requested year range and
  // orientation, then compute a single scale factor that fits it to the
  // panel while preserving aspect ratio.
  const startYear = from.getFullYear();
  const endYear   = to.getFullYear();
  const numYears  = endYear - startYear + 1;

  // Layout constants
  // Horizontal: years stack top-to-bottom, weeks -> columns, dow -> rows
  const H = {
    dowW:   27,           // day-of-week label column
    monthH: 18,           // month label row
    yearH:  20,           // year label row
    yearGap: 22,
    pad: { t: 6, r: 8, b: 8, l: 8 },
  } as const;
  const H_SEC_H = H.yearH + H.monthH + 7 * STEP;

  // Vertical: years stack left-to-right, dow -> columns, weeks -> rows
  const V = {
    monthW:  28,          // month label column (left side)
    dowH:    15,          // day-of-week label row
    yearH:   16,          // year label row
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
    if (chatgpt <= 0 || claude <= 0 || maxChatgpt <= 0 || maxClaude <= 0) return;
    const pct = Math.round((chatgpt / (chatgpt + claude)) * 100);
    const s1  = Math.max(2,  pct - 12);
    const s2  = Math.min(98, pct + 12);
    gradDefs.push(
      <linearGradient key={day} id={`${uid}g${day}`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset={`${s1}%`} stopColor={shade(chatgpt, maxChatgpt, GPT_COLORS)} />
        <stop offset={`${s2}%`} stopColor={shade(claude,  maxClaude,  CLAUDE_COLORS)} />
      </linearGradient>
    );
  });

  // Cell renderer
  const handleEnter = useCallback((e: React.MouseEvent, day: string) => {
    if (!containerRef.current) return;
    const b = containerRef.current.getBoundingClientRect();
    setTip({ day, cx: e.clientX - b.left, cy: e.clientY - b.top });
  }, []);
  const handleLeave = useCallback(() => setTip(null), []);

  /** Renders one day's `<rect>`, filled solid, gradient-split (both
   *  providers active), or the empty shade, with a hover handler only
   *  wired up when the day actually has data. */
  function makeCell(day: string, x: number, y: number): React.ReactElement {
    const { chatgpt = 0, claude = 0 } = data[day] ?? {};
    const hasData = chatgpt + claude > 0;
    let fill: string;
    if      (chatgpt > 0 && claude  > 0 && maxChatgpt > 0 && maxClaude > 0) fill = `url(#${uid}g${day})`;
    else if (chatgpt > 0 && maxChatgpt > 0) fill = shade(chatgpt, maxChatgpt, GPT_COLORS);
    else if (claude  > 0 && maxClaude  > 0) fill = shade(claude,  maxClaude,  CLAUDE_COLORS);
    else fill = emptyFill;
    return (
      <rect
        key={day} x={x} y={y} width={CELL} height={CELL} rx={2} fill={fill}
        stroke={cellStroke} strokeWidth={1}
        onMouseEnter={hasData ? e => handleEnter(e, day) : undefined}
        onMouseLeave={hasData ? handleLeave : undefined}
      />
    );
  }

  // Step 3: lay out each year's labels and cells, one section per year,
  // branching on orientation (weeks as columns vs. weeks as rows).
  const els: React.ReactElement[] = [];

  for (let yi = 0; yi < numYears; yi++) {
    const year   = startYear + yi;
    const jan1   = new Date(year, 0, 1);
    const jan1wd = jan1.getDay();

    if (!vertical) {
      // Horizontal
      const yOff  = H.pad.t + yi * (H_SEC_H + H.yearGap);
      const gridY = yOff + H.yearH + H.monthH;

      // Year label
      els.push(
        <text key={`yr${year}`}
          x={H.pad.l + H.dowW} y={yOff + H.yearH - 4}
          fill={textFill} fontSize={12} fontWeight="600" fontFamily="GeistSans, system-ui, sans-serif"
        >{year}</text>
      );

      // Day-of-week labels (Mon / Wed / Fri)
      ([[1, "Mon"], [3, "Wed"], [5, "Fri"]] as [number, string][]).forEach(([row, lbl]) =>
        els.push(
          <text key={`dh${year}${row}`}
            x={H.pad.l + 2} y={gridY + row * STEP + CELL - 2}
            fill={textFill} fontSize={9} fontFamily="GeistSans, system-ui, sans-serif"
          >{lbl}</text>
        )
      );

      // Month labels
      for (let m = 0; m < 12; m++) {
        const col = Math.floor((dayOfYear(new Date(year, m, 1)) + jan1wd) / 7);
        els.push(
          <text key={`mh${year}${m}`}
            x={H.pad.l + H.dowW + col * STEP}
            y={yOff + H.yearH + H.monthH - 4}
            fill={textFill} fontSize={10} fontFamily="GeistSans, system-ui, sans-serif"
          >{MONTHS[m]}</text>
        );
      }

      // Cells
      const cur = new Date(year, 0, 1);
      while (cur.getFullYear() === year) {
        const day = cur.toLocaleDateString("sv-SE");
        const col = Math.floor((dayOfYear(cur) + jan1wd) / 7);
        const row = cur.getDay();
        els.push(makeCell(day, H.pad.l + H.dowW + col * STEP, gridY + row * STEP));
        cur.setDate(cur.getDate() + 1);
      }

    } else {
      // Vertical
      const xOff  = V.pad.l + yi * (V_SEC_W + V.yearGap);
      const gridX = xOff + V.monthW;
      const gridY = V.pad.t + V.yearH + V.dowH;

      // Year label
      els.push(
        <text key={`yr${year}`}
          x={gridX} y={V.pad.t + V.yearH - 4}
          fill={textFill} fontSize={11} fontWeight="600" fontFamily="GeistSans, system-ui, sans-serif"
        >{year}</text>
      );

      // Day-of-week labels (S M T W T F S)
      "SMTWTFS".split("").forEach((lbl, col) =>
        els.push(
          <text key={`dv${year}${col}`}
            x={gridX + col * STEP + CELL / 2}
            y={V.pad.t + V.yearH + V.dowH - 3}
            fill={textFill} fontSize={8} fontFamily="GeistSans, system-ui, sans-serif" textAnchor="middle"
          >{lbl}</text>
        )
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
              <text key={`mv${year}${m}`}
                x={xOff + V.monthW - 3}
                y={gridY + weekIdx * STEP + CELL - 2}
                fill={textFill} fontSize={8} fontFamily="GeistSans, system-ui, sans-serif" textAnchor="end"
              >{MONTHS[m]}</text>
            );
          }
          cur.setDate(cur.getDate() + 1);
        }
      }

      // Cells
      const cur = new Date(year, 0, 1);
      while (cur.getFullYear() === year) {
        const day     = cur.toLocaleDateString("sv-SE");
        const weekIdx = Math.floor((dayOfYear(cur) + jan1wd) / 7);
        const col     = cur.getDay();
        els.push(makeCell(day, gridX + col * STEP, gridY + weekIdx * STEP));
        cur.setDate(cur.getDate() + 1);
      }
    }
  }

  // Step 4: position the hover tooltip next to the cursor, flipping to the
  // left edge (clamped to the viewport) when it would overflow the right.
  const tipData  = tip ? (data[tip.day] ?? { chatgpt: 0, claude: 0 }) : null;
  const tipTotal = tipData ? tipData.chatgpt + tipData.claude : 0;
  const TIP_W    = 260;

  let tipLeft = 0;
  if (tip && containerRef.current) {
    const b = containerRef.current.getBoundingClientRect();
    const wouldOverflowRight = b.left + tip.cx + 14 + TIP_W > window.innerWidth;
    if (wouldOverflowRight) {
      // Flip left, but clamp so it never exits the viewport's left edge
      tipLeft = Math.max(-b.left + 4, tip.cx - TIP_W - 6);
    } else {
      tipLeft = tip.cx + 14;
    }
  }

  return (
    <div
      ref={outerRef}
      style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
    <div ref={containerRef} style={{ position: "relative" }}>
      <svg
        role="img"
        aria-label={`Calendar heatmap of AI chat activity from ${from.getFullYear()} to ${to.getFullYear()}`}
        viewBox={`0 0 ${svgW} ${svgH}`}
        width={renderedW}
        height={renderedH}
        style={{ display: "block" }}
      >
        <defs>{gradDefs}</defs>
        {els}
      </svg>

      {tip && tipData && tipTotal > 0 && (() => {
        const titles  = dayTitles[tip.day];
        const gptT    = titles?.chatgpt ?? {};
        const claudeT = titles?.claude  ?? {};
        const hasBoth = tipData.chatgpt > 0 && tipData.claude > 0;
        const fg      = isDark ? "#f9fafb" : "#111827";
        const sub     = isDark ? "#d1d5db" : "#374151";
        const muted   = isDark ? "#9ca3af" : "#6b7280";

        return (
          <div style={{
            position: "absolute",
            left: tipLeft,
            top: tip.cy - 10,
            pointerEvents: "none",
            zIndex: 20,
            background: isDark ? "#1f2937" : "#fff",
            border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,.12)",
            padding: "8px 10px",
            minWidth: 140,
            maxWidth: TIP_W,
          }}>
            <p style={{ fontWeight: 600, color: fg, fontSize: 13, marginBottom: 6 }}>
              {tip.day}:{" "}
              <span style={{ fontWeight: 400 }}>{tipTotal} messages</span>
            </p>

            {tipData.chatgpt > 0 && (
              <div style={{ marginBottom: hasBoth ? 6 : 0 }}>
                {hasBoth && (
                  <p style={{ fontSize: 10, fontWeight: 600, color: "#16a34a", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    ChatGPT
                  </p>
                )}
                {Object.entries(gptT).map(([title, count]) => (
                  <p key={title} style={{ color: sub, fontSize: 11, display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 1 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 190 }}>{title}</span>
                    <span style={{ color: muted, flexShrink: 0 }}>{count}</span>
                  </p>
                ))}
              </div>
            )}

            {tipData.claude > 0 && (
              <div>
                {hasBoth && (
                  <p style={{ fontSize: 10, fontWeight: 600, color: "#ea580c", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Claude
                  </p>
                )}
                {Object.entries(claudeT).map(([title, count]) => (
                  <p key={title} style={{ color: sub, fontSize: 11, display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 1 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 190 }}>{title}</span>
                    <span style={{ color: muted, flexShrink: 0 }}>{count}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
    </div>
  );
}
