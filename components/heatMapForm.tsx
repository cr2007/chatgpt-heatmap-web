"use client";

import { ArrowRightIcon, Check, ChevronsUpDown } from "lucide-react";
import React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ChatgptSummary } from "@/components/chatgpt-heatmap";

function unixTimestampToDate(timestamp: number, timeZone: string): string {
  const utcDate = new Date(timestamp * 1000);
  return utcDate.toLocaleDateString("sv-SE", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function HeatMapForm({
  setFile,
  timeZone,
  setTimeZone
}: {
  setFile: React.Dispatch<React.SetStateAction<ChatgptSummary[] | null>>;
  timeZone: string;
  setTimeZone: React.Dispatch<React.SetStateAction<string>>;
}) {
  // File Input
  const [open, setOpen] = React.useState(false);

  const timeZones = Intl.supportedValuesOf("timeZone");

  interface MappingEntry {
    message: {
      author: { role: string };
      create_time: number;
    };
  }

  interface ParsedContent {
    title: string;
    create_time: number;
    mapping: {
      [key: string]: MappingEntry; // Dynamic keys for mapping
    };
  }

  return (
    <div className="flex flex-col items-center gap-2 text-center rounded-lg">
      {/* File Input Field */}
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="jsonFile" className="text-left">
          JSON Input File (<code>conversations.json</code>)
        </Label>
        <Input
          id="jsonFile"
          type="file"
          accept="application/JSON" // Accept JSON file
          multiple={false} // Accept only single file
          onChange={async (e) => {
            if (e.target.files) {
              const file = e.target.files[0];
              const fileContent = await file.text();
              const parsedContent = JSON.parse(fileContent);

              setFile(
                parsedContent.map((c: ParsedContent) => ({
                    title: c.title,
                    create_day: unixTimestampToDate(c.create_time, timeZone),
                    convo_create_day: Object.values(c.mapping)
                      .filter(
                        (entry: MappingEntry | null) =>
                          entry?.message?.author.role === "user"
                      )
                      .map(
                        (entry: MappingEntry | null) =>
                          entry?.message?.create_time
                            ? unixTimestampToDate(
                                entry.message.create_time,
                                timeZone
                              )
                            : null // Handle null case
                      )
                      .filter((day): day is string => day !== null), // Remove null entries
                }))
              );
            } else setFile(null);
          }}
        />

        <div className="flex flex-col items-center gap-2 text-center bg-secondary text-slate-950 dark:text-slate-300 p-4 rounded-lg">
          <p className="text-center text-sm">
            Export your chat history from ChatGPT and upload it here.
          </p>
          <p className="text-center text-sm flex items-center gap-1">
            Profile
            <ArrowRightIcon className="inline-block w-3 h-3" /> Data Controls
            <ArrowRightIcon className="inline-block w-3 h-3" /> Export data
          </p>
        </div>
      </div>

      <br />

      {/* Time Zone Popover Field */}
      <div className="flex flex-col items-start gap-2">
        <Label htmlFor="timeZone" className="text-left">
          Time Zone
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-[200px] justify-between"
            >
              {timeZone || "Select timezone"}
              <ChevronsUpDown className="opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
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
