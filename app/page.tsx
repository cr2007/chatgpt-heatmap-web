import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, FlaskConical } from "lucide-react";
import { AddExport } from "@/components/add-export";
import { AppBar } from "@/components/app-bar";
import { CalendarHeatmap } from "@/components/calendar-heatmap";
import { DayPane } from "@/components/day-details";
import { ExportChips } from "@/components/export-chips";
import { ExportPanel } from "@/components/export-panel";
import { FoldLayout } from "@/components/fold-layout";
import { HeatLegend } from "@/components/heat-legend";
import { PageDrop } from "@/components/page-drop";
import { Summary } from "@/components/summary";
import { TimeZonePicker } from "@/components/time-zone-picker";
import { Welcome } from "@/components/welcome";
import { YearTabs, type How as YearTabsHow } from "@/components/year-tabs";
import { keepInPlace, prepareMorph } from "@/components/calendar-morph";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useUpload } from "@/hooks/use-upload";
import { useFoldPosture } from "@/hooks/use-fold-posture";
import { aggregateDateData } from "@/lib/aggregate";
import {
  DESKTOP_QUERY,
  EXPANDED_QUERY,
  MEDIUM_QUERY,
  WIDE_BAR_QUERY,
  getHeatmapOrientation,
  pickYearView,
  type YearView,
} from "@/lib/layout";
import { summarize } from "@/lib/stats";
import { SYSTEM_ZONE } from "@/lib/time-zones";
import type { LoadedExport, Provider } from "@/lib/types";
import type { Exports as PartialExports } from "@/lib/upload";
import { loadTestData, type Exports } from "@/app/dev-data";

/** Stable empty year list, so effects keyed on it do not rerun. */
const NO_YEARS: number[] = [];
/** Shortest time in ms between two partial results drawn while files stream
 *  in. Each one counts every prompt read so far again, so a shorter gap makes
 *  a large upload slower; the progress line still moves every 200 ms. */
const STREAM_EVERY = 1000;
/**
 * Shows a loaded export as the bar shows it.
 *
 * @param e - The export, or null for none.
 * @returns The name, the files, the chat count and the prompt count (the
 *   heatmap's count); null for no export.
 */
const info = (e: LoadedExport | null) =>
  e && {
    name: e.name,
    files: e.files,
    count: e.chats.length,
    prompts: e.chats.reduce((n, c) => n + c.times.length, 0),
  };
/** localStorage key: book posture with the controls on the right. */
const SWAP_KEY = "fold-swap";

/**
 * Clears a view hash (#all, #2025) from the address.
 *
 * @remarks
 * An older version kept the view in the address. The view is no longer
 * kept, so every visit starts on "All years". Other hashes (the skip
 * link's) stay.
 */
function clearOldViewHash() {
  if (/^#(all|\d{4})$/.test(location.hash))
    history.replaceState(null, "", location.pathname + location.search);
}

/**
 * Shows the root page.
 *
 * @remarks
 * It owns the loaded exports, an upload in progress, the time zone, the year
 * view and the picked day, and arranges the screen for the window and the
 * foldable posture. A file dragged anywhere over a loaded page shows one
 * drop target.
 *
 * @returns The welcome screen, or the loaded screen for one screen or a
 *   half-open foldable.
 */
export default function Home() {
  // Step 1: Hold the state. All that a fold or an unfold must keep (the view,
  // the time zone, the picked day) lives here, so a posture change keeps it.
  const [exports, setExports] = useState<Exports>(loadTestData);
  /** What an upload in progress has read so far; null when idle. */
  const [streaming, setStreaming] = useState<PartialExports | null>(null);
  /** When the last partial result was drawn (performance.now() ms); 0 after an upload. */
  const lastStream = useRef(0);
  /** Files are going into the welcome screen's post box: keep that screen
   *  until its flap is shut, and draw no partial result meanwhile. */
  const [posting, setPosting] = useState(false);
  /** Counts time zone changes since the last upload; each one runs the heatmap sweep. */
  const [sweep, setSweep] = useState(0);
  const [timeZone, setTimeZone] = useState(SYSTEM_ZONE);
  /** The view picked with the year tabs; null means the start view, "All years". */
  const [picked, setPicked] = useState<YearView | null>(() => {
    clearOldViewHash();
    return null;
  });
  /** The phone's export panel is open (kept across a fold). */
  const [panelOpen, setPanelOpen] = useState(false);
  /** The day in the day pane (half-open foldables). */
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  /** Book posture: the controls on the right. Kept across visits. */
  const [swapped, setSwapped] = useState(() => {
    try {
      // "form-on-right" is the key before the fold panes.
      const saved =
        localStorage.getItem(SWAP_KEY) ?? localStorage.getItem("form-on-right");
      return saved === "true";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(SWAP_KEY, String(swapped));
    } catch {}
  }, [swapped]);

  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const isExpanded = useMediaQuery(EXPANDED_QUERY);
  const isMedium = useMediaQuery(MEDIUM_QUERY);
  const posture = useFoldPosture();
  // A fold pane is half the window: the full bar needs the whole width.
  /** The exports whose chips did not fit in the wide bar; new exports try again. */
  const [tooLong, setTooLong] = useState<Exports | null>(null);
  const isWideBar =
    useMediaQuery(WIDE_BAR_QUERY) && tooLong !== exports && !posture;

  // Step 2: Aggregate the exports; a streaming upload's partial result stands in.
  // While files go into the post box, the welcome screen shows: skip the partials.
  const live = posting ? null : streaming;
  const agg = useMemo(() => {
    const shown = { ...exports, ...live };
    return aggregateDateData(
      shown.chatgpt?.chats ?? null,
      shown.claude?.chats ?? null,
      timeZone,
    );
  }, [exports, live, timeZone]);
  const dataYears = agg?.years ?? NO_YEARS;
  const allStats = useMemo(() => agg && summarize(agg.data), [agg]);
  const yearTotals = useMemo(
    () => dataYears.map((y) => (agg && summarize(agg.data, y)?.total) || 0),
    [agg, dataYears],
  );
  const view = pickYearView(picked, dataYears);
  const viewStats = useMemo(
    () => agg && (view === "all" ? allStats : summarize(agg.data, view)),
    [agg, allStats, view],
  );
  /** What the bar shows of each export; counted once per upload, not per render. */
  const loaded = useMemo(
    () => ({ chatgpt: info(exports.chatgpt), claude: info(exports.claude) }),
    [exports],
  );
  // While the wide bar shows, watch its tools; when they overflow (they would
  // run under the links), keep the narrow bar for these exports. A wider
  // window does not help: the bar is at its width limit (WIDE_BAR_QUERY).
  useLayoutEffect(() => {
    const tools = isWideBar && document.getElementById("app-bar-tools");
    if (!tools) return;
    const ro = new ResizeObserver(() => {
      if (tools.scrollWidth > tools.clientWidth) setTooLong(exports);
    });
    ro.observe(tools);
    for (const part of tools.children) ro.observe(part);
    return () => ro.disconnect();
  }, [isWideBar, exports]);

  /**
   * Adds new exports, keeping a provider the upload did not include.
   *
   * @param next - The exports of the upload.
   */
  const loadExports = (next: Partial<Exports>) =>
    setExports((prev) => ({ ...prev, ...next }));
  /**
   * Removes the export of one provider.
   *
   * @param provider - "chatgpt" or "claude".
   */
  const clearExport = (provider: Provider) =>
    setExports((prev) => ({ ...prev, [provider]: null }));
  /**
   * Takes a streaming upload's partial result; new data fades in, without
   * the sweep.
   *
   * @param partial - What the upload read so far, or null when it ended.
   */
  const onStream = (partial: PartialExports | null) => {
    const now = performance.now();
    if (partial && now - lastStream.current < STREAM_EVERY) return;
    lastStream.current = partial ? now : 0;
    setStreaming(partial);
    if (partial) setSweep(0);
  };
  /**
   * Sets the time zone; a new zone runs the sweep over the calendar.
   *
   * @param tz - The IANA zone name.
   */
  const changeTimeZone = (tz: string) => {
    if (tz === timeZone) return;
    setTimeZone(tz);
    setSweep((n) => n + 1);
  };
  /**
   * Picks a view.
   *
   * @remarks
   * Between two single years the calendar waves to it, to or from "All
   * years" it morphs; after a keyboard pick nothing moves (no motion on a
   * keyboard action), but a running wave still stops.
   *
   * @param next - The year, or "all".
   * @param how - How the tab was picked; "key" for the keyboard.
   * @see {@link prepareMorph}
   * @see {@link keepInPlace}
   */
  function pickView(next: YearView, how: YearTabsHow) {
    if (next === view) return;
    const svg = document.querySelector<SVGSVGElement>("#calendar svg");
    const dir =
      view !== "all" && next !== "all" ? (next > view ? 1 : -1) : undefined;
    // The calendar stays where it is on screen, whatever changes above it.
    keepInPlace(svg);
    prepareMorph(how === "key" ? null : svg, dir);
    setPicked(next);
  }
  const upload = useUpload({ onLoad: loadExports, onStream });

  const background = (
    <>
      <div className="pointer-events-none fixed inset-0 -z-10 bg-zinc-50 dark:bg-zinc-950" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_40%_at_50%_-5%,color-mix(in_oklab,var(--color-accent)_7%,transparent),transparent)] dark:bg-[radial-gradient(ellipse_80%_40%_at_50%_-5%,color-mix(in_oklab,var(--color-accent)_18%,transparent),transparent)]" />
    </>
  );

  // Step 4.1: Nothing loaded, or files still going into the post box: the welcome screen.
  const hasData =
    exports.chatgpt !== null || exports.claude !== null || agg !== null;
  const welcome = (!hasData || posting) && (
    <div className="relative">
      {background}
      <Welcome
        upload={upload}
        timeZone={timeZone}
        setTimeZone={changeTimeZone}
        fold={posture}
        onPosting={setPosting}
      />
    </div>
  );
  // Dev only: a button that opens the test-data page. The build defines
  // NODE_ENV as "production", so the bundler drops it (AGENTS.md, Toolchain).
  const devTools = process.env.NODE_ENV !== "production" && (
    <a
      id="dev-test-data"
      href="/test.html"
      title="Dev only: load synthetic test data"
      className="fixed bottom-3 left-3 z-40 inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed border-zinc-300 bg-white/90 px-3 text-xs font-medium text-zinc-700 shadow-sm backdrop-blur-sm transition-[background-color,scale] duration-(--dur-micro) ease-out hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-hidden active:scale-[0.97] print:hidden dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      <FlaskConical aria-hidden="true" className="size-3.5" />
      Test data
    </a>
  );
  if (!hasData)
    return (
      <>
        {welcome}
        {devTools}
      </>
    );

  // Step 3: Build the parts once: the top bar, the figures, the year tabs and
  // the legend, the calendar.
  const bar = (
    <AppBar
      progress={upload.progress}
      uploads={upload.uploads}
      below={
        !isWideBar && (
          <ExportPanel
            loaded={loaded}
            onClear={clearExport}
            progress={upload.progress}
            onFiles={upload.processFiles}
            timeZone={timeZone}
            setTimeZone={changeTimeZone}
            open={panelOpen}
            onOpen={setPanelOpen}
          />
        )
      }
    >
      {isWideBar && (
        <>
          <ExportChips loaded={loaded} onClear={clearExport} />
          <AddExport
            progress={upload.progress}
            onFiles={upload.processFiles}
            loaded={(["chatgpt", "claude"] as const).filter((p) => loaded[p])}
          />
          <div className="ml-auto flex min-w-0">
            <TimeZonePicker
              id="bar"
              compact
              timeZone={timeZone}
              setTimeZone={changeTimeZone}
            />
          </div>
        </>
      )}
      {posture === "book" && (
        <button
          type="button"
          id="swap-sides"
          onClick={() => setSwapped((v) => !v)}
          aria-label="Swap the screen halves"
          title="Swap the screen halves"
          className="ml-auto inline-grid size-9 shrink-0 place-items-center rounded-md text-zinc-500 transition-[background-color,color,scale] duration-(--dur-micro) ease-out hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-hidden active:scale-[0.94] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
        >
          <ArrowLeftRight aria-hidden="true" className="size-4" />
        </button>
      )}
    </AppBar>
  );
  const ready = agg && viewStats && allStats;
  const vertical =
    getHeatmapOrientation({
      posture,
      isWide: isDesktop || isExpanded,
      isMedium,
    }) === "vertical";
  const figures = ready && (
    <Summary
      stats={viewStats}
      year={view === "all" ? null : view}
      timeZone={timeZone}
    />
  );
  const controls = ready && (
    <div
      id="calendar-controls"
      className="flex flex-wrap items-center justify-between gap-3"
    >
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
  );
  const calendar = ready && (
    <CalendarHeatmap
      id="calendar"
      data={agg.data}
      dayTitles={agg.dayTitles}
      edges={agg.edges}
      from={view === "all" ? agg.from : new Date(view, 0, 1)}
      to={view === "all" ? agg.to : new Date(view, 11, 31)}
      firstDay={allStats.span.from}
      lastDay={allStats.span.to}
      vertical={vertical}
      maxScale={vertical ? 1.6 : 1.3}
      fixedHeight={posture === "tent" && !vertical}
      sweep={sweep}
      pane={posture && { id: "day-pane", onPick: setPickedDay }}
    />
  );
  const empty = (
    <p className="py-24 text-center text-sm text-zinc-500 dark:text-zinc-400">
      {loaded.chatgpt && loaded.claude
        ? "These exports have"
        : "This export has"}{" "}
      no prompts with a date, so there is nothing to draw.
    </p>
  );
  const drop = (
    <PageDrop
      progress={upload.progress}
      uploads={upload.uploads}
      onFiles={upload.processFiles}
    />
  );

  // Step 4.2: A half-open foldable: the bar, the figures, the tabs and the day
  // pane on one screen half, the calendar on the other.
  const screen = posture ? (
    <div className="relative">
      {background}
      <FoldLayout
        posture={posture}
        swap={swapped}
        controls={
          <>
            {bar}
            <main
              id="main-content"
              tabIndex={-1}
              aria-busy={streaming !== null}
              className="flex flex-col gap-5 px-5 pt-6 pb-8 outline-hidden"
            >
              {ready ? (
                <>
                  {figures}
                  {controls}
                  <DayPane
                    id="day-pane"
                    day={
                      pickedDay && agg.data[pickedDay]
                        ? {
                            day: pickedDay,
                            counts: agg.data[pickedDay],
                            chats: agg.dayTitles[pickedDay],
                          }
                        : null
                    }
                  />
                </>
              ) : (
                empty
              )}
            </main>
          </>
        }
        content={
          <section
            id="calendar-section"
            aria-labelledby="calendar-title"
            className="h-full p-4"
          >
            <h2 id="calendar-title" className="sr-only">
              Prompts per day
            </h2>
            {calendar}
          </section>
        }
      />
      {drop}
    </div>
  ) : (
    // Step 4.3: Otherwise: the bar, then the figures, the tabs and the calendar at full width.
    <div className="relative min-h-dvh">
      {background}
      {bar}
      <main
        id="main-content"
        tabIndex={-1}
        aria-busy={streaming !== null}
        className="mx-auto flex w-full max-w-6xl animate-fade-slide-up flex-col gap-5 px-5 pt-8 pb-16 outline-hidden sm:px-8"
      >
        {ready ? (
          <>
            {figures}
            <section
              id="calendar-section"
              aria-labelledby="calendar-title"
              className="flex flex-col gap-5"
            >
              <h2 id="calendar-title" className="sr-only">
                Prompts per day
              </h2>
              {controls}
              {calendar}
            </section>
          </>
        ) : (
          empty
        )}
      </main>
      {drop}
    </div>
  );
  // Step 4.4: While the flap shuts, draw the loaded screen hidden, so it shows at
  // once. Both keep their place in the tree, so neither is drawn again.
  return (
    <>
      {welcome}
      <div
        className={
          posting ? "invisible fixed inset-0 overflow-hidden" : "contents"
        }
        inert={posting}
      >
        {screen}
      </div>
      {devTools}
    </>
  );
}
