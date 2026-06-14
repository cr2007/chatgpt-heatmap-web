"use client";

import React, { useRef, useState, useCallback } from "react";
import { useTheme } from "next-themes";

const CELL = 11;
const GAP  = 2;
const STEP = CELL + GAP;

const GPT_COLORS    = ["#CCFFCC", "#5CE65C", "#008000"] as const;
const CLAUDE_COLORS = ["#FED7AA", "#F97316", "#C2410C"] as const;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export interface CalHeatmapDay {
  chatgpt: number;
  claude: number;
}

export interface DayTitleBreakdown {
  chatgpt: Record<string, number>;
  claude: Record<string, number>;
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

function shade(n: number, max: number, p: readonly [string, string, string]): string {
  const r = n / max;
  return r < 0.34 ? p[0] : r < 0.67 ? p[1] : p[2];
}

function doy(d: Date): number {
  return Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 864e5);
}

export function CalendarHeatmap({
  data, dayTitles, maxChatgpt, maxClaude, from, to, vertical = false,
}: CalendarHeatmapProps) {
  const { theme, resolvedTheme } = useTheme();
  const isDark = (theme === "system" ? resolvedTheme : theme) === "dark";

  const containerRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ day: string; cx: number; cy: number } | null>(null);

  const emptyFill = isDark ? "#2a2a2a" : "#eee";
  const textFill  = isDark ? "#888"    : "#666";

  const startYear = from.getFullYear();
  const endYear   = to.getFullYear();
  const numYears  = endYear - startYear + 1;

  // ── Layout constants ─────────────────────────────────────────────────────────
  // Horizontal: years stack top-to-bottom, weeks → columns, dow → rows
  const H = {
    dowW:   27,           // day-of-week label column
    monthH: 18,           // month label row
    yearH:  20,           // year label row
    yearGap: 22,
    pad: { t: 6, r: 8, b: 8, l: 8 },
  } as const;
  const H_SEC_H = H.yearH + H.monthH + 7 * STEP;

  // Vertical: years stack left-to-right, dow → columns, weeks → rows
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

  // ── Gradient defs (mixed days only) ─────────────────────────────────────────
  const gradDefs: React.ReactElement[] = [];
  Object.entries(data).forEach(([day, { chatgpt, claude }]) => {
    if (chatgpt <= 0 || claude <= 0 || maxChatgpt <= 0 || maxClaude <= 0) return;
    const pct = Math.round((chatgpt / (chatgpt + claude)) * 100);
    const s1  = Math.max(2,  pct - 12);
    const s2  = Math.min(98, pct + 12);
    gradDefs.push(
      <linearGradient key={day} id={`g${day}`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset={`${s1}%`} stopColor={shade(chatgpt, maxChatgpt, GPT_COLORS)} />
        <stop offset={`${s2}%`} stopColor={shade(claude,  maxClaude,  CLAUDE_COLORS)} />
      </linearGradient>
    );
  });

  // ── Cell renderer ────────────────────────────────────────────────────────────
  const handleEnter = useCallback((e: React.MouseEvent, day: string) => {
    if (!containerRef.current) return;
    const b = containerRef.current.getBoundingClientRect();
    setTip({ day, cx: e.clientX - b.left, cy: e.clientY - b.top });
  }, []);
  const handleLeave = useCallback(() => setTip(null), []);

  function makeCell(day: string, x: number, y: number): React.ReactElement {
    const { chatgpt = 0, claude = 0 } = data[day] ?? {};
    const hasData = chatgpt + claude > 0;
    let fill: string;
    if      (chatgpt > 0 && claude  > 0 && maxChatgpt > 0 && maxClaude > 0) fill = `url(#g${day})`;
    else if (chatgpt > 0 && maxChatgpt > 0) fill = shade(chatgpt, maxChatgpt, GPT_COLORS);
    else if (claude  > 0 && maxClaude  > 0) fill = shade(claude,  maxClaude,  CLAUDE_COLORS);
    else fill = emptyFill;
    return (
      <rect
        key={day} x={x} y={y} width={CELL} height={CELL} rx={2} fill={fill}
        onMouseEnter={hasData ? e => handleEnter(e, day) : undefined}
        onMouseLeave={hasData ? handleLeave : undefined}
      />
    );
  }

  // ── SVG elements ─────────────────────────────────────────────────────────────
  const els: React.ReactElement[] = [];

  for (let yi = 0; yi < numYears; yi++) {
    const year   = startYear + yi;
    const jan1   = new Date(year, 0, 1);
    const jan1wd = jan1.getDay();

    if (!vertical) {
      // ─ Horizontal ─
      const yOff  = H.pad.t + yi * (H_SEC_H + H.yearGap);
      const gridY = yOff + H.yearH + H.monthH;

      // Year label
      els.push(
        <text key={`yr${year}`}
          x={H.pad.l + H.dowW} y={yOff + H.yearH - 4}
          fill={textFill} fontSize={12} fontWeight="600" fontFamily="sans-serif"
        >{year}</text>
      );

      // Day-of-week labels (Mon / Wed / Fri)
      ([[1, "Mon"], [3, "Wed"], [5, "Fri"]] as [number, string][]).forEach(([row, lbl]) =>
        els.push(
          <text key={`dh${year}${row}`}
            x={H.pad.l + 2} y={gridY + row * STEP + CELL - 2}
            fill={textFill} fontSize={9} fontFamily="sans-serif"
          >{lbl}</text>
        )
      );

      // Month labels
      for (let m = 0; m < 12; m++) {
        const col = Math.floor((doy(new Date(year, m, 1)) + jan1wd) / 7);
        els.push(
          <text key={`mh${year}${m}`}
            x={H.pad.l + H.dowW + col * STEP}
            y={yOff + H.yearH + H.monthH - 4}
            fill={textFill} fontSize={10} fontFamily="sans-serif"
          >{MONTHS[m]}</text>
        );
      }

      // Cells
      const cur = new Date(year, 0, 1);
      while (cur.getFullYear() === year) {
        const day = cur.toLocaleDateString("sv-SE");
        const col = Math.floor((doy(cur) + jan1wd) / 7);
        const row = cur.getDay();
        els.push(makeCell(day, H.pad.l + H.dowW + col * STEP, gridY + row * STEP));
        cur.setDate(cur.getDate() + 1);
      }

    } else {
      // ─ Vertical ─
      const xOff  = V.pad.l + yi * (V_SEC_W + V.yearGap);
      const gridX = xOff + V.monthW;
      const gridY = V.pad.t + V.yearH + V.dowH;

      // Year label
      els.push(
        <text key={`yr${year}`}
          x={gridX} y={V.pad.t + V.yearH - 4}
          fill={textFill} fontSize={11} fontWeight="600" fontFamily="sans-serif"
        >{year}</text>
      );

      // Day-of-week labels (S M T W T F S)
      "SMTWTFS".split("").forEach((lbl, col) =>
        els.push(
          <text key={`dv${year}${col}`}
            x={gridX + col * STEP + CELL / 2}
            y={V.pad.t + V.yearH + V.dowH - 3}
            fill={textFill} fontSize={8} fontFamily="sans-serif" textAnchor="middle"
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
            const weekIdx = Math.floor((doy(cur) + jan1wd) / 7);
            els.push(
              <text key={`mv${year}${m}`}
                x={xOff + V.monthW - 3}
                y={gridY + weekIdx * STEP + CELL - 2}
                fill={textFill} fontSize={8} fontFamily="sans-serif" textAnchor="end"
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
        const weekIdx = Math.floor((doy(cur) + jan1wd) / 7);
        const col     = cur.getDay();
        els.push(makeCell(day, gridX + col * STEP, gridY + weekIdx * STEP));
        cur.setDate(cur.getDate() + 1);
      }
    }
  }

  // ── Tooltip ──────────────────────────────────────────────────────────────────
  const tipData  = tip ? (data[tip.day] ?? { chatgpt: 0, claude: 0 }) : null;
  const tipTotal = tipData ? tipData.chatgpt + tipData.claude : 0;
  const TIP_W    = 260;

  let tipLeft = 0;
  if (tip && containerRef.current) {
    const cw = containerRef.current.offsetWidth;
    tipLeft = tip.cx + 14 + TIP_W > cw ? tip.cx - TIP_W - 6 : tip.cx + 14;
  }

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        width="100%"
        height="100%"
        preserveAspectRatio={vertical ? "xMinYMin meet" : "xMinYMid meet"}
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
  );
}
