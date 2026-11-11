/** Matches a mouse-driven, landscape window big enough for the horizontal
 *  calendar and for "All years" as the first view. The height limit keeps
 *  a short window (or 200% zoom, where a 1440x900 screen is 720x450) on the
 *  phone flow, where the calendar shows one year at full size. */
export const DESKTOP_QUERY =
  "(orientation: landscape) and (min-width: 640px) and (min-height: 560px) and (pointer: fine)";

/** Matches an expanded window (Android window size classes: 840 dp and
 *  wider), such as an open foldable or a tablet in landscape: a year fits
 *  across, so the calendar runs horizontally, with or without a mouse. */
export const EXPANDED_QUERY = "(min-width: 840px)";

/** Matches a window wide enough for the full top bar once an export is
 *  loaded: the export chips with their counts, Add export and the time zone
 *  in one row (1,146 px measured, about 1,180 px with five-digit counts).
 *  Below it, the bar keeps the name and the links, and a panel under it
 *  holds the rest. */
export const WIDE_BAR_QUERY = "(min-width: 76rem)";

/** Matches a half-open foldable: "folded" means half open and spanning the
 *  fold (W3C Device Posture). A closed device on its cover screen, or a
 *  window on one half, is "continuous". */
export const FOLDED_QUERY = "(device-posture: folded)";

/** How a half-open foldable is held: book (the halves side by side) or
 *  tent (the halves on top of each other). */
export type Posture = "book" | "tent";

/** One viewport segment: where a screen half sits in the window. */
interface Segment {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The posture to lay out for, or undefined for one screen.
 *
 * Step 1: The Viewport Segments API (Chrome 138 and later) knows where the
 *         halves are: two segments side by side are "book", two stacked are
 *         "tent". Orientation cannot tell: a Surface Duo shows its two
 *         screens side by side in a landscape window. A seamless fold that
 *         lies flat (no gap, posture not folded) stays one screen.
 * Step 2: Without that API, a folded posture falls back to the orientation:
 *         portrait is book, landscape is tent.
 */
export function foldPosture(
  segments: readonly Segment[] | undefined,
  folded: boolean,
  portrait: boolean,
): Posture | undefined {
  // Step 1
  if (segments) {
    if (segments.length !== 2) return undefined;
    const [a, b] = segments;
    const stacked = a.x === b.x;
    const gap = stacked ? b.y - (a.y + a.height) : b.x - (a.x + a.width);
    if (gap <= 0 && !folded) return undefined;
    return stacked ? "tent" : "book";
  }
  // Step 2
  if (!folded) return undefined;
  return portrait ? "book" : "tent";
}

export interface HeatmapOrientationInput {
  /** The foldable posture, if any (see `foldPosture`). */
  posture: Posture | undefined;
  /** `DESKTOP_QUERY` or `EXPANDED_QUERY` matches. */
  isWide: boolean;
}

/**
 * Decides whether the calendar heatmap should render in its narrow
 * vertical layout (months down the side, ~120px per year) or its wide
 * horizontal GitHub-style layout (54 weeks across).
 *
 * Step 1: A foldable posture fixes it: a tent half is wide and short
 *         (horizontal), a book half is narrow (vertical).
 * Step 2: Otherwise the horizontal layout needs a desktop or an expanded
 *         window; every narrower context gets the vertical one.
 */
export function getHeatmapOrientation({
  posture,
  isWide,
}: HeatmapOrientationInput): "vertical" | "horizontal" {
  if (posture) return posture === "tent" ? "horizontal" : "vertical"; // Step 1
  return isWide ? "horizontal" : "vertical"; // Step 2
}

/** What the calendar shows: every year, or one year. */
export type YearView = "all" | number;

/**
 * The calendar view from the year tabs, the address and the layout.
 *
 * Step 1: A picked year that the data has wins; "all" wins when there is
 *         more than one year (one year shows as that year).
 * Step 2: With nothing valid picked, a desktop window shows every year;
 *         phones and foldables show the latest year, which reads better
 *         than narrow year columns side by side.
 */
export function pickYearView(
  picked: YearView | null,
  years: readonly number[],
  isDesktop: boolean,
): YearView {
  const latest = years[years.length - 1];
  if (latest === undefined) return "all";
  // Step 1
  if (picked === "all") return years.length > 1 ? "all" : latest;
  if (picked !== null && years.includes(picked)) return picked;
  // Step 2
  return isDesktop && years.length > 1 ? "all" : latest;
}
