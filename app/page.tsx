import React, { useEffect, useMemo, useState } from "react";
import { HeatMapForm } from "@/components/heatMapForm";
import { AIChatHeatmap } from "@/components/heatmap";
import { ModeToggle } from "@/components/modeToggle";
import { useTheme } from "next-themes";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ConversationSummary } from "@/lib/types";

function loadTestData(
  setChatgptData: React.Dispatch<React.SetStateAction<ConversationSummary[] | null>>,
  setClaudeData:  React.Dispatch<React.SetStateAction<ConversationSummary[] | null>>,
) {
  try {
    const gpt    = sessionStorage.getItem("test-chatgpt");
    const claude = sessionStorage.getItem("test-claude");
    if (gpt)    setChatgptData(JSON.parse(gpt)    as ConversationSummary[]);
    if (claude) setClaudeData (JSON.parse(claude) as ConversationSummary[]);
  } catch {}
}

export default function Home() {
  const { theme, resolvedTheme } = useTheme();
  const effectiveTheme = theme === "system" ? resolvedTheme : theme;

  const [chatgptData, setChatgptData] = useState<ConversationSummary[] | null>(null);
  const [claudeData, setClaudeData]   = useState<ConversationSummary[] | null>(null);
  const [timeZone, setTimeZone]       = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [mounted, setMounted]         = useState(false);
  const [formOnRight, setFormOnRight] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const isFoldedLandscape = useMediaQuery("(device-posture: folded) and (orientation: landscape)");
  const isFoldedPortrait  = useMediaQuery("(device-posture: folded) and (orientation: portrait)");
  const isLandscape       = useMediaQuery("(orientation: landscape)");
  const isMobile          = useMediaQuery("(pointer: coarse)");

  const dataYears = useMemo<number[]>(() => {
    const allDays = [
      ...(chatgptData ?? []).map(c => c.create_day),
      ...(claudeData  ?? []).map(c => c.create_day),
    ];
    if (!allDays.length) return [];
    const yearSet = new Set(allDays.map(d => parseInt(d.slice(0, 4), 10)));
    return Array.from(yearSet).sort((a, b) => a - b);
  }, [chatgptData, claudeData]);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { loadTestData(setChatgptData, setClaudeData); }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("form-on-right");
      if (saved !== null) setFormOnRight(saved === "true");
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("form-on-right", String(formOnRight)); } catch {}
  }, [formOnRight]);

  useEffect(() => {
    if (!dataYears.length) { setSelectedYear(null); return; }
    setSelectedYear(prev => (prev !== null && dataYears.includes(prev) ? prev : dataYears[dataYears.length - 1]));
  }, [dataYears]);

  const hasData = chatgptData !== null || claudeData !== null;

  const isBookMode = isFoldedPortrait;
  const isTentMode = isFoldedLandscape;

  const activeYear   = selectedYear ?? dataYears[dataYears.length - 1] ?? null;
  const activeViewFrom = activeYear != null ? new Date(activeYear, 0, 1)  : undefined;
  const activeViewTo   = activeYear != null ? new Date(activeYear, 11, 31) : undefined;

  const goToPrevYear = () => {
    if (activeYear == null) return;
    const idx = dataYears.indexOf(activeYear);
    if (idx > 0) setSelectedYear(dataYears[idx - 1]);
  };
  const goToNextYear = () => {
    if (activeYear == null) return;
    const idx = dataYears.indexOf(activeYear);
    if (idx < dataYears.length - 1) setSelectedYear(dataYears[idx + 1]);
  };

  const useVerticalHeatmap = isTentMode ? false : isBookMode ? true : isMobile && !isLandscape;

  const isFolded = isBookMode || isTentMode;
  const layoutClass = [
    hasData || isFolded ? "layout-split" : "layout-stack",
    formOnRight && hasData ? "split-reversed" : "",
    !hasData && isFolded ? "split-no-data" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className="relative">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-zinc-50 dark:bg-zinc-950" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_40%_at_50%_-5%,rgba(147,130,255,0.07),transparent)] dark:bg-[radial-gradient(ellipse_80%_40%_at_50%_-5%,rgba(147,130,255,0.18),transparent)]" />

      <div className={layoutClass}>

        {/* Form panel -- hidden in tent mode when data is present (tent bottom replaces it) */}
        {(!isTentMode || !hasData) && <div className="panel-form">
          <header className="flex items-center justify-between mb-6 pt-2">
            <h1 className="text-2xl font-semibold tracking-tight">AI Chat Heatmap</h1>
            <div className="flex items-center gap-2">
              {isBookMode && hasData && (
                <button
                  onClick={() => setFormOnRight(v => !v)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  title={formOnRight ? "Move panel left" : "Move panel right"}
                  aria-label={formOnRight ? "Move panel left" : "Move panel right"}
                >
                  {formOnRight ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
              <ModeToggle />
            </div>
          </header>

          <main
            id="main-content"
            tabIndex={-1}
            className="outline-none rounded-2xl border border-zinc-200/80 bg-white/80 backdrop-blur-sm shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60 p-6 sm:p-8"
          >
            <HeatMapForm
              setChatgptFile={setChatgptData}
              setClaudeFile={setClaudeData}
              timeZone={timeZone}
              setTimeZone={setTimeZone}
            />
          </main>

          {isBookMode && hasData && (
            <div className="book-nav">
              <div className="tent-years">
                {dataYears.map(y => (
                  <button
                    key={y}
                    className={`tent-year-btn${activeYear === y ? " tent-year-active" : ""}`}
                    onClick={() => setSelectedYear(y)}
                  >
                    {y}
                  </button>
                ))}
              </div>
              <div className="tent-arrows">
                <button
                  className="tent-arrow-btn"
                  disabled={activeYear == null || dataYears.indexOf(activeYear) <= 0}
                  onClick={goToPrevYear}
                  aria-label="Previous year"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="tent-arrow-btn"
                  disabled={activeYear == null || dataYears.indexOf(activeYear) >= dataYears.length - 1}
                  onClick={goToNextYear}
                  aria-label="Next year"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          <footer className="mt-auto pt-8 flex gap-6 flex-wrap items-center justify-center">
            <a
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
              href="https://github.com/cr2007/chatgpt-heatmap-web"
              target="_blank"
              rel="noopener noreferrer"
            >
              {mounted && (
                <img
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
        </div>}

        {/* Heatmap panel */}
        {hasData && (
          <div className="panel-heatmap animate-fade-slide-up">
            <AIChatHeatmap
              chatgptSummary={chatgptData}
              claudeSummary={claudeData}
              vertical={useVerticalHeatmap}
              viewFrom={(isTentMode || isBookMode) ? activeViewFrom : undefined}
              viewTo={(isTentMode || isBookMode) ? activeViewTo : undefined}
            />
          </div>
        )}

        {/* Tent mode: bottom panel replaces form panel when landscape+folded or spanning-vertical */}
        {isTentMode && hasData && (
          <div className="panel-form">
            <div className="tent-bottom">
              <div className="tent-bottom__form">
                <HeatMapForm
                  setChatgptFile={setChatgptData}
                  setClaudeFile={setClaudeData}
                  timeZone={timeZone}
                  setTimeZone={setTimeZone}
                />
              </div>
              <div className="tent-bottom__nav">
                <div className="tent-years">
                  {dataYears.map(y => (
                    <button
                      key={y}
                      className={`tent-year-btn${activeYear === y ? " tent-year-active" : ""}`}
                      onClick={() => setSelectedYear(y)}
                    >
                      {y}
                    </button>
                  ))}
                </div>
                <div className="tent-arrows">
                  <button
                    className="tent-arrow-btn"
                    disabled={activeYear == null || dataYears.indexOf(activeYear) <= 0}
                    onClick={goToPrevYear}
                    aria-label="Previous year"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    className="tent-arrow-btn"
                    disabled={activeYear == null || dataYears.indexOf(activeYear) >= dataYears.length - 1}
                    onClick={goToNextYear}
                    aria-label="Next year"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
