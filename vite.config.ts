import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import path from "path";
import fs from "fs";

/**
 * Serves `dev/test.html` (the synthetic-data generator for exercising the
 * app without real export files) at `/test.html`, dev server only.
 *
 * `configureServer` only runs under `vite dev`, never `vite build` - and
 * since the source file lives outside `public/`, it's never copied into
 * the production output either. Together that keeps the page reachable
 * locally while genuinely absent from anything shipped.
 */
function serveDevTestPage(): Plugin {
  const filePath = path.resolve(__dirname, "dev/test.html");
  return {
    name: "serve-dev-test-page",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/test.html") {
          res.setHeader("Content-Type", "text/html");
          res.end(fs.readFileSync(filePath, "utf-8"));
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), serveDevTestPage()],
  server: { host: "0.0.0.0", port: 3000, allowedHosts: true },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
