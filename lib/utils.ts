import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Joins class names and lets a later Tailwind class win over an earlier one. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats counts in the reader's locale, for example "1,284". */
const number = new Intl.NumberFormat();

/** Formats a count in the reader's locale. */
export const count = (n: number) => number.format(n);

/** "1 message", "1,284 messages": the count and the word, plural when not 1. */
export function plural(n: number, word: string): string {
  return `${count(n)} ${word}${n === 1 ? "" : "s"}`;
}

/**
 * Splits a file name so its end (with the extension) stays visible when the
 * start is cut: "conversations (2) - Work laptop.json" keeps "laptop.json".
 */
export function splitName(name: string, tail = 11): [string, string] {
  return name.length <= tail * 2
    ? [name, ""]
    : [name.slice(0, -tail), name.slice(-tail)];
}
