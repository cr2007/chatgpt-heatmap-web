import { ChevronDown } from "lucide-react";
import { cn, plural } from "@/lib/utils";
import { PROVIDERS } from "@/lib/providers";
import type { Provider } from "@/lib/types";
import { LoadedFiles, type LoadedInfo } from "@/components/loaded-files";
import { AddExport } from "@/components/add-export";
import { TimeZonePicker } from "@/components/time-zone-picker";

/**
 * The phone's export panel under the top bar: closed, one line ("2 exports,
 * Asia/Dubai"); open, the loaded files with their counts, Add export and the
 * time zone. The page owns `open`, so a fold or an unfold, which builds
 * the bar again, keeps the panel open.
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
  loaded: Record<Provider, LoadedInfo | null>;
  onClear: (provider: Provider) => void;
  progress: number | null;
  onFiles: (files: FileList) => Promise<void>;
  timeZone: string;
  setTimeZone: (timeZone: string) => void;
  open: boolean;
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
      <summary className="mx-auto flex h-11 w-full max-w-6xl cursor-pointer list-none items-center gap-2 px-5 text-sm text-zinc-600 select-none sm:px-8 dark:text-zinc-400 [&::-webkit-details-marker]:hidden">
        {PROVIDERS.filter((p) => loaded[p.key]).map((p) => (
          <span
            key={p.key}
            aria-hidden="true"
            className={cn("size-2.5 rounded-[3px]", p.dot)}
          />
        ))}
        <span className="min-w-0 truncate">
          {plural(keys.length, "export")}, {timeZone}
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
