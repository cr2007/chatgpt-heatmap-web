/**
 * Production build into dist/, with Bun APIs only.
 */
import tailwind from "bun-plugin-tailwind";
import { $ } from "bun";

const outdir = "dist";

/**
 * The page may load only its own files and may not connect anywhere, so an
 * export never leaves the browser, even through a bad dependency.
 *
 * @remarks
 * Inline styles stay allowed: index.html has an inline @font-face and the
 * no-JavaScript notice uses style attributes. Build only: the dev server
 * needs a WebSocket for hot reload.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP | MDN: Content Security Policy}
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

// Step 1: Remove the old dist/ (Bun Shell's built-in `rm`).
await $`rm -rf ${outdir}`;

// Step 2: Bundle index.html with Bun.build. The Tailwind plugin works in this
// API but not yet in the `bun build` CLI.
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

// Step 3: Copy public/ as-is (the font, llms.txt).
for await (const path of new Bun.Glob("**/*").scan({
  cwd: "public",
  dot: true,
}))
  await Bun.write(`${outdir}/${path}`, Bun.file(`public/${path}`));

// Step 4: Add the Content-Security-Policy to the built page, right after the
// charset, so the policy covers everything after it.
const page = Bun.file(`${outdir}/index.html`);
const html = await page.text();
const charset = '<meta charset="UTF-8" />';
if (!html.includes(charset))
  throw new Error(`${charset} not found in the built index.html`);
await Bun.write(
  page,
  html.replace(
    charset,
    `${charset}\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
  ),
);

// Step 5: Print each file's size and gzip size.
for (const output of result.outputs) {
  const bytes = await Bun.file(output.path).bytes();
  const kb = (n: number) => `${(n / 1024).toFixed(1).padStart(7)} kB`;
  console.log(
    `${kb(bytes.length)}  ${kb(Bun.gzipSync(bytes).length)} gzip  ${output.path.slice(output.path.lastIndexOf(outdir))}`,
  );
}
