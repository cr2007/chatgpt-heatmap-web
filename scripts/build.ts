/**
 * Production build into dist/, with Bun APIs only.
 *
 * Step 1: Remove the old dist/ (Bun Shell's built-in `rm`).
 * Step 2: Bundle index.html with Bun.build. The Tailwind plugin works in this
 *         API but not yet in the `bun build` CLI.
 * Step 3: Copy public/ as-is (the font, llms.txt) with Bun.Glob and Bun.write.
 * Step 4: Print each file's size and gzip size.
 */
import tailwind from "bun-plugin-tailwind";
import { $ } from "bun";

const outdir = "dist";

// Step 1
await $`rm -rf ${outdir}`;

// Step 2
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

// Step 3
for await (const path of new Bun.Glob("**/*").scan({
  cwd: "public",
  dot: true,
}))
  await Bun.write(`${outdir}/${path}`, Bun.file(`public/${path}`));

// Step 4
for (const output of result.outputs) {
  const bytes = await Bun.file(output.path).bytes();
  const kb = (n: number) => `${(n / 1024).toFixed(1).padStart(7)} kB`;
  console.log(
    `${kb(bytes.length)}  ${kb(Bun.gzipSync(bytes).length)} gzip  ${output.path.slice(output.path.lastIndexOf(outdir))}`,
  );
}
