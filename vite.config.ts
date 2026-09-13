import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: { host: "0.0.0.0", port: 3000, allowedHosts: true },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
