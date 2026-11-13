/**
 * Matches a mouse-driven, landscape window big enough for the horizontal
 * calendar and for "All years" as the first view.
 *
 * @remarks
 * The height limit keeps a short window (or 200% zoom, where a 1440x900
 * screen is 720x450) on the phone flow, where the calendar shows one year
 * at full size.
 */
export const DESKTOP_QUERY =
  "(orientation: landscape) and (min-width: 640px) and (min-height: 560px) and (pointer: fine)";

/**
 * Matches an expanded window (Android window size classes: 840 dp and
 * wider), such as an open foldable or a tablet in landscape: a year fits
 * across, so the calendar runs horizontally, with or without a mouse.
 *
 * @see {@link https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes | Android window size classes}
 */
export const EXPANDED_QUERY = "(min-width: 840px)";

/**
 * Matches a medium window or wider (Android: 600 dp), where a year fits across.
 *
 * @remarks
 * The short top half of a Fold in tent posture (829 px on a Fold 5) still
 * fits a year across at about 14 px cells; a Flip (about 412 px) does not.
 *
 * @see {@link https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes | Android window size classes}
 */
export const MEDIUM_QUERY = "(min-width: 600px)";

/**
 * Matches a window wide enough for the full top bar once an export is
 * loaded: the export chips with their counts, Add export and the time zone
 * in one row.
 *
 * @remarks
 * Measured with five-digit chat counts in both chips: at 80rem the time zone
 * field keeps about 12rem (it may shrink to 10rem, never under the links).
 * From 80rem the bar is at its width limit, which grows only with the root
 * font, so whether the tools fit does not depend on the window width. Longer
 * text (six-digit counts, another locale) can still overflow: the page then
 * keeps the narrow bar for those exports. Below it, the bar keeps the name
 * and the links, and a panel under it holds the rest.
 */
export const WIDE_BAR_QUERY = "(min-width: 80rem)";

/**
 * Matches a half-open foldable: "folded" means half open and spanning the
 * fold (W3C Device Posture).
 *
 * @remarks
 * A closed device on its cover screen, or a window on one half, is
 * "continuous".
 *
 * @see {@link https://www.w3.org/TR/device-posture/ | W3C Device Posture API}
 */
export const FOLDED_QUERY = "(device-posture: folded)";

/** How a half-open foldable is held: book (the halves side by side) or
 *  tent (the halves on top of each other). */
export type Posture = "book" | "tent";

/** One viewport segment: where a screen half sits in the window. */
interface Segment {
  /** Left edge in CSS px. */
  x: number;
  /** Top edge in CSS px. */
  y: number;
  /** Width in CSS px. */
  width: number;
  /** Height in CSS px. */
  height: number;
}

/**
 * Picks the posture to lay out for: book, tent or one screen.
 *
 * @remarks
 * Orientation alone cannot tell: a Surface Duo shows its two screens side by
 * side in a landscape window.
 *
 * @param segments - `window.viewport.segments` (CSS px), or undefined where
 *   the Viewport Segments API is missing.
 * @param folded - {@link FOLDED_QUERY} matches.
 * @param portrait - The window is in portrait orientation.
 * @returns "book" or "tent", or undefined for one screen.
 */
export function foldPosture(
  segments: readonly Segment[] | undefined,
  folded: boolean,
  portrait: boolean,
): Posture | undefined {
  // Step 1: The Viewport Segments API (Chrome 138+) knows the halves: side by
  // side is "book", stacked is "tent".
  if (segments) {
    if (segments.length !== 2) return undefined;
    const [a, b] = segments;
    const stacked = a.x === b.x;
    const gap = stacked ? b.y - (a.y + a.height) : b.x - (a.x + a.width);
    // Step 1.1: A seamless fold that lies flat (no gap, not folded) is one screen.
    if (gap <= 0 && !folded) return undefined;
    return stacked ? "tent" : "book";
  }
  // Step 2: Without that API, a folded posture falls back to the orientation:
  // portrait is book, landscape is tent.
  if (!folded) return undefined;
  return portrait ? "book" : "tent";
}

/** What {@link getHeatmapOrientation} reads. */
export interface HeatmapOrientationInput {
  /** The foldable posture, if any (see {@link foldPosture}). */
  posture: Posture | undefined;
  /** {@link DESKTOP_QUERY} or {@link EXPANDED_QUERY} matches. */
  isWide: boolean;
  /** {@link MEDIUM_QUERY} matches. */
  isMedium: boolean;
}

/**
 * Decides the direction of the calendar heatmap.
 *
 * @param input - The posture and the window size (see
 *   {@link HeatmapOrientationInput}).
 * @returns "vertical" for the narrow layout (a grid of months, 3 across and
 *   4 down, about 520 px per year on a phone), or "horizontal" for the wide GitHub-style layout
 *   (54 weeks across).
 */
export function getHeatmapOrientation({
  posture,
  isWide,
  isMedium,
}: HeatmapOrientationInput): "vertical" | "horizontal" {
  // Step 1: A posture fixes it: a book half is narrow (vertical). A tent half runs a
  // year across when medium (open Fold), else down (Flip: across gives 5 px cells).
  if (posture)
    return posture === "tent" && isMedium ? "horizontal" : "vertical";
  // Step 2: Otherwise only a desktop or an expanded window gets horizontal.
  return isWide ? "horizontal" : "vertical";
}

/** What the calendar shows: every year, or one year. */
export type YearView = "all" | number;

/**
 * Picks the calendar view from the year tabs.
 *
 * @remarks
 * Every visit starts on "All years" (the owner's choice, 2026-11-12); the
 * view is not kept in the address.
 *
 * @param picked - The view the user picked, or null for none.
 * @param years - The years of the data, ascending.
 * @returns The picked view when the data has it; else "all" for more than
 *   one year, or the one year there is.
 */
export function pickYearView(
  picked: YearView | null,
  years: readonly number[],
): YearView {
  const latest = years[years.length - 1];
  if (latest === undefined) return "all";
  // Step 1: A picked year that the data has wins; "all" wins when there is
  // more than one year (one year shows as that year).
  if (picked === "all") return years.length > 1 ? "all" : latest;
  if (picked !== null && years.includes(picked)) return picked;
  // Step 2: With nothing valid picked: every year, or the one year there is.
  return years.length > 1 ? "all" : latest;
}
