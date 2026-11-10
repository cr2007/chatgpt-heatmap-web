import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROVIDERS } from "@/lib/providers";

/** The "How to export" block: tap cards when cramped, plain cards otherwise. */
export function ExportSteps() {
  return (
    <div className="form-grid__info flex flex-col gap-2">
      <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
        How to export
      </p>

      {/* Cramped panels (book mode, narrow windows): tap a card to reveal its steps. */}
      <div className="form-grid__info-compact flex flex-col gap-2">
        {PROVIDERS.map((p) => (
          <details
            key={p.key}
            className={cn(
              "group rounded-lg border px-3 py-2 text-xs",
              p.border,
              p.bg,
            )}
          >
            <summary
              className={cn(
                "flex cursor-pointer list-none items-center justify-between font-medium [&::-webkit-details-marker]:hidden",
                p.text,
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn("h-1.5 w-1.5 rounded-full shrink-0", p.dot)}
                />
                {p.label}
              </span>
              <ChevronDown
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="mt-1.5 text-zinc-600 dark:text-zinc-400">{p.steps}</p>
          </details>
        ))}
      </div>

      {/* Room to spare (normal desktop): show the steps plainly, same colours. */}
      <div className="form-grid__info-expanded flex flex-col gap-2">
        {PROVIDERS.map((p) => (
          <div
            key={p.key}
            className={cn(
              "rounded-lg border px-3 py-2 text-xs",
              p.border,
              p.bg,
            )}
          >
            <p className={cn("flex items-center gap-2 font-medium", p.text)}>
              <span
                className={cn("h-1.5 w-1.5 rounded-full shrink-0", p.dot)}
              />
              {p.label}
            </p>
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">{p.steps}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
