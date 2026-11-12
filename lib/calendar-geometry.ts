/** Cell edge length in SVG units, before the panel-fit scale. */
export const CELL = 11;
/** Distance from one cell to the next: the edge plus a 2-unit gap. */
const STEP = CELL + 2;
/** Milliseconds in a UTC day. */
const DAY_MS = 864e5;
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

/** Horizontal: years stack top to bottom, weeks are columns, weekdays rows. */
const H = {
  dowW: 27,
  monthH: 18,
  yearH: 20,
  yearGap: 22,
  pad: { t: 6, r: 8, b: 8, l: 8 },
} as const;
/** Vertical: years stack top to bottom in one column (a phone scrolls down
 *  through them), weekdays are columns, weeks rows. */
const V = {
  monthW: 28,
  dowH: 15,
  yearH: 16,
  yearGap: 18,
  pad: { t: 6, r: 6, b: 6, l: 6 },
} as const;

/** One day cell: its `YYYY-MM-DD` key, top-left corner, and place in the range (0 to 1). */
export interface CellBox {
  /** The day, as `YYYY-MM-DD`. */
  day: string;
  /** Left edge in SVG units. */
  x: number;
  /** Top edge in SVG units. */
  y: number;
  /** Place in the date range, 0 (first day) to 1 (last day). */
  t: number;
}

/** One SVG text label. */
export interface Label {
  /** Unique React key: `y`, `d` or `m` and the year and place. */
  key: string;
  /** Anchor x in SVG units. */
  x: number;
  /** Baseline y in SVG units. */
  y: number;
  /** The label text. */
  text: string;
  /** Font size in SVG units. */
  size: number;
  /** True for the year label. */
  bold?: boolean;
  /** SVG `text-anchor`; the start of the text when missing. */
  anchor?: "middle" | "end";
}

/** Everything one calendar draws, in SVG units. */
export interface CalendarLayout {
  /** SVG width in SVG units. */
  width: number;
  /** SVG height in SVG units. */
  height: number;
  /** One cell per day of the years, in date order. */
  cells: CellBox[];
  /** The year, weekday and month labels. */
  labels: Label[];
}

/** Upper counts of shade levels 1 to 3; a larger count is level 4. */
export type Edges = readonly [number, number, number];

/**
 * Finds the quartiles of the days with prompts (nearest rank).
 *
 * @remarks
 * Each shade level then holds about a quarter of the active days, so one
 * very busy day does not push every other day into the palest shade.
 *
 * @param counts - The prompt count of each day; days with 0 are left out.
 * @returns The upper counts of levels 1 to 3; all 0 when no day has a prompt.
 * @see {@link level}, which reads the edges.
 */
export function quartiles(counts: readonly number[]): Edges {
  const sorted = counts.filter((n) => n > 0).sort((a, b) => a - b);
  const at = (p: number) =>
    sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)] ?? 0;
  return [at(0.25), at(0.5), at(0.75)];
}

/**
 * Picks the shade level of a count.
 *
 * @param count - The prompts of one day.
 * @param edges - The upper counts of levels 1 to 3 (see {@link quartiles}).
 * @returns 0 for no prompts, else 1 (fewest) to 4.
 */
export function level(count: number, [a, b, c]: Edges): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  return count <= a ? 1 : count <= b ? 2 : count <= c ? 3 : 4;
}

/**
 * Places every day and label of the years `startYear` to `endYear` on the
 * SVG grid.
 *
 * @remarks
 * It walks UTC day numbers, so the result is the same in every time zone and
 * a daylight saving change cannot shift a column.
 *
 * @param startYear - The first year to draw.
 * @param endYear - The last year to draw, included.
 * @param vertical - True for weeks as rows (a phone), false for weeks as
 *   columns.
 * @returns The SVG size, the cells and the labels, in SVG units.
 * @see {@link fitScale}, which scales the result to its panel.
 */
export function layoutCalendar(
  startYear: number,
  endYear: number,
  vertical: boolean,
): CalendarLayout {
  // Step 1: Size the SVG for the orientation and the number of years.
  const years = endYear - startYear + 1;
  const hSection = H.yearH + H.monthH + 7 * STEP;
  const vSection = V.yearH + V.dowH + 54 * STEP;
  const width = vertical
    ? V.pad.l + V.monthW + 7 * STEP + V.pad.r
    : H.pad.l + H.dowW + 54 * STEP + H.pad.r;
  const height = vertical
    ? V.pad.t + years * vSection + (years - 1) * V.yearGap + V.pad.b
    : H.pad.t + years * hSection + (years - 1) * H.yearGap + H.pad.b;

  const rangeStart = Date.UTC(startYear, 0, 1);
  const rangeSpan = Date.UTC(endYear, 11, 31) - rangeStart || 1;
  const cells: CellBox[] = [];
  const labels: Label[] = [];

  // Step 2: Lay out each year.
  for (let year = startYear; year <= endYear; year++) {
    const yi = year - startYear;
    const jan1 = Date.UTC(year, 0, 1);
    const jan1Weekday = new Date(jan1).getUTCDay();
    const weekOf = (dayIndex: number) =>
      Math.floor((dayIndex + jan1Weekday) / 7);

    // Grid origin and the year label's place for this year's section.
    const hTop = H.pad.t + yi * (hSection + H.yearGap);
    const vTop = V.pad.t + yi * (vSection + V.yearGap);
    const gridX = vertical ? V.pad.l + V.monthW : H.pad.l + H.dowW;
    const gridY = vertical
      ? vTop + V.yearH + V.dowH
      : hTop + H.yearH + H.monthH;

    // Step 2.1: Add the year label and the weekday labels.
    labels.push(
      vertical
        ? {
            key: `y${year}`,
            x: gridX,
            y: vTop + V.yearH - 4,
            text: String(year),
            size: 11,
            bold: true,
          }
        : {
            key: `y${year}`,
            x: gridX,
            y: hTop + H.yearH - 4,
            text: String(year),
            size: 12,
            bold: true,
          },
    );
    if (vertical) {
      [..."SMTWTFS"].forEach((text, col) =>
        labels.push({
          key: `d${year}${col}`,
          x: gridX + col * STEP + CELL / 2,
          y: gridY - 3,
          text,
          size: 8,
          anchor: "middle",
        }),
      );
    } else {
      for (const [row, text] of [
        [1, "Mon"],
        [3, "Wed"],
        [5, "Fri"],
      ] as const)
        labels.push({
          key: `d${year}${row}`,
          x: H.pad.l + 2,
          y: gridY + row * STEP + CELL - 2,
          text,
          size: 9,
        });
    }

    // Step 2.2: Add each month label at the week of its first day.
    MONTHS.forEach((text, m) => {
      const week = weekOf((Date.UTC(year, m, 1) - jan1) / DAY_MS);
      labels.push(
        vertical
          ? {
              key: `m${year}${m}`,
              x: V.pad.l + V.monthW - 3,
              y: gridY + week * STEP + CELL - 2,
              text,
              size: 8,
              anchor: "end",
            }
          : {
              key: `m${year}${m}`,
              x: gridX + week * STEP,
              y: gridY - 4,
              text,
              size: 10,
            },
      );
    });

    // Step 2.3: Add each day cell; a week is a column (horizontal) or a row
    // (vertical).
    const days = (Date.UTC(year + 1, 0, 1) - jan1) / DAY_MS;
    for (let i = 0; i < days; i++) {
      const ms = jan1 + i * DAY_MS;
      const week = weekOf(i);
      const weekday = (jan1Weekday + i) % 7;
      cells.push({
        day: new Date(ms).toISOString().slice(0, 10),
        x: gridX + (vertical ? weekday : week) * STEP,
        y: gridY + (vertical ? week : weekday) * STEP,
        t: (ms - rangeStart) / rangeSpan,
      });
    }
  }

  return { width, height, cells, labels };
}

/**
 * Finds the scale that fits a calendar of `layout` size into its panel.
 *
 * @remarks
 * In the fold layouts the panel has a fixed height, so the
 * calendar fits both sides and may grow. Where the page scrolls, the panel
 * height comes from the calendar itself; using it would let a short narrow
 * moment (a phone rotation, a window resize) shrink the calendar for good.
 * There it fits the width only, up to its natural size.
 *
 * @param panel - The panel size, in CSS px.
 * @param layout - The calendar size, in SVG units.
 * @param fixedHeight - True when the panel has a fixed height (the fold
 *   layouts).
 * @param maxScale - Largest scale where the page scrolls; above 1 lets one
 *   narrow year grow.
 * @returns CSS px per SVG unit; 1 before the panel has a width.
 * @defaultValue `maxScale` is 1 (the natural size).
 */
export function fitScale(
  panel: { width: number; height: number },
  layout: { width: number; height: number },
  fixedHeight: boolean,
  maxScale = 1,
): number {
  if (!panel.width) return 1;
  const byHeight = fixedHeight
    ? panel.height
      ? panel.height / layout.height
      : Infinity
    : maxScale;
  return Math.min(panel.width / layout.width, byHeight);
}
