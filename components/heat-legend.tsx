import type { Edges } from "@/lib/calendar-geometry";
import { PROVIDERS } from "@/lib/providers";
import type { Provider } from "@/lib/types";

/** "1 to 3 prompts" for each of the 4 levels of a provider. */
function ranges([a, b, c]: Edges): string[] {
  const span = (lo: number, hi: number) =>
    lo >= hi ? `${hi} prompts` : `${lo} to ${hi} prompts`;
  return [span(1, a), span(a + 1, b), span(b + 1, c), `${c + 1} or more`];
}

/** A small square in the calendar's own shade classes. */
function Swatch({ className, title }: { className: string; title?: string }) {
  return (
    <svg width="10" height="10" aria-hidden="true" className="shrink-0">
      {title && <title>{title}</title>}
      <rect x="0.5" y="0.5" width="9" height="9" rx="2" className={className} />
    </svg>
  );
}

/**
 * What the colors mean: 4 shades per provider (hover a shade for its range
 * of prompts a day), split days, and days outside the export.
 */
export function HeatLegend({
  edges,
  providers,
}: {
  edges: Record<Provider, Edges>;
  /** Providers with prompts; only they get a scale. */
  providers: Provider[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
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
          <svg width="10" height="10" aria-hidden="true" className="shrink-0">
            <rect x="0.5" y="0.5" width="4.5" height="9" className="lv-g3" />
            <rect x="5" y="0.5" width="4.5" height="9" className="lv-o3" />
          </svg>
          Both
        </span>
      )}
      <span className="flex items-center gap-1">
        <Swatch className="lv-out" />
        Outside the export
      </span>
      <span>Stronger shades mean more prompts</span>
    </div>
  );
}
