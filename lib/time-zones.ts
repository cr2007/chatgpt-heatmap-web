/** The computer's time zone, as the engine names it (Chromium may say "Asia/Calcutta"). */
export const SYSTEM_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Every zone the picker offers: "UTC" first, then the computer's zone, then
 * the engine's list. Chromium leaves "UTC" out of `Intl.supportedValuesOf`,
 * and a computer can use a zone name that the list does not have.
 */
export function zoneList(
  systemZone = SYSTEM_ZONE,
  supported: readonly string[] = Intl.supportedValuesOf("timeZone"),
): string[] {
  return [...new Set(["UTC", systemZone, ...supported])];
}

/**
 * Finds the zone that `text` names, or null. Case, spaces at the ends, and
 * spaces typed for underscores ("new york") do not matter.
 */
export function matchZone(
  text: string,
  zones: readonly string[],
): string | null {
  const wanted = text.trim().replaceAll(" ", "_").toLowerCase();
  return zones.find((zone) => zone.toLowerCase() === wanted) ?? null;
}
