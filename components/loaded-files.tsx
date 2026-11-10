import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROVIDERS } from "@/lib/providers";
import type { Provider } from "@/lib/types";

export interface LoadedInfo {
  name: string;
  count: number;
}

/** One badge per loaded provider, each with a remove button. */
export function LoadedFiles({
  loaded,
  onClear,
}: {
  loaded: Record<Provider, LoadedInfo | null>;
  onClear: (provider: Provider) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {PROVIDERS.map((p) => {
        const info = loaded[p.key];
        if (!info) return null;
        return (
          <div
            key={p.key}
            className={cn(
              "flex items-center justify-between rounded-lg border px-3 py-2 text-xs",
              p.border,
              p.bg,
            )}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span
                className={cn("h-1.5 w-1.5 rounded-full shrink-0", p.dot)}
              />
              <span className={cn("font-medium shrink-0", p.text)}>
                {p.label}
              </span>
              <span className="text-zinc-600 dark:text-zinc-400 truncate">
                {info.name} ({info.count} conversations)
              </span>
            </span>
            <button
              onClick={() => onClear(p.key)}
              className="ml-2 shrink-0 h-6 w-6 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-700 transition-colors"
              aria-label={`Remove ${p.label} file`}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
