/**
 * Fails when the built JS or CSS grows past its gzip budget, so a dependency
 * update cannot add size without notice. Run it after `bun --bun run build`.
 *
 * Step 1: Gzip every JS and CSS file in dist/ (Bun.gzipSync) and add up the
 *         sizes per type.
 * Step 2: Compare each total with its budget; exit 1 if one is over.
 */

/** Gzip budgets in bytes, a little above the sizes on 2026-11-10 (JS 80.4 kB,
 *  CSS 8.6 kB). CSS raised to 10.5 kB for the welcome screen (9.9 kB). */
const BUDGET = { js: 84_000, css: 10_500 } as const;

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
