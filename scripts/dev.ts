/**
 * Dev server: Bun bundles index.html on request, with hot reloading.
 * Tailwind runs through the plugin in bunfig.toml ([serve.static]).
 */
import app from "../index.html";
import testPage from "../dev/test.html";

/** Bound to localhost by default; set HOST=0.0.0.0 to open it to the LAN. */
const hostname = process.env.HOST ?? "localhost";
const publicDir = `${import.meta.dir}/../public`;

const server = Bun.serve({
  hostname,
  port: Number(process.env.PORT ?? 3000),
  development: { hmr: true, console: true },
  routes: { "/": app, "/test.html": testPage }, // Step 1: test page is a route only, so no build ships it
  async fetch(req) {
    // Step 2: Serve files in public/ as-is (the font, llms.txt). Resolve
    // inside public/ only; ".." cannot climb out of it.
    const path = new URL(req.url).pathname;
    const file = Bun.file(`${publicDir}${path}`);
    if (!path.includes("..") && (await file.exists()))
      return new Response(file);
    return new Response("Not found", { status: 404 });
  },
});

console.log(`Dev server: ${server.url}`);
