/**
 * The year change as one motion. Every day cell moves from where its date
 * was drawn to where it is drawn now, and its shade turns into the new one,
 * in a wave in date order; the month labels move with their weeks. So 2023
 * becomes 2024 in place, with no blank frame and no jump.
 *
 * Step 1: `prepareMorph`, just before the view changes: record each cell and
 *         label as it looks now (a running morph included, so a fast second
 *         click goes on from where the cells are).
 * Step 2: `playMorph`, after the new view is drawn: stop a running morph,
 *         then give each cell a FLIP animation (transform and fill only)
 *         from its recorded look. A cell matches by date, or between two
 *         single years by month and day; a cell with no match (29 Feb,
 *         the other years of "All years") grows in.
 * Reduced motion: no snapshot, so the change is instant.
 */

/** How a cell or a label looked: its centre and width in screen px, and its fill. */
interface Look {
  x: number;
  y: number;
  w: number;
  fill: string;
}
interface Snapshot {
  cells: Map<string, Look>;
  labels: Map<string, Look>;
  /** The snapshot showed one year (so a month and day names one cell). */
  oneYear: boolean;
}

/** The start of the wave is spread over this many ms in date order. */
const SPREAD = 180;
/** More new cells than this (the other years of "All years") appear at
 *  once: one animation per cell would cost more than the moving year
 *  gains (measured: 133 to 250 ms for the first frame at 1x CPU). */
const MAX_ENTER = 400;
/** Animation id, so a new morph stops only this kind of animation. */
const ID = "year-morph";

let pending: Snapshot | null = null;

/** The centre and width of an element on screen. */
function look(el: Element, fill = ""): Look {
  const b = el.getBoundingClientRect();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: b.width, fill };
}

/** A label key with its year taken out: "m20243" is month 3 of any year. */
const anyYear = (key: string) => key.replace(/\d{4}/, "");

/** Step 1: records the calendar `svg` before a view change. */
export function prepareMorph(svg: Element | null) {
  pending = null;
  if (!svg || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cells = new Map<string, Look>();
  const years = new Set<string>();
  for (const r of svg.querySelectorAll<SVGRectElement>("rect[data-day]")) {
    cells.set(r.dataset.day!, look(r, getComputedStyle(r).fill));
    years.add(r.dataset.day!.slice(0, 4));
  }
  const labels = new Map<string, Look>();
  for (const t of svg.querySelectorAll<SVGTextElement>("text[data-key]"))
    labels.set(t.dataset.key!, look(t));
  pending = { cells, labels, oneYear: years.size === 1 };
}

/** Step 2: plays the motion from the recorded look to the calendar `svg` now. */
export function playMorph(svg: SVGSVGElement) {
  const was = pending;
  pending = null;
  if (!was) return;
  for (const a of svg.getAnimations({ subtree: true }))
    if (a.id === ID) a.cancel();

  const root = getComputedStyle(document.documentElement);
  const easing = root.getPropertyValue("--ease-spring").trim() || "ease-out";
  // The built CSS may write "520ms" as ".52s".
  const dur = root.getPropertyValue("--dur-spring").trim();
  const duration = (parseFloat(dur) || 0.52) * (dur.endsWith("ms") ? 1 : 1000);
  // SVG units per screen px: a CSS transform on an SVG element is in SVG units.
  const unit = svg.viewBox.baseVal.width / svg.getBoundingClientRect().width;
  const cells = [...svg.querySelectorAll<SVGRectElement>("rect[data-day]")];
  const oneYear =
    new Set(cells.map((r) => r.dataset.day!.slice(0, 4))).size === 1;
  // Between two single years, a month and day names one cell.
  const byDate = new Map<string, Look>();
  let entering = 0;
  if (was.oneYear && oneYear)
    for (const [day, l] of was.cells) byDate.set(day.slice(5), l);

  // One keyframe at offset 0 is the start; the end is the element as drawn
  // now. (A lone keyframe without an offset would be the end.)
  const run = (el: Element, from: Keyframe, delay: number) =>
    (el.animate([{ offset: 0, ...from }], {
      duration,
      delay,
      easing,
      fill: "backwards",
    }).id = ID);

  for (const r of cells) {
    const day = r.dataset.day!;
    const delay = Number(r.style.getPropertyValue("--t") || 0) * SPREAD;
    const from = was.cells.get(day) ?? byDate.get(day.slice(5));
    if (!from) {
      entering++;
      continue;
    }
    const now = look(r);
    const move = `translate(${(from.x - now.x) * unit}px, ${(from.y - now.y) * unit}px) scale(${from.w / now.w})`;
    // A split day's fill is a gradient, which cannot blend: it only moves.
    const fill =
      r.getAttribute("fill") || from.fill.startsWith("url")
        ? {}
        : { fill: from.fill };
    run(r, { transform: move, ...fill }, delay);
  }

  if (entering && entering <= MAX_ENTER)
    for (const r of cells) {
      const day = r.dataset.day!;
      if (was.cells.has(day) || byDate.has(day.slice(5))) continue;
      const delay = Number(r.style.getPropertyValue("--t") || 0) * SPREAD;
      run(r, { transform: "scale(0.6)", opacity: 0 }, delay);
    }

  // Labels: the same key, or between two single years the same month or
  // weekday; a label with no match (a new year) rolls in.
  const kinds = new Map<string, Look>();
  if (was.oneYear && oneYear)
    for (const [k, l] of was.labels)
      if (!k.startsWith("y")) kinds.set(anyYear(k), l);
  for (const t of svg.querySelectorAll<SVGTextElement>("text[data-key]")) {
    const key = t.dataset.key!;
    const from = was.labels.get(key) ?? kinds.get(anyYear(key));
    const now = look(t);
    if (!from) run(t, { transform: "translateY(4px)", opacity: 0 }, 0);
    else if (Math.abs(from.x - now.x) + Math.abs(from.y - now.y) >= 0.5)
      run(
        t,
        {
          transform: `translate(${(from.x - now.x) * unit}px, ${(from.y - now.y) * unit}px)`,
        },
        0,
      );
  }
}
