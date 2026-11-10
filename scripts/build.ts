/**
 * Production build into dist/.
 *
 * Step 1: Bundle index.html with Bun.build. The Tailwind plugin works in this
 *         API but not yet in the `bun build` CLI.
 * Step 2: Copy public/ as-is (the font, llms.txt).
 */
import tailwind from "bun-plugin-tailwind";
import { cp, rm } from "node:fs/promises";

const outdir = "dist";
await rm(outdir, { recursive: true, force: true });

// Step 1
const result = await Bun.build({
  entrypoints: ["./index.html"],
  outdir,
  minify: true,
  plugins: [tailwind],
  // Drops dev-only code such as the sessionStorage test-data hook.
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
});
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

// Step 2
await cp("public", outdir, { recursive: true });

for (const o of result.outputs) {
  console.log(
    `${(o.size / 1024).toFixed(1).padStart(7)} kB  ${o.path.slice(o.path.lastIndexOf(outdir))}`,
  );
}
