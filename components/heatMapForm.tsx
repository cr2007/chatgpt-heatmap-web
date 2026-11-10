import { Check, ChevronDown, ChevronsUpDown, Upload, X } from "lucide-react";
import React, { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import { readExports } from "@/lib/upload";
import type { LoadedExport, Provider } from "@/lib/types";

interface LoadedInfo {
  name: string;
  count: number;
}

interface ProviderTheme {
  key: Provider;
  label: string;
  /** Export instructions shown in the "how to export" cards. */
  steps: string;
  border: string;
  bg: string;
  text: string;
  dot: string;
}

/** Colour tokens and copy for each provider, shared by every card, badge,
 *  and chip below so the palette only needs updating in one place. */
const PROVIDERS: ProviderTheme[] = [
  {
    key: "chatgpt",
    label: "ChatGPT",
    steps:
      "Settings → Data Controls → Export data. Multiple files are supported.",
    border: "border-green-300 dark:border-green-900/40",
    bg: "bg-green-50 dark:bg-green-950/20",
    text: "text-green-700 dark:text-green-400",
    dot: "bg-green-500",
  },
  {
    key: "claude",
    label: "Claude",
    steps: "Account Settings → Export data.",
    border: "border-orange-300 dark:border-orange-900/40",
    bg: "bg-orange-50 dark:bg-orange-950/20",
    text: "text-orange-700 dark:text-orange-400",
    dot: "bg-orange-500",
  },
];

export function HeatMapForm({
  loaded,
  onLoad,
  onClear,
  timeZone,
  setTimeZone,
  compact,
}: {
  /** What each provider has loaded, or null. Owned by the page, so every form instance agrees. */
  loaded: Record<Provider, LoadedInfo | null>;
  /** Hands new exports to the page; providers left out keep their data. */
  onLoad: (exports: Partial<Record<Provider, LoadedExport>>) => void;
  onClear: (provider: Provider) => void;
  timeZone: string;
  setTimeZone: React.Dispatch<React.SetStateAction<string>>;
  /** Collapse the form behind a tap-to-expand summary once data is loaded.
   *  Only worth it where the form and heatmap share one scrolling column
   *  (the plain mobile/narrow stack) - everywhere else (desktop split,
   *  book mode's own column, tent mode's wide bar) the heatmap is never
   *  hidden behind the form, so collapsing would just add a click for
   *  nothing. */
  compact: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  /** True while picked files are read and checked; big exports take a moment. */
  const [isReading, setIsReading] = useState(false);

  const timeZones = Intl.supportedValuesOf("timeZone");

  const showError = useCallback((msg: string) => {
    setError(msg);
    setIsShaking(true);
  }, []);

  /**
   * Reads every dropped or picked file and hands the checked exports to the page.
   *
   * Step 1: read the files as text; a read error is shown, never thrown.
   * Step 2: check and group them (`readExports`), or show why not.
   * Step 3: hand the raw exports to the page and toast each provider.
   */
  const processFiles = useCallback(
    async (fileList: FileList) => {
      setError("");
      setIsReading(true);
      try {
        // Step 1
        const files = await Promise.all(
          Array.from(fileList, async (f) => ({
            name: f.name,
            text: await f.text(),
          })),
        );
        // Step 2
        const result = readExports(files);
        if (!result.ok) return showError(result.error);
        // Step 3
        onLoad(result.exports);
        for (const p of PROVIDERS) {
          const count = result.exports[p.key]?.data.length;
          if (count)
            toast.success(
              `${p.label} export loaded - ${count} conversation${count === 1 ? "" : "s"}`,
            );
        }
      } catch (e) {
        showError(
          `Could not read the file: ${e instanceof Error ? e.message : String(e)}`,
        );
      } finally {
        setIsReading(false);
      }
    },
    [onLoad, showError],
  );

  const hasAnyLoaded = PROVIDERS.some((p) => loaded[p.key] !== null);

  /**
   * The upload dropzone, loaded-file badges, "how to export" cards, and
   * timezone picker. Rendered directly when there's nothing loaded yet (or
   * `compact` is off); nested inside the collapsible summary otherwise.
   * `inputId` is parameterised because `compact` mode can render this twice
   * at once (collapsed copy + none), and duplicate DOM ids break `htmlFor`.
   */
  function renderFormGrid(inputId: string) {
    return (
      <div className="form-grid">
        {/* Upload drop zone + conditional file states */}
        <div className="form-grid__upload flex flex-col gap-2">
          {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- drop target; keyboard users reach the linked file input */}
          <label
            htmlFor={inputId}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-4 text-center h-full",
              "cursor-pointer select-none transition-all duration-200",
              isDragging
                ? "border-violet-500/60 bg-violet-500/5 scale-[1.01] dark:border-violet-400/60 dark:bg-violet-400/5"
                : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600 hover:bg-zinc-50/40 dark:hover:bg-zinc-800/30",
              error &&
                !isDragging &&
                "border-red-500/60 dark:border-red-400/60",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setIsDragging(false);
              await processFiles(e.dataTransfer.files);
            }}
          >
            <Upload
              aria-hidden="true"
              className="h-5 w-5 text-zinc-500 dark:text-zinc-400"
              strokeWidth={1.5}
            />
            <div aria-live="polite">
              <p className="text-xs font-medium leading-tight">
                {isReading ? "Reading files..." : "Drop export files here"}
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-tight">
                {isReading
                  ? "Large exports take a few seconds"
                  : "or click to browse"}
              </p>
            </div>
            <input
              id={inputId}
              type="file"
              accept="application/json,.json"
              multiple
              className="sr-only"
              onChange={async (e) => {
                const input = e.currentTarget;
                if (input.files?.length) await processFiles(input.files);
                input.value = ""; // so picking the same file again fires onChange
              }}
            />
          </label>

          {error && (
            <p
              role="alert"
              className={cn(
                "text-xs text-red-600 dark:text-red-400",
                isShaking && "animate-shake",
              )}
              onAnimationEnd={() => setIsShaking(false)}
            >
              {error}
            </p>
          )}

          {hasAnyLoaded && (
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
                        className={cn(
                          "h-1.5 w-1.5 rounded-full shrink-0",
                          p.dot,
                        )}
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
          )}
        </div>

        {/* How to export */}
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
                <p className="mt-1.5 text-zinc-600 dark:text-zinc-400">
                  {p.steps}
                </p>
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
                <p
                  className={cn("flex items-center gap-2 font-medium", p.text)}
                >
                  <span
                    className={cn("h-1.5 w-1.5 rounded-full shrink-0", p.dot)}
                  />
                  {p.label}
                </p>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                  {p.steps}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Timezone */}
        <div className="form-grid__tz flex flex-col gap-2">
          <Label
            htmlFor={`${inputId}-tz`}
            className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-wide font-medium"
          >
            Time Zone
          </Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                id={`${inputId}-tz`}
                variant="outline"
                aria-haspopup="listbox"
                aria-expanded={open}
                className="w-full justify-between"
              >
                <span className="truncate">
                  {timeZone || "Select timezone"}
                </span>
                <ChevronsUpDown
                  aria-hidden="true"
                  className="opacity-50 ml-1 shrink-0"
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput
                  placeholder="Search timezone..."
                  className="h-9"
                />
                <CommandList>
                  <CommandEmpty>No timezone found.</CommandEmpty>
                  <CommandGroup>
                    {timeZones.map((tz) => (
                      <CommandItem
                        key={tz}
                        value={tz}
                        onSelect={() => {
                          setTimeZone(tz);
                          setOpen(false);
                        }}
                      >
                        {tz}
                        <Check
                          className={cn(
                            "ml-auto",
                            timeZone === tz ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
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
