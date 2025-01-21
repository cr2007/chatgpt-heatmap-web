"use client";

import { ArrowRightIcon, Check, ChevronsUpDown } from "lucide-react";
import React from "react";
import { useState } from "react";

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

export function HeatMapForm() {
  const [open, setOpen] = React.useState(false);
  const [timeZone, setTimeZone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  const timeZones = Intl.supportedValuesOf("timeZone");

  return (
    <>
      {/* File Input Field */}
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="jsonFile">JSON Input File (<code>conversations.json</code>)</Label>
        <Input id="jsonFile" type="file"></Input>

        <div className="flex flex-col items-center gap-2 text-center bg-secondary text-slate-950 dark:text-slate-300 p-4 rounded-lg">
					<p className="text-center text-sm">
						Export your chat history from ChatGPT and upload it here.
					</p>
					<p className="text-center text-sm flex items-center gap-1">
						Profile <ArrowRightIcon className="inline-block w-3 h-3" /> Data Controls <ArrowRightIcon className="inline-block w-3 h-3" /> Export data
					</p>
				</div>
      </div>

      {/* Time Zone Popover Field */}
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
    </>
  );
}
