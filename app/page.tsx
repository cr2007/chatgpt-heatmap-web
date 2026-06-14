"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { HeatMapForm } from "@/components/heatMapForm";
import { AIChatHeatmap, ChatgptSummary, ClaudeSummary } from "@/components/heatmap";
import { ModeToggle } from "@/components/modeToggle";
import { useTheme } from "next-themes";
// Uncomment during winter (Dec-Feb) for snowfall effect:
// import Snowfall from "react-snowfall";

export default function Home() {
  const { theme, resolvedTheme } = useTheme();
  const effectiveTheme = theme === "system" ? resolvedTheme : theme;

  const [chatgptData, setChatgptData] = useState<ChatgptSummary[] | null>(null);
  const [claudeData, setClaudeData] = useState<ClaudeSummary[] | null>(null);
  const [timeZone, setTimeZone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasData = chatgptData !== null || claudeData !== null;

  return (
    <div className="relative flex flex-col items-center min-h-screen gap-10 p-6 pb-16 sm:p-12 font-[family-name:var(--font-geist-sans)]">

      {/* Snowfall — uncomment during winter (Dec-Feb), also uncomment the import above */}
      {/* {mounted && <Snowfall color={effectiveTheme === "dark" ? "#dee4fd" : "#c8c8d0"} snowflakeCount={80} />} */}

      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-zinc-50 dark:bg-zinc-950" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_40%_at_50%_-5%,rgba(147,130,255,0.07),transparent)] dark:bg-[radial-gradient(ellipse_80%_40%_at_50%_-5%,rgba(147,130,255,0.18),transparent)]" />

      {/* Header */}
      <header className="w-full max-w-lg flex items-center justify-between pt-2">
        <h1 className="text-2xl font-semibold tracking-tight">AI Chat Heatmap</h1>
        <ModeToggle />
      </header>

      {/* Form card */}
      <main className="w-full max-w-lg rounded-2xl border border-zinc-200/80 bg-white/80 backdrop-blur-sm shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60 p-6 sm:p-8">
        <HeatMapForm
          setChatgptFile={setChatgptData}
          setClaudeFile={setClaudeData}
          timeZone={timeZone}
          setTimeZone={setTimeZone}
        />
      </main>

      {/* Heatmap */}
      {hasData && (
        <div className="animate-fade-slide-up w-full flex justify-center px-4 sm:px-8">
          <div className="hidden md:block" style={{ width: "min(80vw, 900px)" }}>
            <AIChatHeatmap chatgptSummary={chatgptData} claudeSummary={claudeData} vertical={false} />
          </div>
          <div className="block md:hidden" style={{ width: "90vw" }}>
            <AIChatHeatmap chatgptSummary={chatgptData} claudeSummary={claudeData} vertical={true} />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto flex gap-6 flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
          href="https://github.com/cr2007/chatgpt-heatmap-web"
          target="_blank"
          rel="noopener noreferrer"
        >
          {mounted && (
            <Image
              aria-hidden
              src={effectiveTheme === "dark" ? "/github-mark-white.svg" : "/github-mark.svg"}
              alt="GitHub Icon"
              width={18}
              height={18}
              style={{ width: "18px", height: "18px" }}
            />
          )}
          Project Source Code
        </a>
      </footer>

    </div>
  );
}
