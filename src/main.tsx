import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeShortcut } from "@/components/theme-shortcut";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/sonner";
import App from "@/app/page";
import "@/app/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:rounded focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:text-sm"
      >
        Skip to main content
      </a>
      <ThemeShortcut />
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
      <Toaster />
    </ThemeProvider>
  </StrictMode>
);
