/** Matches a mouse-driven, landscape browser window wide enough for the
 *  side-by-side desktop grid (panel-form as a fixed sidebar, panel-heatmap
 *  filling the rest). Below this, layout falls back to a single scrolling
 *  column. */
export const DESKTOP_SPLIT_QUERY = "(orientation: landscape) and (min-width: 640px) and (pointer: fine)";

/** Matches a folded device held upright (book mode): fold runs vertically,
 *  panels sit side by side as two grid columns. */
export const FOLDED_PORTRAIT_QUERY = "(device-posture: folded) and (orientation: portrait)";

/** Matches a folded device propped up like a laptop (tent mode): fold runs
 *  horizontally, heatmap on top, form on the bottom bar. */
export const FOLDED_LANDSCAPE_QUERY = "(device-posture: folded) and (orientation: landscape)";

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
  if (isTentMode) return "horizontal";       // Step 1a: tent's bottom bar is always wide.
  if (isBookMode) return "vertical";         // Step 1b: book's column is always narrow.
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
export function getLayoutClassName({ hasData, isFolded, formOnRight }: LayoutClassInput): string {
  return [
    hasData || isFolded ? "layout-split" : "layout-stack", // Step 1
    formOnRight && hasData ? "split-reversed" : "",         // Step 2
    !hasData && isFolded ? "split-no-data" : "",             // Step 3
  ].filter(Boolean).join(" ");
}
