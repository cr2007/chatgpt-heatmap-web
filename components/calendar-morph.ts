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
 *   Step 2.1: From "All years" to one year, the years that leave stay where
 *             they were, as one group, and fade out (`fadeLeaving`).
 *   Step 2.2: The drawing does not clip while the morph runs: the new view
 *             can be shorter than the old one, and the year that stays
 *             moves up from below its new edge.
 * Reduced motion: no snapshot, so the change is instant.
 */

/** How a cell or a label looked: its centre and width in screen px, and its fill. */
interface Look {
  x: number;
  y: number;
  w: number;
  fill: string;
}
/** Where a drawing is: its top left in screen px, and SVG units per screen px. */
interface Box {
  x: number;
  y: number;
  unit: number;
}
interface Snapshot {
  /** Several years only: the old cells and labels as one group, for the years that leave. */
  layer: SVGGElement | null;
  /** Where the old drawing was on screen. */
  box: Box;
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

/** Where `svg` is drawn. A CSS transform on an SVG element is in SVG units. */
function boxOf(svg: SVGSVGElement): Box {
  const b = svg.getBoundingClientRect();
  return { x: b.x, y: b.y, unit: svg.viewBox.baseVal.width / b.width };
}

/** A duration token in ms: the built CSS may write "520ms" as ".52s". */
function ms(root: CSSStyleDeclaration, name: string, fallback: number) {
  const v = root.getPropertyValue(name).trim();
  return (parseFloat(v) || fallback / 1000) * (v.endsWith("ms") ? 1 : 1000);
}

/** A label key with its year taken out: "m20243" is month 3 of any year. */
const anyYear = (key: string) => key.replace(/\d{4}/, "");

/** Step 1: records the calendar `svg` before a view change. */
export function prepareMorph(svg: SVGSVGElement | null) {
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
  // Only "All years" has years that can leave; a clone is cheap, a ghost per cell is not.
  let layer: SVGGElement | null = null;
  if (years.size > 1) {
    layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    for (const el of svg.querySelectorAll<SVGElement>(
      "rect[data-day], text[data-key]",
    )) {
      const c = el.cloneNode(el.tagName === "text") as SVGElement;
      // The clone keeps its shade when the gradients of its year are gone.
      if (el.dataset.day) c.style.fill = cells.get(el.dataset.day)!.fill;
      layer.append(c);
    }
  }
  pending = {
    cells,
    labels,
    oneYear: years.size === 1,
    layer,
    box: boxOf(svg),
  };
}

/** Step 2: plays the motion from the recorded look to the calendar `svg` now. */
export function playMorph(svg: SVGSVGElement) {
  const was = pending;
  pending = null;
  if (!was) return;
  for (const a of svg.getAnimations({ subtree: true }))
    if (a.id === ID) a.cancel();
  svg.querySelector("[data-ghost]")?.remove();

  const root = getComputedStyle(document.documentElement);
  const easing = root.getPropertyValue("--ease-spring").trim() || "ease-out";
  const duration = ms(root, "--dur-spring", 520);
  const box = boxOf(svg);
  const { unit } = box;
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

  // Step 2.1
  if (was.layer && oneYear) fadeLeaving(svg, was.layer, was.box, box, root);

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

  // Step 2.2: a newer morph cancels these animations and sets it again.
  const all = svg.getAnimations({ subtree: true }).filter((a) => a.id === ID);
  svg.style.overflow = "visible";
  Promise.all(all.map((a) => a.finished)).then(
    () => (svg.style.overflow = ""),
    () => {},
  );
}

/**
 * Step 2.1: shows the cells and labels of `layer` (the old "All years"
 * drawing at `was`) that the new view of `svg` (at `now`) does not have,
 * where they were, and fades them out as one group.
 */
function fadeLeaving(
  svg: SVGSVGElement,
  layer: SVGGElement,
  was: Box,
  now: Box,
  root: CSSStyleDeclaration,
) {
  for (const el of [...layer.children] as SVGElement[]) {
    const { day, key } = el.dataset;
    const stays = day
      ? svg.querySelector(`rect[data-day="${day}"]`)
      : svg.querySelector(`text[data-key="${key}"]`);
    if (stays) el.remove();
    else
      for (const a of ["data-day", "data-key", "tabindex"])
        el.removeAttribute(a);
  }
  layer.setAttribute("data-ghost", "");
  layer.setAttribute("aria-hidden", "true");
  // The old SVG units in the new ones: the same place on screen.
  layer.setAttribute(
    "transform",
    `translate(${(was.x - now.x) * now.unit} ${(was.y - now.y) * now.unit}) scale(${now.unit / was.unit})`,
  );
  svg.prepend(layer);
  const a = layer.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: ms(root, "--dur-ui", 200),
    easing: root.getPropertyValue("--ease-out").trim() || "ease-out",
    fill: "forwards",
  });
  a.id = ID;
  a.finished.then(() => layer.remove()).catch(() => {});
}
