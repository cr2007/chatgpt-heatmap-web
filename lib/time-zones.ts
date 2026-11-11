import { ZONES } from "./zone-data";

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

/** Where a zone is: its country code and its place in degrees (tzdata). */
export interface Place {
  cc: string;
  lat: number;
  lon: number;
}
let places: Map<string, Place> | undefined;
/** The place of `zone` (lib/zone-data.ts), or undefined for UTC and Etc zones. */
export function placeOf(zone: string): Place | undefined {
  places ??= new Map(
    ZONES.split("|").map((row) => {
      const [z, cc, lat, lon] = row.split(" ");
      return [z, { cc, lat: Number(lat), lon: Number(lon) }];
    }),
  );
  return places.get(zone) ?? places.get(canonical(zone));
}

/** The engine's name for `zone` ("Asia/Calcutta" may become "Asia/Kolkata"). */
function canonical(zone: string) {
  try {
    return new Intl.DateTimeFormat("en", { timeZone: zone }).resolvedOptions()
      .timeZone;
  } catch {
    return zone;
  }
}

/** Great-circle distance in km between two places (haversine). */
export function distance(a: Place, b: Place): number {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) *
      Math.cos(b.lat * rad) *
      Math.sin(((b.lon - a.lon) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Distance for a zone with no place (UTC): after every placed zone. */
const FAR = 1e9;

/** One zone in the search index. */
export interface ZoneEntry {
  zone: string;
  /** The place, from the zone name: "Asia/Kolkata" gives "Kolkata". */
  city: string;
  /** The zone name before the city: "Asia", "America/Argentina". */
  area: string;
  /** "India" (English), or "" for UTC and Etc zones. */
  country: string;
  /** Distance in km from the home zone (the computer's), or FAR. */
  km: number;
  /** "India Standard Time" (English, today's date). */
  long: string;
  /** "GMT+5:30" today. */
  offset: string;
  /** Today's offset from UTC in minutes. */
  minutes: number;
  /** Normalized words the search compares with. */
  terms: string[];
}

/** Common abbreviations. Browsers give them only for some locales, and
 *  several are ambiguous (IST is India, Ireland and Israel), so every
 *  candidate is listed, the most used first. */
const ABBREVIATIONS: Record<string, string[]> = {
  pst: ["America/Los_Angeles"],
  pdt: ["America/Los_Angeles"],
  pt: ["America/Los_Angeles"],
  mst: ["America/Denver", "America/Phoenix"],
  mdt: ["America/Denver"],
  cst: ["America/Chicago", "Asia/Shanghai"],
  cdt: ["America/Chicago"],
  est: ["America/New_York"],
  edt: ["America/New_York"],
  et: ["America/New_York"],
  akst: ["America/Anchorage"],
  hst: ["Pacific/Honolulu"],
  gmt: ["Europe/London", "UTC"],
  bst: ["Europe/London", "Asia/Dhaka"],
  cet: ["Europe/Paris", "Europe/Berlin"],
  cest: ["Europe/Paris", "Europe/Berlin"],
  eet: ["Europe/Athens", "Africa/Cairo"],
  eest: ["Europe/Athens"],
  ist: ["Asia/Kolkata", "Europe/Dublin", "Asia/Jerusalem"],
  gst: ["Asia/Dubai"],
  pkt: ["Asia/Karachi"],
  sgt: ["Asia/Singapore"],
  hkt: ["Asia/Hong_Kong"],
  jst: ["Asia/Tokyo"],
  kst: ["Asia/Seoul"],
  wib: ["Asia/Jakarta"],
  aest: ["Australia/Sydney"],
  aedt: ["Australia/Sydney"],
  nzst: ["Pacific/Auckland"],
  nzdt: ["Pacific/Auckland"],
  brt: ["America/Sao_Paulo"],
};

/** Cities renamed after their zone got its name; both names find the zone. */
const RENAMED: Record<string, string> = {
  calcutta: "kolkata",
  saigon: "ho chi minh",
  kiev: "kyiv",
  rangoon: "yangon",
  katmandu: "kathmandu",
  godthab: "nuuk",
};

/** Lower case, no accents, and spaces for underscores: "São_Paulo" gives "sao paulo". */
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[_\s]+/g, " ")
    .trim()
    .toLowerCase();

/** The minutes of an offset query ("+4", "gmt+5:30", "UTC-08:00"), or null. */
export function offsetQuery(q: string): number | null {
  const m = /^(?:utc|gmt)?\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/.exec(q);
  if (!m) return null;
  const minutes = Number(m[2]) * 60 + Number(m[3] ?? 0);
  return m[1] === "-" ? -minutes : minutes;
}

/** Minutes of a "GMT+5:30" label; "GMT" alone is 0. */
const labelMinutes = (label: string) => offsetQuery(label.toLowerCase()) ?? 0;

/**
 * Builds the search index for `zones`, with the names and offsets of
 * `now`, each zone's country (Intl.DisplayNames, so no names ship) and its
 * distance from `home`. It formats about 1,300 names (about 50 ms on a
 * desktop), so the picker builds it once, when the browser is idle or on
 * first use.
 */
export function buildIndex(
  zones: readonly string[],
  now = new Date(),
  home = SYSTEM_ZONE,
): ZoneEntry[] {
  const countries = new Intl.DisplayNames(["en"], { type: "region" });
  const from = placeOf(home);
  return zones.map((zone) => {
    const at = placeOf(zone);
    const country = at ? (countries.of(at.cc) ?? "") : "";
    const name = (style: "long" | "longGeneric" | "shortOffset") =>
      new Intl.DateTimeFormat("en", { timeZone: zone, timeZoneName: style })
        .formatToParts(now)
        .find((p) => p.type === "timeZoneName")?.value ?? "";
    const parts = zone.split("/");
    const place = (parts.length > 1 ? parts.at(-1)! : zone).replaceAll(
      "_",
      " ",
    );
    const long = name("long");
    const offset = name("shortOffset");
    const key = normalize(place);
    const renamed =
      RENAMED[key] ?? Object.keys(RENAMED).find((k) => RENAMED[k] === key);
    // A renamed city shows its current name ("Kolkata" for Asia/Calcutta).
    const city = RENAMED[key]
      ? RENAMED[key].replace(/\b\w/g, (c) => c.toUpperCase())
      : place;
    return {
      zone,
      city,
      area: parts.slice(0, -1).join("/").replaceAll("_", " "),
      country,
      km: at && from ? distance(from, at) : FAR,
      long,
      offset,
      minutes: labelMinutes(offset),
      // The shown city first: typos are checked against it.
      terms: [
        normalize(city),
        normalize(zone),
        normalize(long),
        normalize(name("longGeneric")),
        city === place ? (renamed ?? "") : key,
        normalize(country),
      ].filter(Boolean),
    };
  });
}

/** Typo distance: the edits (insert, delete, change, swap two neighbours)
 *  between two words (optimal string alignment). */
export function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [
    i,
    ...Array<number>(b.length).fill(0),
  ]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}

/**
 * The zones that match `query`, best first.
 *
 * Step 1: An offset ("+4", "GMT+5:30") matches zones with that offset today.
 * Step 2: An abbreviation ("IST") puts its zones first, in its own order.
 * Step 3: Each zone gets the best score of its terms: 0 the same text, 1 a
 *         term that starts with the query, 2 a word that does, 3 a term
 *         that holds it. A query of 4+ letters may also match a city with
 *         1 typo (2 from 7 letters): score 4 plus the typos.
 * Step 4: Sort by score; a tie puts a widely used zone (one in the
 *         abbreviation table) first, then the nearer zone, then sorts by
 *         city.
 */
export function searchZones(
  index: readonly ZoneEntry[],
  query: string,
  limit = 60,
): ZoneEntry[] {
  const q = normalize(query);
  if (!q) return index.slice(0, limit);
  // Step 1
  const offset = offsetQuery(q);
  // (Ranked below with the other matches: score 1.)

  // Step 2
  const abbr = (ABBREVIATIONS[q] ?? []).map(canonical);
  const common = new Set(Object.values(ABBREVIATIONS).flat().map(canonical));
  // Step 3
  const scored: [ZoneEntry, number][] = [];
  const typos = q.length >= 7 ? 2 : q.length >= 4 ? 1 : 0;
  for (const e of index) {
    if (offset !== null) {
      if (e.minutes === offset) scored.push([e, 1]);
      continue;
    }
    let best = abbr.includes(e.zone) ? -10 + abbr.indexOf(e.zone) : Infinity;
    for (const t of e.terms) {
      const s =
        t === q
          ? 0
          : t.startsWith(q)
            ? 1
            : t.split(/[ /]/).some((w) => w.startsWith(q))
              ? 2
              : t.includes(q)
                ? 3
                : Infinity;
      best = Math.min(best, s);
    }
    if (best === Infinity && typos) {
      const city = e.terms[0];
      const d = Math.min(
        editDistance(q, city),
        editDistance(q.replaceAll(" ", ""), city.replaceAll(" ", "")),
      );
      if (d <= typos) best = 4 + d;
    }
    if (best !== Infinity) scored.push([e, best]);
  }
  // Step 4
  return scored
    .sort(
      (a, b) =>
        a[1] - b[1] ||
        Number(common.has(b[0].zone)) - Number(common.has(a[0].zone)) ||
        a[0].km - b[0].km ||
        a[0].city.localeCompare(b[0].city),
    )
    .slice(0, limit)
    .map(([e]) => e);
}

/**
 * The list before any search: UTC, then every zone by its distance from
 * the computer's zone, nearest first (the computer's zone itself, then
 * its neighbours). A zone with no place follows, by name.
 */
export function nearestFirst(index: readonly ZoneEntry[]): ZoneEntry[] {
  return [...index].sort(
    (a, b) =>
      Number(b.zone === "UTC") - Number(a.zone === "UTC") ||
      a.km - b.km ||
      a.zone.localeCompare(b.zone),
  );
}
