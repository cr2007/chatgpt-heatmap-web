import { useEffect, useMemo, useState } from "react";
import { HeatMapForm } from "@/components/heatMapForm";
import { CalendarHeatmap } from "@/components/calendar-heatmap";
import { ModeToggle } from "@/components/modeToggle";
import { YearNav } from "@/components/year-nav";
import { useTheme } from "next-themes";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  DESKTOP_SPLIT_QUERY,
  FOLDED_PORTRAIT_QUERY,
  FOLDED_LANDSCAPE_QUERY,
  getHeatmapOrientation,
  getLayoutClassName,
} from "@/lib/layout";
import { aggregateDateData } from "@/lib/aggregate";
import { parseChatGPT, parseClaude } from "@/lib/parse";
import type { LoadedExport, Provider } from "@/lib/types";

type Exports = Record<Provider, LoadedExport | null>;

/** Stable empty year list, so effects keyed on it do not rerun. */
const NO_YEARS: number[] = [];

/** Loads the `sessionStorage` test-data hooks used by the CDP verification
 *  scripts (`test-chatgpt`/`test-claude`), if present. No-op otherwise. */
function loadTestData(setExports: (e: Exports) => void) {
  try {
    const read = (key: string): LoadedExport | null => {
      const json = sessionStorage.getItem(key);
      return json ? { name: "Test data", data: JSON.parse(json) } : null;
    };
    const chatgpt = read("test-chatgpt");
    const claude  = read("test-claude");
    if (chatgpt || claude) setExports({ chatgpt, claude });
  } catch {}
}

/**
 * Root page: owns the raw uploaded exports and the time zone, parses and
 * aggregates them once, and owns the responsive layout decision (plain
 * stack / desktop split / book / tent) and the year picker.
 */
export default function Home() {
  const { theme, resolvedTheme } = useTheme();
  const effectiveTheme = theme === "system" ? resolvedTheme : theme;

  const [exports, setExports]         = useState<Exports>({ chatgpt: null, claude: null });
  const [timeZone, setTimeZone]       = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [mounted, setMounted]         = useState(false);
  /** Book mode only: swaps which side the form sits on. Persisted. */
  const [formOnRight, setFormOnRight] = useState(false);
  /** Year currently shown on the heatmap in book/tent mode; null until data loads. */
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const isBookMode     = useMediaQuery(FOLDED_PORTRAIT_QUERY);
  const isTentMode     = useMediaQuery(FOLDED_LANDSCAPE_QUERY);
  const isDesktopSplit = useMediaQuery(DESKTOP_SPLIT_QUERY);

  /** Prompt counts per day. Parsed again only when an export or the time zone changes. */
  const agg = useMemo(() => aggregateDateData(
    exports.chatgpt ? parseChatGPT(exports.chatgpt.data, timeZone) : null,
    exports.claude  ? parseClaude(exports.claude.data, timeZone)   : null,
  ), [exports, timeZone]);
  const dataYears = agg?.years ?? NO_YEARS;

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { loadTestData(setExports); }, []);

  // Step 1: restore/persist the book-mode panel-swap preference.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("form-on-right");
      if (saved !== null) setFormOnRight(saved === "true");
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("form-on-right", String(formOnRight)); } catch {}
  }, [formOnRight]);

  // Step 2: keep the selected year valid as data loads/changes, defaulting
  // to the most recent year.
  useEffect(() => {
    if (!dataYears.length) { setSelectedYear(null); return; }
    setSelectedYear(prev => (prev !== null && dataYears.includes(prev) ? prev : dataYears[dataYears.length - 1]));
  }, [dataYears]);

  const hasData = exports.chatgpt !== null || exports.claude !== null;
  const isFolded = isBookMode || isTentMode;

  /** Adds new exports, keeping a provider the upload did not include. */
  const loadExports = (next: Partial<Exports>) => setExports(prev => ({ ...prev, ...next }));
  const clearExport = (provider: Provider) => setExports(prev => ({ ...prev, [provider]: null }));

  /** Props shared by the sidebar form and tent mode's bottom-bar form. */
  const formProps = {
    loaded: {
      chatgpt: exports.chatgpt && { name: exports.chatgpt.name, count: exports.chatgpt.data.length },
      claude:  exports.claude  && { name: exports.claude.name,  count: exports.claude.data.length },
    },
    onLoad: loadExports,
    onClear: clearExport,
    timeZone,
    setTimeZone,
  };

  const activeYear     = selectedYear ?? dataYears[dataYears.length - 1] ?? null;
  const activeViewFrom  = activeYear != null ? new Date(activeYear, 0, 1)  : undefined;
  const activeViewTo    = activeYear != null ? new Date(activeYear, 11, 31) : undefined;

  function goToPrevYear() {
    if (activeYear == null) return;
    const idx = dataYears.indexOf(activeYear);
    if (idx > 0) setSelectedYear(dataYears[idx - 1]);
  }
  function goToNextYear() {
    if (activeYear == null) return;
    const idx = dataYears.indexOf(activeYear);
    if (idx < dataYears.length - 1) setSelectedYear(dataYears[idx + 1]);
  }

  const useVerticalHeatmap = getHeatmapOrientation({ isTentMode, isBookMode, isDesktopSplit }) === "vertical";
  const layoutClass = getLayoutClassName({ hasData, isFolded, formOnRight });

  /** Shared between book mode's below-form nav and tent mode's beside-form nav. */
  const yearNav = (
    <YearNav
      years={dataYears}
      activeYear={activeYear}
      onSelectYear={setSelectedYear}
      onPrevYear={goToPrevYear}
      onNextYear={goToNextYear}
    />
  );

  return (
    <div className="relative">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-zinc-50 dark:bg-zinc-950" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_40%_at_50%_-5%,rgba(147,130,255,0.07),transparent)] dark:bg-[radial-gradient(ellipse_80%_40%_at_50%_-5%,rgba(147,130,255,0.18),transparent)]" />

      <div className={layoutClass}>

        {/* Form panel - hidden in tent mode when data is present (tent bottom replaces it) */}
        {(!isTentMode || !hasData) && <div className="panel-form">
          <header className="flex items-center justify-between mb-6 pt-2">
            <h1 className="text-2xl font-semibold tracking-tight">AI Chat Heatmap</h1>
            <div className="flex items-center gap-2">
              {isBookMode && hasData && (
                <button
                  onClick={() => setFormOnRight(v => !v)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus-visible:ring-violet-400 transition-colors"
                  title={formOnRight ? "Move panel left" : "Move panel right"}
                  aria-label={formOnRight ? "Move panel left" : "Move panel right"}
                >
                  {formOnRight ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
              {mounted && (
                <a
                  href="https://github.com/cr2007/chatgpt-heatmap-web"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open in GitHub"
                  aria-label="Open in GitHub"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-white shadow-sm text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
                >
                  <img
                    aria-hidden
                    src={effectiveTheme === "dark" ? "/github-mark-white.svg" : "/github-mark.svg"}
                    alt=""
                    width={16}
                    height={16}
                    style={{ width: "16px", height: "16px" }}
                  />
                </a>
              )}
              <ModeToggle />
            </div>
          </header>

          <main
            id="main-content"
            tabIndex={-1}
            className="outline-none rounded-2xl border border-zinc-200/80 bg-white/80 backdrop-blur-sm shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/60 p-4"
          >
            <HeatMapForm
              {...formProps}
              compact={!isDesktopSplit && !isFolded}
            />
          </main>

          {isBookMode && hasData && <div className="book-nav">{yearNav}</div>}
        </div>}

        {/* Heatmap panel empty state: visible when folded but no data loaded */}
        {isFolded && !hasData && (
          <div className="panel-heatmap">
            <div className="h-full w-full flex items-center justify-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center px-6">
                Upload an export to see your heatmap
              </p>
            </div>
          </div>
        )}

        {/* Heatmap panel */}
        {hasData && (
          <div className="panel-heatmap animate-fade-slide-up">
            {agg ? (
              <CalendarHeatmap
                data={agg.data}
                dayTitles={agg.dayTitles}
                maxChatgpt={agg.maxChatgpt}
                maxClaude={agg.maxClaude}
                from={(isFolded && activeViewFrom) || agg.from}
                to={(isFolded && activeViewTo) || agg.to}
                vertical={useVerticalHeatmap}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center px-6">
                  No prompts found in this export
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tent mode: bottom panel replaces form panel when landscape+folded */}
        {isTentMode && hasData && (
          <div className="panel-form">
            <div className="tent-bottom">
              <div className="tent-bottom__form">
                <HeatMapForm
                  {...formProps}
                  compact={false}
                />
              </div>
              <div className="tent-bottom__nav">{yearNav}</div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
