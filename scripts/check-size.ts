/**
 * Fails when the built JS or CSS grows past its gzip budget, so a dependency
 * update cannot add size without notice. Run it after `bun --bun run build`.
 *
 * Step 1: Gzip every JS and CSS file in dist/ (Bun.gzipSync) and add up the
 *         sizes per type.
 * Step 2: Compare each total with its budget; exit 1 if one is over.
 */

/** Gzip budgets in bytes, a little above the sizes on 2026-11-10 (JS 80.4 kB,
 *  CSS 8.6 kB). Raised on purpose since: CSS to 10.5 kB for the welcome
 *  screen; JS to 88 kB for the figures and year tabs (84.6 kB) plus the
 *  planned keyboard day details and zone search (about 3 kB); JS to 90 kB
 *  and CSS to 11 kB for the drop zone motion and drag guard (88.0 and
 *  10.6 kB); CSS to 11.5 kB for the top bar, its chips, the help popover,
 *  the phone panel and the page drop overlay (11.3 kB); JS to 91 kB for
 *  citable ids and section headings (90.2 kB). CSS lowered to 11 kB when
 *  the fold layouts reused the flat parts (10.5 kB); JS stays at 91 kB for
 *  the star link (90.1 kB). */
const BUDGET = { js: 91_000, css: 11_000 } as const;

// Step 1
const totals = { js: 0, css: 0 };
for await (const path of new Bun.Glob("*.{js,css}").scan("dist")) {
  const type = path.endsWith(".js") ? "js" : "css";
  totals[type] += Bun.gzipSync(await Bun.file(`dist/${path}`).bytes()).length;
}
if (totals.js === 0)
  throw new Error("No JS in dist/; run `bun --bun run build` first.");

// Step 2
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
