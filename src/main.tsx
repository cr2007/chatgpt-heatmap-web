import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeShortcut } from "@/components/theme-shortcut";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/toaster";
import App from "@/app/page";
import { startTrace } from "@/app/dev-trace";
import { trackHover } from "@/app/hover-input";
import "@/app/globals.css";

startTrace();
trackHover();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:rounded focus:px-4 focus:py-2 focus:bg-accent-fill focus:text-accent-on focus:text-sm focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    >
      Skip to main content
    </a>
    <ThemeShortcut />
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
    <Toaster />
  </StrictMode>,
);
