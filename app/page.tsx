import { useEffect, useMemo, useState } from "react";
import { HeatMapForm } from "@/components/heatMapForm";
import { CalendarHeatmap } from "@/components/calendar-heatmap";
import { SiteLinks } from "@/components/site-links";
import { Welcome } from "@/components/welcome";
import { Summary } from "@/components/summary";
import { YearTabs, type YearView } from "@/components/year-tabs";
import { HeatLegend } from "@/components/heat-legend";
import { summarize } from "@/lib/stats";
import { YearNav } from "@/components/year-nav";
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
import type { Exports as PartialExports } from "@/lib/upload";
import type { Provider } from "@/lib/types";
import { SYSTEM_ZONE } from "@/lib/time-zones";
import { loadTestData, type Exports } from "@/app/dev-data";

/** Stable empty year list, so effects keyed on it do not rerun. */
const NO_YEARS: number[] = [];

/** The view in the address (#all or #2025), so a view can be shared and kept. */
function readView(): YearView | null {
  const h = location.hash.slice(1);
  return h === "all" ? "all" : /^\d{4}$/.test(h) ? Number(h) : null;
}

/**
 * Root page: owns the loaded exports, an upload in progress, the time zone
 * and the year picker, and picks the layout (plain stack, desktop split,
 * book or tent).
 *
 * Step 1: Hold the state: exports, the streaming partial, the time zone and
 *         the sweep counter, the panel side and the picked year.
 * Step 2: Aggregate the exports; while an upload streams, its partial
 *         result stands in for its provider, so the heatmap fills in.
 * Step 3: Wire the form: a new upload clears the sweep, a time zone change
 *         starts one.
 * Step 4: Pick the year to show, the heatmap orientation and the layout class.
 * Step 5: Render the welcome screen while nothing is loaded (outside the
 *         fold layouts), else the form panel, the heatmap panel and the
 *         fold navigation.
 */
export default function Home() {
  // Step 1
  const [exports, setExports] = useState<Exports>(loadTestData);
  /** What an upload in progress has read so far; null when idle. */
  const [streaming, setStreaming] = useState<PartialExports | null>(null);
  /** Counts time zone changes since the last upload; each one runs the heatmap sweep. */
  const [sweep, setSweep] = useState(0);
  const [timeZone, setTimeZone] = useState(SYSTEM_ZONE);
  /** Book mode only: swaps which side the form sits on. Persisted. */
  const [formOnRight, setFormOnRight] = useState(() => {
    try {
      return localStorage.getItem("form-on-right") === "true";
    } catch {
      return false;
    }
  });
  /** Year the user picked in book/tent mode; null means the latest year. */
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  /** The view picked with the year tabs; null means the default for the layout. */
  const [picked, setPicked] = useState<YearView | null>(readView);

  const isBookMode = useMediaQuery(FOLDED_PORTRAIT_QUERY);
  const isTentMode = useMediaQuery(FOLDED_LANDSCAPE_QUERY);
  const isDesktopSplit = useMediaQuery(DESKTOP_SPLIT_QUERY);

  // Step 2
  const agg = useMemo(() => {
    const shown = { ...exports, ...streaming };
    return aggregateDateData(
      shown.chatgpt?.chats ?? null,
      shown.claude?.chats ?? null,
      timeZone,
    );
  }, [exports, streaming, timeZone]);
  const dataYears = agg?.years ?? NO_YEARS;
  const allStats = useMemo(() => agg && summarize(agg.data), [agg]);
  const yearTotals = useMemo(
    () => dataYears.map((y) => (agg && summarize(agg.data, y)?.total) || 0),
    [agg, dataYears],
  );

  // Persist the book-mode panel-swap preference.
  useEffect(() => {
    try {
      localStorage.setItem("form-on-right", String(formOnRight));
    } catch {}
  }, [formOnRight]);

  const hasData =
    exports.chatgpt !== null || exports.claude !== null || agg !== null;
  const isFolded = isBookMode || isTentMode;

  /** Adds new exports, keeping a provider the upload did not include. */
  const loadExports = (next: Partial<Exports>) =>
    setExports((prev) => ({ ...prev, ...next }));
  const clearExport = (provider: Provider) =>
    setExports((prev) => ({ ...prev, [provider]: null }));

  // Step 3: props shared by the sidebar form and tent mode's bottom-bar form.
  const formProps = {
    loaded: {
      chatgpt: exports.chatgpt && {
        name: exports.chatgpt.name,
        count: exports.chatgpt.chats.length,
      },
      claude: exports.claude && {
        name: exports.claude.name,
        count: exports.claude.chats.length,
      },
    },
    onLoad: loadExports,
    onStream: (partial: PartialExports | null) => {
      setStreaming(partial);
      if (partial) setSweep(0); // new data fades in, without the sweep
    },
    onClear: clearExport,
    timeZone,
    setTimeZone: (tz: string) => {
      if (tz === timeZone) return;
      setTimeZone(tz);
      setSweep((n) => n + 1);
    },
  };

  // Step 4: a picked year that the data no longer has falls back to the latest year.
  const activeYear =
    selectedYear !== null && dataYears.includes(selectedYear)
      ? selectedYear
      : (dataYears[dataYears.length - 1] ?? null);
  const activeViewFrom =
    activeYear != null ? new Date(activeYear, 0, 1) : undefined;
  const activeViewTo =
    activeYear != null ? new Date(activeYear, 11, 31) : undefined;

  /** Moves the picked year by `delta` places in the data's years, within bounds. */
  function stepYear(delta: number) {
    if (activeYear == null) return;
    const next = dataYears[dataYears.indexOf(activeYear) + delta];
    if (next !== undefined) setSelectedYear(next);
  }

  // Year tabs (outside the fold layouts): the desktop split shows every
  // year by default; the phone column shows the latest year, which reads
  // better than narrow year columns side by side.
  const view: YearView =
    picked === "all"
      ? dataYears.length > 1
        ? "all"
        : (dataYears[0] ?? "all")
      : picked !== null && dataYears.includes(picked)
        ? picked
        : isDesktopSplit && dataYears.length > 1
          ? "all"
          : (dataYears[dataYears.length - 1] ?? "all");
  const viewStats = useMemo(
    () => agg && (view === "all" ? allStats : summarize(agg.data, view)),
    [agg, allStats, view],
  );
  /** Picks a view and keeps it in the address. */
  function pickView(next: YearView) {
    setPicked(next);
    history.replaceState(null, "", `#${next}`);
  }

  const useVerticalHeatmap =
    getHeatmapOrientation({ isTentMode, isBookMode, isDesktopSplit }) ===
    "vertical";
  const layoutClass = getLayoutClassName({ hasData, isFolded, formOnRight });

  /** Shared between book mode's below-form nav and tent mode's beside-form nav. */
  const yearNav = (
    <YearNav
      years={dataYears}
      activeYear={activeYear}
      onSelectYear={setSelectedYear}
      onPrevYear={() => stepYear(-1)}
      onNextYear={() => stepYear(1)}
    />
  );

  // Step 5
  return (
    <div className="relative">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-zinc-50 dark:bg-zinc-950" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_40%_at_50%_-5%,rgba(147,130,255,0.07),transparent)] dark:bg-[radial-gradient(ellipse_80%_40%_at_50%_-5%,rgba(147,130,255,0.18),transparent)]" />

      {!hasData && !isFolded ? (
        <Welcome
          onLoad={formProps.onLoad}
          onStream={formProps.onStream}
          timeZone={timeZone}
          setTimeZone={formProps.setTimeZone}
        />
      ) : (
        <div className={layoutClass}>
          {/* Form panel - hidden in tent mode when data is present (tent bottom replaces it) */}
          {(!isTentMode || !hasData) && (
            <div className="panel-form">
              <header className="flex items-center justify-between mb-6 pt-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  AI Chat Heatmap
                </h1>
                <div className="flex items-center gap-2">
                  {isBookMode && hasData && (
                    <button
                      onClick={() => setFormOnRight((v) => !v)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus-visible:ring-violet-400 transition-colors"
                      title={
                        formOnRight ? "Move panel left" : "Move panel right"
                      }
                      aria-label={
                        formOnRight ? "Move panel left" : "Move panel right"
                      }
                    >
                      {formOnRight ? (
                        <ChevronLeft size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </button>
                  )}
                  <SiteLinks />
                </div>
              </header>

              <main
                id="main-content"
                tabIndex={-1}
                className="outline-hidden rounded-2xl border border-zinc-200/80 bg-white/80 backdrop-blur-xs shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/60 p-4"
              >
                <HeatMapForm
                  {...formProps}
                  compact={!isDesktopSplit && !isFolded}
                />
              </main>

              {isBookMode && hasData && (
                <div className="book-nav">{yearNav}</div>
              )}
            </div>
          )}

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
            <div
              className="panel-heatmap animate-fade-slide-up"
              aria-busy={streaming !== null}
            >
              {agg && isFolded ? (
                <CalendarHeatmap
                  data={agg.data}
                  dayTitles={agg.dayTitles}
                  edges={agg.edges}
                  from={activeViewFrom || agg.from}
                  to={activeViewTo || agg.to}
                  firstDay={allStats?.span.from}
                  lastDay={allStats?.span.to}
                  vertical={useVerticalHeatmap}
                  fixedHeight
                  sweep={sweep}
                />
              ) : agg && viewStats && allStats ? (
                <div className="mx-auto flex w-full max-w-[60rem] flex-col gap-5">
                  <Summary
                    stats={viewStats}
                    year={view === "all" ? null : view}
                    timeZone={timeZone}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <YearTabs
                      years={dataYears}
                      totals={yearTotals}
                      view={view}
                      onView={pickView}
                    />
                    <HeatLegend
                      edges={agg.edges}
                      providers={[
                        ...(allStats.chatgpt ? (["chatgpt"] as const) : []),
                        ...(allStats.claude ? (["claude"] as const) : []),
                      ]}
                    />
                  </div>
                  <CalendarHeatmap
                    data={agg.data}
                    dayTitles={agg.dayTitles}
                    edges={agg.edges}
                    from={view === "all" ? agg.from : new Date(view, 0, 1)}
                    to={view === "all" ? agg.to : new Date(view, 11, 31)}
                    firstDay={allStats.span.from}
                    lastDay={allStats.span.to}
                    vertical={useVerticalHeatmap}
                    maxScale={
                      useVerticalHeatmap ? (view === "all" ? 1 : 1.6) : 1.3
                    }
                    sweep={sweep}
                  />
                </div>
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
                  <HeatMapForm {...formProps} compact={false} />
                </div>
                <div className="tent-bottom__nav">{yearNav}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
