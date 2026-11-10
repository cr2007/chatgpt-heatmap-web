import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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

/** A labelled combobox that picks a time zone. The button id is `${id}-tz`. */
export function TimeZonePicker({
  id,
  timeZone,
  setTimeZone,
}: {
  id: string;
  timeZone: string;
  setTimeZone: (timeZone: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const timeZones = Intl.supportedValuesOf("timeZone");

  return (
    <div className="form-grid__tz flex flex-col gap-2">
      <Label
        htmlFor={`${id}-tz`}
        className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-wide font-medium"
      >
        Time Zone
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={`${id}-tz`}
            variant="outline"
            aria-haspopup="listbox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="truncate">{timeZone || "Select timezone"}</span>
            <ChevronsUpDown
              aria-hidden="true"
              className="opacity-50 ml-1 shrink-0"
            />
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
  );
}
