import { X } from "lucide-react";
import { cn, plural, splitName } from "@/lib/utils";
import { PROVIDERS } from "@/lib/providers";
import type { Provider } from "@/lib/types";

/** A loaded export of one provider, as the file list shows it. */
export interface LoadedInfo {
  /** The file name to show. */
  name: string;
  /** Chats in the export. */
  count: number;
  /** Prompts that count on the heatmap (the README count rule). */
  prompts: number;
  /** Every file in the export, in upload order. */
  files: string[];
}

/**
 * Lists the loaded exports, one row per provider, each with a remove button.
 *
 * @remarks
 * A row shows the provider, its conversation count and the file name under
 * them. A long name is cut in the middle ({@link splitName}), so the count
 * and the extension always stay visible.
 */
export function LoadedFiles({
  loaded,
  onClear,
}: {
  /** The export of each provider, or null when none is loaded. */
  loaded: Record<Provider, LoadedInfo | null>;
  /** Removes the export of one provider. */
  onClear: (provider: Provider) => void;
}) {
  return (
    <ul
      id="loaded-files"
      aria-label="Loaded exports"
      className="flex flex-col gap-2"
    >
      {PROVIDERS.map((p) => {
        const info = loaded[p.key];
        if (!info) return null;
        return (
          <li
            key={p.key}
            id={`loaded-file-${p.key}`}
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
                  {plural(info.count, "chat")}
                </span>
              </span>
              {/* Every file, cut in the middle: a touch screen has no title tip. */}
              <ul className="flex flex-col text-zinc-600 dark:text-zinc-400">
                {info.files.map((f, i) => {
                  const [head, tail] = splitName(f);
                  return (
                    <li key={i} className="flex min-w-0" title={f}>
                      <span className="truncate whitespace-pre">{head}</span>
                      <span className="shrink-0 whitespace-pre">{tail}</span>
                    </li>
                  );
                })}
              </ul>
            </span>
            <button
              type="button"
              onClick={() => onClear(p.key)}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-[background-color,color,scale] duration-(--dur-micro) ease-out hover:bg-zinc-900/5 active:scale-[0.92] hover:text-zinc-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-zinc-50"
              aria-label={`Remove ${p.label} file`}
            >
              <X size={14} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
