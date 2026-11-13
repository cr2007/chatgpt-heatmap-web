/**
 * Fails when the built JS or CSS grows past its gzip budget, so a dependency
 * update cannot add size without notice. Run it after `bun --bun run build`.
 */

/**
 * Gzip budgets in bytes, a little above the sizes on 2026-11-10 (JS 80.4 kB,
 * CSS 8.6 kB).
 *
 * @remarks
 * Raised on purpose since: CSS to 10.5 kB for the welcome
 * screen; JS to 88 kB for the figures and year tabs (84.6 kB) plus the
 * planned keyboard day details and zone search (about 3 kB); JS to 90 kB
 * and CSS to 11 kB for the drop zone motion and drag guard (88.0 and
 * 10.6 kB); CSS to 11.5 kB for the top bar, its chips, the help popover,
 * the phone panel and the page drop overlay (11.3 kB); JS to 91 kB for
 * citable ids and section headings (90.2 kB). CSS lowered to 11 kB when
 * the fold layouts reused the flat parts (10.5 kB); JS stays at 91 kB for
 * the star link (90.1 kB); JS to 92 kB for the year morph (91.3 kB); JS to 99 kB for
 * the tzdata places of 437 zones, which rank the nearest zones first and
 * find a zone by its country (98.2 kB; country names cost nothing, they
 * come from Intl.DisplayNames); JS to 103 kB and CSS to 12 kB for the
 * post box drop zone on the welcome screen: the card motion and the box
 * (102.2 and 11.7 kB); JS to 106 kB and CSS to 12.5 kB for the year
 * change wave between single years and the draggable glass pill of the
 * year tabs (105.3 and 12.0 kB); JS to 106.5 kB for the audit and break-ui
 * fixes: the day card kept below the bar, every file in the phone panel,
 * readable zone names, the wide bar's overflow check and the memoized
 * calendar cells (106.3 kB); JS to 110 kB and CSS to 13.25 kB for the phone
 * gestures and fixes: the calendar swipe between views, the day sheet
 * with its swipe down, the toast swipe, the year row edge fade and the
 * touch rules for controls (109.4 and 13.0 kB); JS to 110.5 kB for the
 * year swipe with a pen and a mouse, and a hover card that ends with the
 * native pointerleave (110.1 kB); JS to 111 kB for the swipe area, the
 * pinned year tabs and hover styles for a pen over a phone (110.6 kB).
 */
const BUDGET = { js: 111_000, css: 13_250 } as const;

// Step 1: Gzip every JS and CSS file in dist/ and add up the sizes per type.
const totals = { js: 0, css: 0 };
for await (const path of new Bun.Glob("*.{js,css}").scan("dist")) {
  const type = path.endsWith(".js") ? "js" : "css";
  totals[type] += Bun.gzipSync(await Bun.file(`dist/${path}`).bytes()).length;
}
if (totals.js === 0)
  throw new Error("No JS in dist/; run `bun --bun run build` first.");

// Step 2: Compare each total with its budget; exit 1 if one is over.
let over = false;
for (const type of ["js", "css"] as const) {
  const ok = totals[type] <= BUDGET[type];
  over ||= !ok;
  console.log(
    `${ok ? "ok  " : "OVER"} ${type}: ${totals[type]} B gzip (budget ${BUDGET[type]} B)`,
  );
}
if (over) process.exit(1);

// An export makes this file a module, which top-level await needs.
export {};
