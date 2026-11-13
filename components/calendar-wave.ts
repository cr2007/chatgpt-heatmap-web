/**
 * The year change between two single years: a wave of columns (Hit). Each
 * week column dips, rises and slows into an invisible ceiling, squashes
 * softly against it as its cells take their new shades, falls back, lands
 * and hops a little. Columns start one after another, so a wave runs left
 * to right to a later year and right to left to an earlier one. The jump is
 * short against the time between columns, so the column at the front
 * stands above its neighbours, like one pressed piano key. The narrow
 * calendar (phones) is a grid of months, 3 across: its wave runs over
 * their 21 weekday columns.
 * Changes to or from "All years" use the morph (`calendar-morph.ts`).
 *
 * The timings come from a lab study of real hits (a split-flap board, piano
 * hammers, a filmed and a hand-drawn bouncing ball) and the owner's feel
 * checks, so they are constants here, not `--dur-*` tokens.
 *
 * Use: {@link snapshotWave} just before the view changes, then
 * {@link playWave} after the new view is drawn.
 */

/** A cell's look: what the wave swaps. A split day's fill is a url(#gradient). */
interface Look {
  fill: string;
  stroke: string;
  strokeWidth: string;
}

/** The calendar before a view change, as {@link snapshotWave} records it for {@link playWave}. */
export interface WaveSnapshot {
  /** Each cell's old look, by its place in the grid ("x,y" in SVG units). */
  looks: Map<string, Look>;
  /** Where a cell stood if a running wave had moved it (its transform), by place. */
  poses: Map<string, string>;
  /** A ghost copy of each old cell, by place, for the cells that leave the grid. */
  cells: Map<string, SVGRectElement>;
  /** Copies of the old split days' gradients, with new ids. */
  gradients: SVGElement[];
  /** Top left (SVG units) of each month and weekday label, by its key with the year taken out. */
  labels: Map<string, { x: number; y: number }>;
}

/** One key of a column's jump, which {@link shape} turns into a cell transform. */
export interface Pose {
  /** Share of the jump: 1 touches the ceiling, 0 is the floor, negative is a dip. */
  lift: number;
  /** Scale of each cell along the jump (1 is drawn size). */
  v: number;
  /**
   * Scale of each cell across the jump (1 is drawn size).
   *
   * @defaultValue 1
   */
  h?: number;
}

/** Animation id, so a new change can tell the wave's animations apart. */
const ID = "year-wave";
/** The jump (SVG units): about 12 px at the calendar's usual scale. */
const JUMP = 9;
/** A column squashes or stretches as a whole too, by this share of its
 *  cells' change, so the cells pack up under the ceiling. */
const COLUMN = 0.3;
/** The column length that squashes: 7 cells, also in the narrow calendar,
 *  whose column runs down 4 months. */
const BODY = 7 * 13;
/** Slow at both ends. */
const EASE_IN_OUT = "cubic-bezier(0.45, 0, 0.55, 1)";
/** The rise leaves fast and slows into the top, so the eye can follow the hit. */
const RISE = "cubic-bezier(0.22, 1, 0.36, 1)";
/**
 * A squash, a landing and a label stop softly (the value of --ease-out).
 *
 * @see app/globals.css for --ease-out.
 */
const SOFT = "cubic-bezier(0.23, 1, 0.32, 1)";
/** One column's jump (ms) and its keys: the time, the pose, the curve to the next key. */
const HIT: [ms: number, pose: Pose, easing?: string][] = [
  [0, { lift: 0, v: 1 }, EASE_IN_OUT],
  [30, { lift: -0.05, v: 0.97, h: 1.015 }, RISE], // dip (anticipation)
  [130, { lift: 1, v: 1.02 }, SOFT], // top: touches the ceiling
  [155, { lift: 1, v: 0.96, h: 1.02 }, EASE_IN_OUT], // soft squash
  [240, { lift: 0, v: 0.98, h: 1.01 }, SOFT], // land
  [270, { lift: 0.06, v: 1 }, EASE_IN_OUT], // hop
  [300, { lift: 0, v: 1 }],
];
const DURATION = 300;
/** The new look blends over this long (ms, ease-out), from the top key (130 ms). */
const BLEND = 100;
/** Where the new look is half way in, as a share of {@link DURATION}. */
const SWAP = (130 + BLEND / 2) / DURATION;
/** Columns start over this long (ms) in travel order, so 53 columns and 7 take as long: 900 ms in all. */
const SPREAD = 600;
/** A cell that a new change catches in the air settles back over this long (ms). */
const SETTLE = 150;

/** The running wave: its animations and the nodes it added (ghosts, old gradients). */
let running: { anims: Animation[]; nodes: Element[] } | null = null;

/** Stops the running wave, if any: cancels its animations and removes its nodes. */
export function stopWave() {
  running?.anims.forEach((a) => a.cancel());
  running?.nodes.forEach((n) => n.remove());
  running = null;
}

const place = (r: Element) => `${r.getAttribute("x")},${r.getAttribute("y")}`;
const lookOf = (r: Element): Look => {
  const s = getComputedStyle(r);
  return { fill: s.fill, stroke: s.stroke, strokeWidth: s.strokeWidth };
};

/**
 * Records the calendar before a change between two single years.
 *
 * @param svg - The calendar's SVG element.
 * @returns The old look of each cell and label, for {@link playWave}.
 * @see {@link playWave}, which plays from this snapshot.
 */
export function snapshotWave(svg: SVGSVGElement): WaveSnapshot {
  // Step 1: Record by each cell's place in the grid (x, y in SVG units): its look,
  // its pose if a running wave moved it, its gradient copy, and a ghost of it.
  const looks = new Map<string, Look>();
  const poses = new Map<string, string>();
  const cells = new Map<string, SVGRectElement>();
  const gradients: SVGElement[] = [];
  for (const r of svg.querySelectorAll<SVGRectElement>("rect[data-day]")) {
    const look = lookOf(r);
    // A split day: keep its gradient under a new id, as the new view removes the old one.
    const id = /url\("?#([^")]+)"?\)/.exec(look.fill)?.[1];
    const g = id && svg.getElementById(id);
    if (g) {
      const copy = g.cloneNode(true) as SVGElement;
      copy.id = `${id}-was`;
      gradients.push(copy);
      look.fill = `url("#${copy.id}")`;
    }
    looks.set(place(r), look);
    const pose = getComputedStyle(r).transform;
    if (pose !== "none") poses.set(place(r), pose);
    const ghost = r.cloneNode() as SVGRectElement;
    ghost.removeAttribute("fill");
    ghost.style.fill = look.fill;
    cells.set(place(r), ghost);
  }
  const labels = new Map<string, { x: number; y: number }>();
  // Month and weekday labels match across years; the year title does not.
  for (const t of svg.querySelectorAll<SVGTextElement>(
    "text[data-key]:not([data-key^=y])",
  )) {
    const b = t.getBBox();
    labels.set(t.dataset.key!.replace(/\d{4}/, ""), { x: b.x, y: b.y });
  }
  return { looks, poses, cells, gradients, labels };
}

/**
 * Gives a cell's CSS transform in a {@link Pose}, for a wave keyframe.
 *
 * @remarks
 * The column keeps to the surface it is near (the ceiling above half the
 * jump, else the floor): a squash packs the cells toward it.
 *
 * @param along - Distance of the cell's centre below the column top, in SVG units.
 * @param span - Length of the column, in SVG units.
 * @param p - The pose.
 * @returns A `translate` and `scale` transform, in SVG units.
 */
export function shape(along: number, span: number, p: Pose) {
  const len = Math.min(span, BODY) * COLUMN * (1 - p.v);
  const share = along / span;
  const up = p.lift * JUMP + (p.lift > 0.5 ? len * share : -len * (1 - share));
  return `translate(0px, ${-up}px) scale(${p.h ?? 1}, ${p.v})`;
}

/**
 * Gives the start delay of one column of the wave, in travel order.
 *
 * @remarks
 * The starts spread over {@link SPREAD} whatever the number of columns, so
 * 53 week columns and the 21 weekday columns of the narrow calendar take
 * as long.
 *
 * @param column - The column index, 0 at the left.
 * @param columns - The number of columns.
 * @param dir - 1 to a later year (left to right), -1 to an earlier one.
 * @returns The delay in ms, 0 to {@link SPREAD}.
 * @see {@link playWave}, which uses it.
 */
export function startDelay(column: number, columns: number, dir: number) {
  const nth = dir > 0 ? column : columns - 1 - column;
  return (nth * SPREAD) / Math.max(1, columns - 1);
}

/** Keyframes for a look that is `from` until the swap ({@link SWAP}), then blends to `to` (ease-out). */
function swapKeys(from: Keyframe, to: Keyframe): Keyframe[] {
  const half = BLEND / 2 / DURATION;
  return [
    { offset: 0, ...from },
    { offset: SWAP - half, ...from, easing: SOFT },
    { offset: SWAP + half, ...to },
    { offset: 1, ...to },
  ];
}

/**
 * Plays the wave from the old view to the view drawn now, after a change
 * between two single years.
 *
 * @param svg - The calendar's SVG element, with the new view drawn.
 * @param was - The snapshot from {@link snapshotWave}.
 * @param dir - 1 to a later year, -1 to an earlier one.
 * @see {@link snapshotWave}, which records the old view.
 * @see {@link startDelay}, which times each column.
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API
 */
export function playWave(svg: SVGSVGElement, was: WaveSnapshot, dir: number) {
  // Step 2.1: Stop the running wave from its own list: its cells are gone (keyed
  // by date), and at their end its animations would remove this wave's nodes.
  stopWave();
  // Step 2.2: Find each cell's column (its x) and its place along it (its y).
  const cells = [...svg.querySelectorAll<SVGRectElement>("rect[data-day]")];
  if (!cells.length) return;
  // The columns of both views: a column that only the old view has (2023's
  // third block of months on the way to 2022's two) keeps its turn in the
  // wave, or all its cells would go at once.
  const xs = [
    ...new Set(
      [...cells, ...was.cells.values()].map((r) => Number(r.getAttribute("x"))),
    ),
  ].sort((a, b) => a - b);
  const ys = cells.map((r) => Number(r.getAttribute("y")));
  const [top, n] = [Math.min(...ys), xs.length];
  const size = Number(cells[0].getAttribute("width"));
  const span = Math.max(...ys) - top + size;
  const column = (r: Element) => xs.indexOf(Number(r.getAttribute("x")));
  const delayOf = (c: number) => startDelay(c, n, dir);
  // The old gradients, for split days, until the wave is over.
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.setAttribute("data-ghost", "");
  defs.append(...was.gradients.map((g) => g.cloneNode(true)));
  svg.prepend(defs);
  const mine = { anims: [] as Animation[], nodes: [defs as Element] };
  running = mine;

  const run = (
    el: Element,
    keys: Keyframe[],
    delay: number,
    fill: FillMode = "backwards",
    timing: KeyframeAnimationOptions = {},
  ) => {
    const a = el.animate(keys, { duration: DURATION, delay, fill, ...timing });
    a.id = ID;
    mine.anims.push(a);
    return a;
  };
  // Before its start a cell rests where it is drawn (no fill); only its look needs the old value.
  const jump = (r: Element, delay: number) => {
    const along = Number(r.getAttribute("y")) - top + size / 2;
    run(
      r,
      HIT.map(([ms, pose, easing]) => ({
        offset: ms / DURATION,
        transform: shape(along, span, pose),
        ...(easing && { easing }),
      })),
      delay,
      "none",
    );
  };

  // Step 2.3: Per cell: the jump, and its look: the old one until the swap, then
  // a short blend to the new one.
  const kept = new Set<string>();
  for (const r of cells) {
    const key = place(r);
    const delay = delayOf(column(r));
    const old = was.looks.get(key);
    kept.add(key);
    jump(r, delay);
    // Step 2.3.1: A cell that a new change caught in the air first settles from where it stood.
    const pose = was.poses.get(key);
    if (pose)
      run(r, [{ transform: pose }, { transform: "none" }], 0, "none", {
        duration: SETTLE,
        easing: SOFT,
        composite: "add",
      });
    if (!old) {
      // Step 2.4: Cells new to the grid come in at their swap.
      run(r, swapKeys({ opacity: 0 }, { opacity: 1 }), delay);
      continue;
    }
    const now = lookOf(r);
    if (
      old.fill === now.fill &&
      old.stroke === now.stroke &&
      old.strokeWidth === now.strokeWidth
    )
      continue;
    // A gradient does not blend with a colour: it changes in the middle of the blend.
    run(r, swapKeys({ ...old }, { ...now }), delay);
  }

  // Step 2.5: Cells that left the grid are drawn again as ghosts and go at
  // their swap.
  const layer = cells[0].parentNode!;
  for (const [key, ghost] of was.cells) {
    if (kept.has(key)) continue;
    ghost.setAttribute("data-ghost", "");
    ghost.removeAttribute("tabindex");
    ghost.removeAttribute("data-day");
    ghost.removeAttribute("id");
    ghost.setAttribute("aria-hidden", "true");
    layer.append(ghost);
    mine.nodes.push(ghost);
    const delay = delayOf(column(ghost));
    run(ghost, swapKeys({ opacity: 1 }, { opacity: 0 }), delay, "both");
    jump(ghost, delay);
  }

  // Step 2.6: Labels move to their new place after their column's swap; the
  // year title changes at once.
  for (const t of svg.querySelectorAll<SVGTextElement>("text[data-key]")) {
    const from = was.labels.get(t.dataset.key!.replace(/\d{4}/, ""));
    const b = t.getBBox();
    // The year title (no match) is information: it shows at once.
    if (!from || Math.abs(from.x - b.x) + Math.abs(from.y - b.y) < 0.5)
      continue;
    const delay = delayOf(
      Math.max(
        0,
        xs.findIndex((v) => v >= b.x - 1),
      ),
    );
    const at = `translate(${from.x - b.x}px, ${from.y - b.y}px)`;
    run(
      t,
      [
        { offset: 0, transform: at },
        { offset: SWAP, transform: at, easing: SOFT },
        { offset: 1, transform: "none" },
      ],
      delay,
    );
  }

  // Its nodes go when the wave is over, if no newer change has stopped it first.
  Promise.all(mine.anims.map((a) => a.finished)).then(
    () => running === mine && stopWave(),
    () => {},
  );
}
