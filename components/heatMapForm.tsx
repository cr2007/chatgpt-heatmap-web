import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROVIDERS } from "@/lib/providers";
import { useUpload } from "@/hooks/use-upload";
import { DropZone } from "@/components/drop-zone";
import { LoadedFiles, type LoadedInfo } from "@/components/loaded-files";
import { ExportSteps } from "@/components/export-steps";
import { TimeZonePicker } from "@/components/time-zone-picker";
import type { Exports } from "@/lib/upload";
import type { Provider } from "@/lib/types";

/** The upload form: drop zone, loaded files, export steps and time zone picker. */
export function HeatMapForm({
  loaded,
  onLoad,
  onStream,
  onClear,
  timeZone,
  setTimeZone,
  compact,
}: {
  /** What each provider has loaded, or null. Owned by the page, so every form instance agrees. */
  loaded: Record<Provider, LoadedInfo | null>;
  /** Hands new exports to the page; providers left out keep their data. */
  onLoad: (exports: Exports) => void;
  /** The partial result while an upload streams, then null. */
  onStream: (partial: Exports | null) => void;
  onClear: (provider: Provider) => void;
  timeZone: string;
  setTimeZone: (timeZone: string) => void;
  /** Fold the form behind a summary once data is loaded. Only the plain phone
   *  stack needs it: other layouts never hide the heatmap behind the form. */
  compact: boolean;
}) {
  const { progress, uploads, error, isShaking, resetShake, processFiles } =
    useUpload({ onLoad, onStream });

  const hasAnyLoaded = PROVIDERS.some((p) => loaded[p.key] !== null);

  /** The form body. Each copy gets its own `inputId`, because the folded
   *  layout can render a second copy and ids must stay unique. */
  function renderFormGrid(inputId: string) {
    return (
      <div className="form-grid">
        <div className="form-grid__upload flex flex-col gap-2">
          <DropZone
            inputId={inputId}
            progress={progress}
            uploads={uploads}
            error={error}
            onFiles={processFiles}
          />

          {error && (
            <p
              role="alert"
              className={cn(
                "text-xs text-red-600 dark:text-red-400",
                isShaking && "animate-shake",
              )}
              onAnimationEnd={resetShake}
            >
              {error}
            </p>
          )}

          {hasAnyLoaded && <LoadedFiles loaded={loaded} onClear={onClear} />}
        </div>

        <ExportSteps />

        <TimeZonePicker
          id={inputId}
          timeZone={timeZone}
          setTimeZone={setTimeZone}
        />
      </div>
    );
  }

  if (!compact || !hasAnyLoaded) return renderFormGrid("jsonFile");

  return (
    <details className="group/collapse">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-1 min-w-0 flex-wrap items-center gap-2">
          {PROVIDERS.map(
            (p) =>
              loaded[p.key] && (
                <span
                  key={p.key}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                    p.border,
                    p.bg,
                    p.text,
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", p.dot)} />
                  {p.label}
                </span>
              ),
          )}
        </div>
        <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
          Manage
        </span>
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-open/collapse:rotate-180 dark:text-zinc-400"
        />
      </summary>
      <div className="mt-3">{renderFormGrid("jsonFile-collapsed")}</div>
    </details>
  );
}
