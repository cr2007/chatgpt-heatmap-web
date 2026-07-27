import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeShortcut } from "@/components/theme-shortcut";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/sonner";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

const DESCRIPTION = "Visualise your ChatGPT and Claude conversation history as an interactive calendar heatmap";
const SITE_URL    = "https://aiheatmap.csk.fyi";

export const metadata: Metadata = {
  title: "AI Chat Heatmap",
  description: DESCRIPTION,
  applicationName: "AI Chat Heatmap",
  authors: [{ name: "CSK", url: "https://github.com/cr2007" }],
  robots: "index, follow",
  keywords: [
    "ChatGPT", "Claude", "AI", "heatmap", "calendar heatmap",
    "conversation history", "chat analytics", "message activity",
    "data visualisation", "AI chat",
  ],
  openGraph: {
    type:        "website",
    url:         SITE_URL,
    siteName:    "AI Chat Heatmap",
    locale:      "en_US",
    title:       "AI Chat Heatmap",
    description: DESCRIPTION,
  },
  twitter: {
    card:        "summary_large_image",
    title:       "AI Chat Heatmap",
    description: DESCRIPTION,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "AI Chat Heatmap",
  description: DESCRIPTION,
  url: SITE_URL,
  applicationCategory: "UtilityApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:rounded focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:text-sm"
        >
          Skip to main content
        </a>
        <noscript>
          <div style={{
            padding: "2rem",
            maxWidth: "480px",
            margin: "4rem auto",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
            lineHeight: "1.6",
          }}>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>
              AI Chat Heatmap
            </h1>
            <p style={{ color: "#555", marginBottom: "1rem" }}>
              {DESCRIPTION}.
            </p>
            <p style={{ color: "#888", fontSize: "0.875rem" }}>
              JavaScript is required to run this app.
              Please enable it in your browser settings and reload the page.
            </p>
          </div>
        </noscript>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
          <ThemeShortcut />
          <ErrorBoundary>{children}</ErrorBoundary>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
