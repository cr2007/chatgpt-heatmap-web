import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"

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

export const metadata: Metadata = {
  title: "AI Chat Heatmap",
  description: "Visualise your ChatGPT and Claude conversation history as an interactive calendar heatmap",
  keywords: [
    "ChatGPT",
    "Claude",
    "AI",
    "heatmap",
    "calendar heatmap",
    "conversation history",
    "chat analytics",
    "message activity",
    "data visualisation",
    "AI chat",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <noscript>
          <div style={{ padding: "2rem", textAlign: "center" }}>
            This application requires JavaScript to run. Please enable JavaScript in your browser settings.
          </div>
        </noscript>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
          {children}
          </ThemeProvider>
      </body>
    </html>
  );
}
