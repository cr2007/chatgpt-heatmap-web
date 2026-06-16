"use client";

import { Check, ChevronsUpDown, Upload, X } from "lucide-react";
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
import { detectFormat, parseChatGPT, parseClaude } from "@/lib/parse";
import type { ConversationSummary } from "@/lib/types";

interface LoadedInfo {
  name: string;
  count: number;
}

type ParsedFile = {
  format: "chatgpt" | "claude" | "unknown";
  data: unknown[];
  name: string;
};

export function HeatMapForm({
  setChatgptFile,
  setClaudeFile,
  timeZone,
  setTimeZone,
}: {
  setChatgptFile: React.Dispatch<React.SetStateAction<ConversationSummary[] | null>>;
  setClaudeFile: React.Dispatch<React.SetStateAction<ConversationSummary[] | null>>;
  timeZone: string;
  setTimeZone: React.Dispatch<React.SetStateAction<string>>;
}) {
  const [open, setOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [loaded, setLoaded] = useState<{ chatgpt: LoadedInfo | null; claude: LoadedInfo | null }>({
    chatgpt: null,
    claude: null,
  });
  const [inputKey, setInputKey] = useState(0);

  const timeZones = Intl.supportedValuesOf("timeZone");

  const showError = useCallback((msg: string) => {
    setError(msg);
    setIsShaking(true);
  }, []);

  const processFiles = useCallback(
    async (fileList: FileList) => {
      setError("");
      const results: ParsedFile[] = [];

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

      const unknownFiles = results.filter((r) => r.format === "unknown");
      if (unknownFiles.length > 0) {
        showError(
          `${unknownFiles[0].name}: unrecognised format - expected a ChatGPT or Claude conversations.json`
        );
        return;
      }

      const gptFiles    = results.filter((r) => r.format === "chatgpt");
      const claudeFiles = results.filter((r) => r.format === "claude");

      if (claudeFiles.length > 1) {
        showError("Upload at most one Claude export");
        return;
      }

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

      if (gptFiles.length > 0) {
        setChatgptFile(parseChatGPT(gptFiles.flatMap((f) => f.data), timeZone));
      }

      if (claudeFiles.length === 1) {
        setClaudeFile(parseClaude(claudeFiles[0].data, timeZone));
      }
    },
    [timeZone, setChatgptFile, setClaudeFile, showError]
  );

  function clearChatgpt() {
    setChatgptFile(null);
    setLoaded((prev) => ({ ...prev, chatgpt: null }));
    if (!loaded.claude) setInputKey((k) => k + 1);
  }

  function clearClaude() {
    setClaudeFile(null);
    setLoaded((prev) => ({ ...prev, claude: null }));
    if (!loaded.chatgpt) setInputKey((k) => k + 1);
  }

  const hasAnyLoaded = loaded.chatgpt || loaded.claude;

  return (
    <div className="flex flex-col gap-6 w-full">

      {/* Upload zone */}
      <div className="flex flex-col gap-3">
        <label
          htmlFor="jsonFile"
          className={cn(
            "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center",
            "cursor-pointer select-none transition-all duration-200",
            isDragging
              ? "border-primary/60 bg-primary/5 scale-[1.01]"
              : "border-border hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50/40 dark:hover:bg-zinc-800/30",
            error && !isDragging && "border-destructive/60"
          )}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setIsDragging(false);
            await processFiles(e.dataTransfer.files);
          }}
        >
          <Upload className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-medium">Drop your conversation export files here</p>
            <p className="text-xs text-muted-foreground mt-0.5">or click to browse - multiple files supported</p>
          </div>
          <input
            key={inputKey}
            id="jsonFile"
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
            className={cn("text-xs text-destructive", isShaking && "animate-shake")}
            onAnimationEnd={() => setIsShaking(false)}
          >
            {error}
          </p>
        )}

        {hasAnyLoaded && (
          <div className="flex flex-col gap-1.5">
            {loaded.chatgpt && (
              <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50/50 px-3 py-2 text-xs dark:border-green-900/40 dark:bg-green-950/20">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="font-medium text-green-700 dark:text-green-400 flex-shrink-0">ChatGPT</span>
                  <span className="text-muted-foreground truncate">
                    {loaded.chatgpt.name} ({loaded.chatgpt.count} conversations)
                  </span>
                </span>
                <button
                  onClick={clearChatgpt}
                  className="ml-2 flex-shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  aria-label="Remove ChatGPT file"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            {loaded.claude && (
              <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50/50 px-3 py-2 text-xs dark:border-orange-900/40 dark:bg-orange-950/20">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                  <span className="font-medium text-orange-600 dark:text-orange-400 flex-shrink-0">Claude</span>
                  <span className="text-muted-foreground truncate">
                    {loaded.claude.name} ({loaded.claude.count} conversations)
                  </span>
                </span>
                <button
                  onClick={clearClaude}
                  className="ml-2 flex-shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  aria-label="Remove Claude file"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="rounded-lg border border-border/60 bg-secondary/40 p-4 text-left space-y-2.5">
          <p className="text-xs font-semibold">How to export your data</p>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">ChatGPT</span>{" "}
              Settings → Data Controls → Export data
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Claude</span>{" "}
              Account Settings → Export data
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            ChatGPT exports may be split across multiple files. Upload them all at once,
            alongside an optional Claude export.
          </p>
        </div>
      </div>

      {/* Timezone */}
      <div className="flex flex-col items-center gap-2">
        <Label htmlFor="timeZone" className="text-xs text-muted-foreground uppercase tracking-wide font-medium self-start">
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
              {timeZone || "Select timezone"}
              <ChevronsUpDown className="opacity-50" />
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
