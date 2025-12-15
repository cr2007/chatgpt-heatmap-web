"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { HeatMapForm } from "@/components/heatMapForm";
import { ChatgptHeatmap, ChatgptSummary } from "@/components/chatgpt-heatmap";
import { ModeToggle } from "@/components/modeToggle";
import { useTheme } from "next-themes";
import Snowfall from 'react-snowfall';

export default function Home() {
  const { theme, resolvedTheme } = useTheme();

  // Resolve the theme if "system" theme is selected
  const effectiveTheme = theme === "system" ? resolvedTheme : theme;
  const snowflakeColour = effectiveTheme === "dark" ? '#dee4fd' : "#121212"

  // Input Values
  const [file, setFile] = useState<ChatgptSummary[] | null>(null);
  const [timeZone, setTimeZone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="flex flex-col items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      {mounted && effectiveTheme && (
        <Snowfall color={snowflakeColour} />
      )}
      <main className="flex flex-col gap-10 items-center sm:items-start justify-start self-center w-full max-w-lg">
        <div className="w-full flex justify-end">
          <ModeToggle />
        </div>
        <h1 className="text-2xl">ChatGPT Heatmap Generator</h1>
        <HeatMapForm setFile={setFile} timeZone={timeZone} setTimeZone={setTimeZone} />
      </main>

      {file && (
        <div className="flex items-center justify-center w-full h-full">
          {/* Desktop Heatmap */}
          <div className="hidden md:block" style={{ width: "80vw", height: "80vh", overflow: "hidden" }}>
            <ChatgptHeatmap summary={file} vertical={false} />
          </div>

          {/* Mobile Heatmap */}
          <div className="block md:hidden" style={{ width: "90vw", height: "90vh", overflow: "hidden" }}>
            <ChatgptHeatmap summary={file} vertical={true} />
          </div>
        </div>
      )}

      <footer className="row-start-3 flex gap-6 flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://github.com/cr2007/chatgpt-heatmap-web"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src={
              effectiveTheme === "dark"
              ? "/github-mark-white.svg" // Light version for dark theme
              : "/github-mark.svg"
            }
            alt="GitHub Icon"
            width={32}
            height={32}
            style={{ width: "32px", height: "32px" }}
          />
          Project Source Code
        </a>
      </footer>
    </div>
  );
}
