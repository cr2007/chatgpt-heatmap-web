import vinext from "vinext";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vinext()],
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
  ssr: {
    noExternal: ["lucide-react"],
  },
});
