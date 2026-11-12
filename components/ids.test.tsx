import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { aggregateDateData } from "@/lib/aggregate";
import { summarize } from "@/lib/stats";
import { AddExport } from "@/components/add-export";
import { CalendarHeatmap } from "@/components/calendar-heatmap";
import { ExportChips } from "@/components/export-chips";
import { HeatLegend } from "@/components/heat-legend";
import { LoadedFiles } from "@/components/loaded-files";
import { Summary } from "@/components/summary";
import { TimeZonePicker } from "@/components/time-zone-picker";
import { YearTabs } from "@/components/year-tabs";

/** Two chats in two years, so the calendar draws more than one year. */
const chats = [
  { title: "a", times: [Date.UTC(2025, 2, 4, 12)] },
  { title: "b", times: [Date.UTC(2026, 0, 9, 12), Date.UTC(2026, 0, 9, 13)] },
];

/**
 * Ids are for citing a part of the page ("#year-tab-2025"), so they must be
 * unique on a screen and readable: lower case words and dashes, no React
 * `useId` colons.
 */
describe("ids on the loaded screen", () => {
  test("are unique and readable", () => {
    const agg = aggregateDateData(chats, chats, "UTC")!;
    const stats = summarize(agg.data)!;
    const loaded = {
      chatgpt: { name: "a.json", count: 2, prompts: 3, files: ["a.json"] },
      claude: { name: "b.json", count: 2, prompts: 3, files: ["b.json"] },
    };
    // The parts that share the wide screen; LoadedFiles stands in for the
    // phone panel's rows, which never show with the chips but must not
    // clash with them either.
    const html = renderToStaticMarkup(
      <>
        <ExportChips loaded={loaded} onClear={() => {}} />
        <AddExport progress={null} onFiles={async () => {}} loaded={[]} />
        <TimeZonePicker id="bar" inline timeZone="UTC" setTimeZone={() => {}} />
        <LoadedFiles loaded={loaded} onClear={() => {}} />
        <Summary stats={stats} year={null} timeZone="UTC" />
        <YearTabs
          years={agg.years}
          totals={[1, 2]}
          view="all"
          onView={() => {}}
        />
        <HeatLegend edges={agg.edges} providers={["chatgpt", "claude"]} />
        <CalendarHeatmap
          id="calendar"
          data={agg.data}
          dayTitles={agg.dayTitles}
          edges={agg.edges}
          from={agg.from}
          to={agg.to}
        />
      </>,
    );
    // Gradient ids inside the SVG come from useId on purpose (internal refs).
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((id) => !/g\d{4}-\d{2}-\d{2}$/.test(id));
    expect(ids.length).toBeGreaterThan(20);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
    expect(ids.filter((id) => !/^[a-z][a-z0-9-]*$/.test(id))).toEqual([]);
  });
});
