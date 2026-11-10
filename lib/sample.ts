import { quartiles } from "./calendar-geometry";
import type { CalHeatmapDay } from "./types";

/** A small seeded random generator (mulberry32), so the example looks the same on every visit. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The example year on the welcome screen: made-up counts for 2025, busier
 * on weekdays, with Claude growing through the year. It is not anyone's data.
 */
export function sampleYear() {
  const rnd = seeded(2025);
  const data: Record<string, CalHeatmapDay> = {};
  for (let d = Date.UTC(2025, 0, 1); d <= Date.UTC(2025, 11, 31); d += 864e5) {
    const date = new Date(d);
    const weekday = date.getUTCDay() % 6 !== 0;
    const year = (d - Date.UTC(2025, 0, 1)) / (365 * 864e5);
    const draw = (chance: number, size: number) =>
      rnd() < chance ? 1 + Math.floor(rnd() ** 2 * size) : 0;
    const chatgpt = draw(weekday ? 0.7 : 0.35, 14);
    const claude = draw((weekday ? 0.25 : 0.1) + year * 0.45, 12);
    if (chatgpt + claude)
      data[date.toISOString().slice(0, 10)] = { chatgpt, claude };
  }
  const days = Object.values(data);
  return {
    data,
    edges: {
      chatgpt: quartiles(days.map((c) => c.chatgpt)),
      claude: quartiles(days.map((c) => c.claude)),
    },
  };
}
