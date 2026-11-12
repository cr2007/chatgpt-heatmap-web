import type { Edges } from "@/lib/calendar-geometry";
import { PROVIDERS } from "@/lib/providers";
import type { Provider } from "@/lib/types";
import { count, plural } from "@/lib/utils";

/**
 * Names the prompt range of each of the 4 shade levels, for the legend tooltips.
 *
 * A level that no day can have (equal edges) says "no days".
 *
 * @param edges - the top prompt count of levels 1, 2 and 3 ({@link Edges})
 * @returns 4 labels such as "1 to 3 prompts", level 1 first
 * @see {@link HeatLegend}
 */
export function ranges([a, b, c]: Edges): string[] {
  const span = (lo: number, hi: number) =>
    lo > hi
      ? "no days"
      : lo === hi
        ? plural(hi, "prompt")
        : `${count(lo)} to ${plural(hi, "prompt")}`;
  return [
    span(1, a),
    span(a + 1, b),
    span(b + 1, c),
    `${count(c + 1)} or more`,
  ];
}

/**
 * A small square in the calendar's own shade classes.
 *
 * It is sized in em (10 px at 12 px text), so it grows with the text on wide
 * screens.
 */
function Swatch({
  className,
  title,
  id,
}: {
  /** The shade class of the square, such as `lv-g3`. */
  className: string;
  /** The tooltip, for example the level's prompt range. */
  title?: string;
  /** The id of the SVG, for a swatch that the page cites. */
  id?: string;
}) {
  return (
    <svg
      id={id}
      viewBox="0 0 10 10"
      aria-hidden="true"
      className="size-[0.8333em] shrink-0"
    >
      {title && <title>{title}</title>}
      <rect x="0.5" y="0.5" width="9" height="9" rx="2" className={className} />
    </svg>
  );
}

/**
 * Shows what the colors mean: 4 shades per provider, split days, and days
 * outside the export.
 *
 * Hover a shade for its range of prompts a day.
 *
 * @see {@link ranges}
 * @see app/globals.css for the shade colors (`--g1` to `--o4`)
 */
export function HeatLegend({
  edges,
  providers,
}: {
  /** The level edges of each provider, from `quartiles`. */
  edges: Record<Provider, Edges>;
  /** Providers with prompts; only they get a scale. */
  providers: Provider[];
}) {
  return (
    <div
      id="heat-legend"
      className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-500 dark:text-zinc-400"
    >
      {PROVIDERS.filter((p) => providers.includes(p.key)).map((p) => {
        const r = ranges(edges[p.key]);
        return (
          <span
            key={p.key}
            className="flex items-center gap-1"
            title={`${p.label}: ${r.join(", ")} a day`}
          >
            <span className="mr-0.5">{p.label}</span>
            {[1, 2, 3, 4].map((l) => (
              <Swatch key={l} className={`lv-${p.ramp}${l}`} title={r[l - 1]} />
            ))}
          </span>
        );
      })}
      {providers.length > 1 && (
        <span className="flex items-center gap-1">
          <svg
            viewBox="0 0 10 10"
            aria-hidden="true"
            className="size-[0.8333em] shrink-0"
          >
            <rect x="0.5" y="0.5" width="4.5" height="9" className="lv-g3" />
            <rect x="5" y="0.5" width="4.5" height="9" className="lv-o3" />
          </svg>
          Both
        </span>
      )}
      <span className="flex items-center gap-1">
        {/* A stronger outline than the calendar's hollow days (app/globals.css). */}
        <Swatch id="heat-legend-outside" className="lv-out" />
        Outside the export
      </span>
      <span>Stronger shades mean more prompts</span>
    </div>
  );
}
