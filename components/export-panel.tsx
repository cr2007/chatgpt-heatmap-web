import { ChevronDown } from "lucide-react";
import { cn, plural } from "@/lib/utils";
import { zoneLabel } from "@/lib/time-zones";
import { PROVIDERS } from "@/lib/providers";
import type { Provider } from "@/lib/types";
import { LoadedFiles, type LoadedInfo } from "@/components/loaded-files";
import { AddExport } from "@/components/add-export";
import { TimeZonePicker } from "@/components/time-zone-picker";

/**
 * The phone's export panel under the top bar.
 *
 * Closed, it is one line ("2 exports, Asia/Dubai"); open, it holds the
 * loaded files with their counts ({@link LoadedFiles}), Add export
 * ({@link AddExport}) and the time zone ({@link TimeZonePicker}).
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
 */
export function ExportPanel({
  loaded,
  onClear,
  progress,
  onFiles,
  timeZone,
  setTimeZone,
  open,
  onOpen,
}: {
  /** The export of each provider, or null when it has none. */
  loaded: Record<Provider, LoadedInfo | null>;
  /** Removes the export of one provider. */
  onClear: (provider: Provider) => void;
  /** Share of bytes read (0 to 1), or null when idle. */
  progress: number | null;
  /** Reads the picked files. */
  onFiles: (files: FileList) => Promise<unknown>;
  /** The IANA time zone that buckets the days. */
  timeZone: string;
  /** Sets the time zone. */
  setTimeZone: (timeZone: string) => void;
  /** The panel is open. The page owns it, so a fold or an unfold, which
   *  builds the bar again, keeps the panel open. */
  open: boolean;
  /** Gets the new open state after each toggle. */
  onOpen: (open: boolean) => void;
}) {
  const keys = PROVIDERS.filter((p) => loaded[p.key]).map((p) => p.key);
  return (
    <details
      id="export-panel"
      open={open}
      onToggle={(e) => onOpen(e.currentTarget.open)}
      className="group/panel border-t border-zinc-200/80 dark:border-zinc-800/80"
    >
      <summary className="mx-auto flex h-11 w-full max-w-6xl cursor-pointer list-none items-center gap-2 px-5 text-sm text-zinc-600 transition-colors duration-(--dur-press) ease-out select-none active:bg-zinc-900/5 sm:px-8 dark:text-zinc-400 dark:active:bg-white/10 [&::-webkit-details-marker]:hidden">
        {PROVIDERS.filter((p) => loaded[p.key]).map((p) => (
          <span
            key={p.key}
            aria-hidden="true"
            className={cn("size-2.5 rounded-[3px]", p.dot)}
          />
        ))}
        <span className="min-w-0 truncate">
          {plural(keys.length, "export")}, {zoneLabel(timeZone)}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="ml-auto size-4 shrink-0 transition-transform duration-(--dur-ui) ease-out group-open/panel:rotate-180"
        />
      </summary>
      <div className="mx-auto flex w-full max-w-6xl animate-fade-in flex-col gap-4 px-5 pb-5 sm:px-8">
        <LoadedFiles loaded={loaded} onClear={onClear} />
        <AddExport progress={progress} onFiles={onFiles} loaded={keys} />
        <TimeZonePicker
          id="panel"
          timeZone={timeZone}
          setTimeZone={setTimeZone}
        />
      </div>
    </details>
  );
}
