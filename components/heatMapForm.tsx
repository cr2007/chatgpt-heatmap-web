
import { Check, ChevronDown, ChevronsUpDown, Upload, X } from "lucide-react";
import React, { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import { detectFormat, parseChatGPT, parseClaude } from "@/lib/parse";
import type { ConversationSummary } from "@/lib/types";

type Provider = "chatgpt" | "claude";

interface LoadedInfo {
  name: string;
  count: number;
}

type ParsedFile = {
  format: Provider | "unknown";
  data: unknown[];
  name: string;
};

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
    steps: "Settings → Data Controls → Export data. Multiple files are supported.",
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
  setChatgptFile,
  setClaudeFile,
  timeZone,
  setTimeZone,
  externalCounts,
  compact,
}: {
  setChatgptFile: React.Dispatch<React.SetStateAction<ConversationSummary[] | null>>;
  setClaudeFile: React.Dispatch<React.SetStateAction<ConversationSummary[] | null>>;
  timeZone: string;
  setTimeZone: React.Dispatch<React.SetStateAction<string>>;
  /** Conversation counts from the parent's own data, keyed by provider (null
   *  if that provider has nothing loaded). A real upload sets this and the
   *  local `loaded` state together via `processFiles`, but data can also
   *  arrive by other means - notably `public/test.html`, which seeds
   *  `sessionStorage` directly and lets `page.tsx` pick it up on mount,
   *  bypassing this component entirely. Falling back to this prop keeps the
   *  loaded badge and the `compact` summary in sync regardless of how the
   *  data got there. */
  externalCounts: Record<Provider, number | null>;
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
  /** Per-provider summary of what's currently loaded, or null if cleared/never loaded. */
  const [loaded, setLoaded] = useState<Record<Provider, LoadedInfo | null>>({
    chatgpt: null,
    claude: null,
  });
  /** Bumped to remount the file input, clearing its selection after a removal. */
  const [inputKey, setInputKey] = useState(0);

  const timeZones = Intl.supportedValuesOf("timeZone");

  const showError = useCallback((msg: string) => {
    setError(msg);
    setIsShaking(true);
  }, []);

  /**
   * Parses every dropped/selected file, validates the batch, and hands the
   * results off to the parent.
   *
   * Step 1: parse each file as JSON and detect its export format.
   * Step 2: reject the batch if any file's format wasn't recognised.
   * Step 3: reject more than one Claude export (only one is supported).
   * Step 4: record what's loaded for the badge/summary UI.
   * Step 5: parse and hand off each recognised format, toasting success.
   */
  const processFiles = useCallback(
    async (fileList: FileList) => {
      setError("");
      const results: ParsedFile[] = [];

      // Step 1
      for (const file of Array.from(fileList)) {
        let parsed: unknown[];
        try {
          const json = JSON.parse(await file.text());
          if (!Array.isArray(json) || json.length === 0) {
            showError(`${file.name}: expected a non-empty array of conversations`);
            return;
          }
          parsed = json;
        } catch {
          showError(`${file.name}: could not parse JSON`);
          return;
        }
        results.push({ format: detectFormat(parsed), data: parsed, name: file.name });
      }

      // Step 2
      const unknownFiles = results.filter((r) => r.format === "unknown");
      if (unknownFiles.length > 0) {
        showError(
          `${unknownFiles[0].name}: unrecognised format - expected a ChatGPT or Claude conversations.json`
        );
        return;
      }

      // Step 3
      const gptFiles    = results.filter((r) => r.format === "chatgpt");
      const claudeFiles = results.filter((r) => r.format === "claude");
      if (claudeFiles.length > 1) {
        showError("Upload at most one Claude export");
        return;
      }

      // Step 4
      setLoaded((prev) => {
        const next = { ...prev };
        if (gptFiles.length > 0) {
          next.chatgpt = {
            name:  gptFiles.length === 1 ? gptFiles[0].name : `${gptFiles.length} files`,
            count: gptFiles.reduce((sum, f) => sum + f.data.length, 0),
          };
        }
        if (claudeFiles.length === 1) {
          next.claude = { name: claudeFiles[0].name, count: claudeFiles[0].data.length };
        }
        return next;
      });

      // Step 5
      if (gptFiles.length > 0) {
        const totalGpt = gptFiles.reduce((sum, f) => sum + f.data.length, 0);
        setChatgptFile(parseChatGPT(gptFiles.flatMap((f) => f.data), timeZone));
        toast.success(`ChatGPT export loaded - ${totalGpt} conversation${totalGpt === 1 ? "" : "s"}`);
      }
      if (claudeFiles.length === 1) {
        const claudeCount = claudeFiles[0].data.length;
        setClaudeFile(parseClaude(claudeFiles[0].data, timeZone));
        toast.success(`Claude export loaded - ${claudeCount} conversation${claudeCount === 1 ? "" : "s"}`);
      }
    },
    [timeZone, setChatgptFile, setClaudeFile, showError]
  );

  /** Clears one provider's loaded data, resetting the file input only once
   *  nothing is loaded at all (so a second file can still be added). */
  function clearFile(provider: Provider) {
    (provider === "chatgpt" ? setChatgptFile : setClaudeFile)(null);
    setLoaded((prev) => ({ ...prev, [provider]: null }));
    const otherProvider = provider === "chatgpt" ? "claude" : "chatgpt";
    if (loaded[otherProvider] === null && externalCounts[otherProvider] === null) {
      setInputKey((k) => k + 1);
    }
  }

  /** Merges the rich local `loaded` state (real uploads: filename + count)
   *  with `externalCounts` (data injected some other way: count only, with
   *  a generic label) so every render site sees one consistent answer. */
  function getLoadedInfo(provider: Provider): LoadedInfo | null {
    if (loaded[provider]) return loaded[provider];
    const count = externalCounts[provider];
    return count !== null ? { name: "Loaded externally", count } : null;
  }

  const hasAnyLoaded = PROVIDERS.some((p) => getLoadedInfo(p.key) !== null);

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
          <label
            htmlFor={inputId}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-4 text-center h-full",
              "cursor-pointer select-none transition-all duration-200",
              isDragging
                ? "border-violet-500/60 bg-violet-500/5 scale-[1.01] dark:border-violet-400/60 dark:bg-violet-400/5"
                : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600 hover:bg-zinc-50/40 dark:hover:bg-zinc-800/30",
              error && !isDragging && "border-red-500/60 dark:border-red-400/60"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={async (e) => {
              e.preventDefault();
              setIsDragging(false);
              await processFiles(e.dataTransfer.files);
            }}
          >
            <Upload aria-hidden="true" className="h-5 w-5 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} />
            <div>
              <p className="text-xs font-medium leading-tight">Drop export files here</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-tight">or click to browse</p>
            </div>
            <input
              key={inputKey}
              id={inputId}
              type="file"
              accept="application/json,.json"
              multiple
              className="sr-only"
              onChange={async (e) => {
                if (e.target.files && e.target.files.length > 0) {
                  await processFiles(e.target.files);
                }
              }}
            />
          </label>

          {error && (
            <p
              role="alert"
              className={cn("text-xs text-red-600 dark:text-red-400", isShaking && "animate-shake")}
              onAnimationEnd={() => setIsShaking(false)}
            >
              {error}
            </p>
          )}

          {hasAnyLoaded && (
            <div className="flex flex-col gap-2">
              {PROVIDERS.map((p) => {
                const info = getLoadedInfo(p.key);
                if (!info) return null;
                return (
                  <div
                    key={p.key}
                    className={cn("flex items-center justify-between rounded-lg border px-3 py-2 text-xs", p.border, p.bg)}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", p.dot)} />
                      <span className={cn("font-medium flex-shrink-0", p.text)}>{p.label}</span>
                      <span className="text-zinc-600 dark:text-zinc-400 truncate">
                        {info.name} ({info.count} conversations)
                      </span>
                    </span>
                    <button
                      onClick={() => clearFile(p.key)}
                      className="ml-2 flex-shrink-0 h-6 w-6 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-700 transition-colors"
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
              <details key={p.key} className={cn("group rounded-lg border px-3 py-2 text-xs", p.border, p.bg)}>
                <summary className={cn("flex cursor-pointer list-none items-center justify-between font-medium [&::-webkit-details-marker]:hidden", p.text)}>
                  <span className="flex items-center gap-2">
                    <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", p.dot)} />
                    {p.label}
                  </span>
                  <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 flex-shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-1.5 text-zinc-600 dark:text-zinc-400">{p.steps}</p>
              </details>
            ))}
          </div>

          {/* Room to spare (normal desktop): show the steps plainly, same colours. */}
          <div className="form-grid__info-expanded flex flex-col gap-2">
            {PROVIDERS.map((p) => (
              <div key={p.key} className={cn("rounded-lg border px-3 py-2 text-xs", p.border, p.bg)}>
                <p className={cn("flex items-center gap-2 font-medium", p.text)}>
                  <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", p.dot)} />
                  {p.label}
                </p>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">{p.steps}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Timezone */}
        <div className="form-grid__tz flex flex-col gap-2">
          <Label htmlFor="timeZone" className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-wide font-medium">
            Time Zone
          </Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
              >
                <span className="truncate">{timeZone || "Select timezone"}</span>
                <ChevronsUpDown aria-hidden="true" className="opacity-50 ml-1 flex-shrink-0" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Search timezone..." className="h-9" />
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
                            timeZone === tz ? "opacity-100" : "opacity-0"
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
          {PROVIDERS.map((p) => getLoadedInfo(p.key) && (
            <span
              key={p.key}
              className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", p.border, p.bg, p.text)}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", p.dot)} />
              {p.label}
            </span>
          ))}
        </div>
        <span className="flex-shrink-0 text-xs text-zinc-500 dark:text-zinc-400">Manage</span>
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 flex-shrink-0 text-zinc-500 transition-transform group-open/collapse:rotate-180 dark:text-zinc-400"
        />
      </summary>
      <div className="mt-3">{renderFormGrid("jsonFile-collapsed")}</div>
    </details>
  );
}
