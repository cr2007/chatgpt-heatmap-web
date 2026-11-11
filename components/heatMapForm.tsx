import { cn } from "@/lib/utils";
import { PROVIDERS } from "@/lib/providers";
import { useUpload } from "@/hooks/use-upload";
import { DropZone } from "@/components/drop-zone";
import { LoadedFiles, type LoadedInfo } from "@/components/loaded-files";
import { ExportSteps } from "@/components/export-steps";
import { TimeZonePicker } from "@/components/time-zone-picker";
import type { Exports } from "@/lib/upload";
import type { Provider } from "@/lib/types";

/** The upload form of the fold layouts: drop zone, loaded files, export
 *  steps and time zone picker. */
export function HeatMapForm({
  loaded,
  onLoad,
  onStream,
  onClear,
  timeZone,
  setTimeZone,
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
}) {
  const { progress, uploads, error, isShaking, resetShake, processFiles } =
    useUpload({ onLoad, onStream });

  const hasAnyLoaded = PROVIDERS.some((p) => loaded[p.key] !== null);

  return (
    <div className="form-grid">
      <div className="form-grid__upload flex flex-col gap-2">
        <DropZone
          inputId="form-file"
          progress={progress}
          uploads={uploads}
          error={error}
          onFiles={processFiles}
        />

        {error && (
          // No role="alert": the error toast already announces it once.
          <p
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

      <TimeZonePicker id="form" timeZone={timeZone} setTimeZone={setTimeZone} />
    </div>
  );
}
