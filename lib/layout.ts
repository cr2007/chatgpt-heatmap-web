/** Matches a mouse-driven, landscape browser window big enough for the
 *  side-by-side desktop grid (panel-form as a fixed sidebar, panel-heatmap
 *  filling the rest). Below this, layout falls back to a single scrolling
 *  column. The height limit keeps a short window (or 200% zoom, where a
 *  1440x900 screen is 720x450) from shrinking the calendar to fit; the
 *  scrolling column shows it at full size. app/globals.css repeats it. */
export const DESKTOP_SPLIT_QUERY =
  "(orientation: landscape) and (min-width: 640px) and (min-height: 560px) and (pointer: fine)";

/** Matches a window wide enough for the full top bar once an export is
 *  loaded: the export chips, Add export and the time zone in one row.
 *  Below it, the bar keeps the name and the links, and a panel under it
 *  holds the rest. */
export const WIDE_BAR_QUERY = "(min-width: 64rem)";

/** Matches a folded device held upright (book mode): fold runs vertically,
 *  panels sit side by side as two grid columns. */
export const FOLDED_PORTRAIT_QUERY =
  "(device-posture: folded) and (orientation: portrait)";

/** Matches a folded device propped up like a laptop (tent mode): fold runs
 *  horizontally, heatmap on top, form on the bottom bar. */
export const FOLDED_LANDSCAPE_QUERY =
  "(device-posture: folded) and (orientation: landscape)";

export interface HeatmapOrientationInput {
  /** Landscape-folded device (tent mode) - always renders horizontally. */
  isTentMode: boolean;
  /** Portrait-folded device (book mode) - always renders vertically. */
  isBookMode: boolean;
  /** Wide desktop landscape-split grid is active. */
  isDesktopSplit: boolean;
}

/**
 * Decides whether the calendar heatmap should render in its narrow
 * vertical layout (months down the side, ~120px per year) or its wide
 * horizontal GitHub-style layout (54 weeks across).
 *
 * Step 1: Folded contexts have a fixed answer regardless of available
 *         width - tent's bar is always wide, book's column is always narrow.
 * Step 2: Otherwise (desktop split or the plain stacked layout), the
 *         horizontal layout only reads well with real width to spread
 *         into, so it's reserved for the dedicated wide desktop-split
 *         column; every narrower context defaults to vertical.
 */
export function getHeatmapOrientation({
  isTentMode,
  isBookMode,
  isDesktopSplit,
}: HeatmapOrientationInput): "vertical" | "horizontal" {
  if (isTentMode) return "horizontal"; // Step 1a: tent's bottom bar is always wide.
  if (isBookMode) return "vertical"; // Step 1b: book's column is always narrow.
  return isDesktopSplit ? "horizontal" : "vertical"; // Step 2: width-dependent otherwise.
}

export interface LayoutClassInput {
  /** At least one export has been loaded. */
  hasData: boolean;
  /** Either fold mode is active (book or tent). */
  isFolded: boolean;
  /** Book mode's form/heatmap column order has been swapped by the user. */
  formOnRight: boolean;
}

/**
 * Builds the root layout `className` that `app/globals.css` keys its
 * responsive rules off of.
 *
 * Step 1: `layout-split` renders as a grid once there's a folded panel or
 *         data to show side by side; `layout-stack` is the plain centered
 *         single-column layout for the empty, non-folded state.
 * Step 2: `split-reversed` swaps which side the form sits on (book mode only).
 * Step 3: `split-no-data` keeps a folded, empty panel-form below the fold
 *         instead of stretching across it.
 */
export function getLayoutClassName({
  hasData,
  isFolded,
  formOnRight,
}: LayoutClassInput): string {
  return [
    hasData || isFolded ? "layout-split" : "layout-stack", // Step 1
    formOnRight && hasData ? "split-reversed" : "", // Step 2
    !hasData && isFolded ? "split-no-data" : "", // Step 3
  ]
    .filter(Boolean)
    .join(" ");
}

/** What the calendar shows: every year, or one year. */
export type YearView = "all" | number;

/**
 * The calendar view from the year tabs, the address and the layout.
 *
 * Step 1: A picked year that the data has wins; "all" wins when there is
 *         more than one year (one year shows as that year).
 * Step 2: With nothing valid picked, the desktop split shows every year;
 *         the phone column shows the latest year, which reads better than
 *         narrow year columns side by side.
 */
export function pickYearView(
  picked: YearView | null,
  years: readonly number[],
  isDesktopSplit: boolean,
): YearView {
  const latest = years[years.length - 1];
  if (latest === undefined) return "all";
  // Step 1
  if (picked === "all") return years.length > 1 ? "all" : latest;
  if (picked !== null && years.includes(picked)) return picked;
  // Step 2
  return isDesktopSplit && years.length > 1 ? "all" : latest;
}
