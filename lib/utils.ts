import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Joins class names and lets a later Tailwind class win over an earlier one.
 *
 * @param inputs - Class names, arrays or condition maps, as `clsx` takes them.
 * @returns One class string with Tailwind conflicts resolved.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats counts in the reader's locale, for example "1,284". */
const number = new Intl.NumberFormat();

/**
 * Formats a count in the reader's locale.
 *
 * @param n - The count.
 * @returns The formatted count, for example "1,284".
 */
export const count = (n: number) => number.format(n);

/**
 * Writes a count with its word, plural when the count is not 1.
 *
 * @param n - The count.
 * @param word - The singular word; the plural adds "s".
 * @returns For example "1 message" or "1,284 messages".
 */
export function plural(n: number, word: string): string {
  return `${count(n)} ${word}${n === 1 ? "" : "s"}`;
}

/**
 * Splits a file name so its end (with the extension) stays visible when the
 * start is cut: "conversations (2) - Work laptop.json" keeps "laptop.json".
 *
 * @param name - The file name.
 * @param tail - Characters to keep at the end. A name of at most twice this
 *   length is not split.
 * @returns The start and the end; the end is "" when the name is not split.
 * @defaultValue `tail` is 11.
 */
export function splitName(name: string, tail = 11): [string, string] {
  return name.length <= tail * 2
    ? [name, ""]
    : [name.slice(0, -tail), name.slice(-tail)];
}

/** Weekday and date in the reader's locale, read in UTC so the day never shifts. */
const dayFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Formats a calendar day with its weekday.
 *
 * @param day - A `YYYY-MM-DD` day.
 * @returns For example "Mon, May 25, 2026" in the reader's locale.
 */
export const formatDay = (day: string) => dayFormat.format(Date.parse(day));
