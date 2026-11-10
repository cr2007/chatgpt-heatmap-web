import { X } from "lucide-react";
import { cn, plural, splitName } from "@/lib/utils";
import { PROVIDERS } from "@/lib/providers";
import type { Provider } from "@/lib/types";

export interface LoadedInfo {
  name: string;
  count: number;
}

/**
 * One row per loaded provider: the provider and its conversation count, the
 * file name under them, and a remove button. A long name is cut in the
 * middle, so the count and the extension always stay visible.
 */
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
        const [head, tail] = splitName(info.name);
        return (
          <div
            key={p.key}
            className={cn(
              "flex items-center gap-2 rounded-lg border py-2 pr-1.5 pl-3 text-xs",
              p.border,
              p.bg,
            )}
          >
            <span
              className={cn(
                "size-1.5 shrink-0 self-start mt-1.5 rounded-full",
                p.dot,
              )}
            />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-baseline justify-between gap-2">
                <span className={cn("font-medium", p.text)}>{p.label}</span>
                <span className="shrink-0 text-zinc-600 dark:text-zinc-400">
                  {plural(info.count, "conversation")}
                </span>
              </span>
              <span
                className="flex min-w-0 text-zinc-500 dark:text-zinc-400"
                title={info.name}
              >
                <span className="truncate whitespace-pre">{head}</span>
                <span className="shrink-0 whitespace-pre">{tail}</span>
              </span>
            </span>
            <button
              type="button"
              onClick={() => onClear(p.key)}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-50 dark:focus-visible:ring-violet-400"
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
