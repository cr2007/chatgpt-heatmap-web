/**
 * Buckets a count into one of three shades of a palette, used to give the
 * heatmap its light/medium/dark intensity steps.
 *
 * Step 1: Normalize the count against the day with the most activity.
 * Step 2: Pick the low/medium/high shade by that ratio.
 */
export function shade(count: number, max: number, palette: readonly [string, string, string]): string {
  const ratio = count / max; // Step 1: 0..1 intensity relative to the busiest day.
  return ratio < 0.34 ? palette[0] : ratio < 0.67 ? palette[1] : palette[2]; // Step 2.
}

/**
 * Zero-based day-of-year offset (Jan 1st is 0), used to place a date into
 * its week column on the calendar grid.
 */
export function dayOfYear(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  return Math.floor((date.getTime() - startOfYear.getTime()) / 864e5); // 864e5 = ms per day.
}
