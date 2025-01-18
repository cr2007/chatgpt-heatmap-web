"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronsUpDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const formSchema = z.object({
  timeZone: z.string().nonempty("Please select a timezone."),
  year: z
    .string()
    .min(4, "The year must be a 4 digit value")
    .max(4, "Year cannot be more than 4 digits")
    .regex(/^\d{4}$/, "Year must be a valid 4-digit number."),
  jsonFile: z
    .instanceof(File)
    .refine(
      (file) => file.type === "application/json",
      "File must be a JSON file."
    ),
});

export function HeatMapForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Defaults to the user's local time zone
      year: new Date().getFullYear().toString(), // Defaults to current year
    },
  });

  const { setValue } = form;

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("Submitted values:", values);

    if (values.jsonFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        console.log(`JSON file contents: ${event.target?.result}`);
      };

      reader.readAsText(values.jsonFile);
    }
  }

  const timeZones =
  typeof Intl.supportedValuesOf === "function"
  ? Intl.supportedValuesOf("timeZone")
  : [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* File Input Field */}
        <FormField
          control={form.control}
          name="jsonFile"
          render={({ field }) => (
            <FormItem>
              <FormLabel>JSON File</FormLabel>
              <FormControl>
                <Input
                  id="jsonFile"
                  type="file"
                  accept="application/json"
                  placeholder="Enter the file contents"
                  onChange={(event) => {
                    if (event.target.files?.[0]) {
                      setValue("jsonFile", event.target.files[0], { shouldValidate: true });
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
              <FormDescription>
                Upload the <code><b>conversation.json</b></code> file in the data export.
              </FormDescription>
            </FormItem>
          )}
        />

        {/* Time Zone Popover Field */}
        <FormField
          control={form.control}
          name="timeZone"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Time Zone</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-[200px] justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value
                        ? timeZones.find(
                            (tz) => tz === field.value
                          )
                        : "Select language"}
                      <ChevronsUpDown className="opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search framework..."
                      className="h-9"
                    />
                    <CommandList>
                      <CommandEmpty>No framework found.</CommandEmpty>
                      <CommandGroup>
                        {timeZones.map((tz) => (
                          <CommandItem
                            value={tz}
                            key={tz}
                            onSelect={() => {
                              form.setValue("timeZone", tz)
                            }}
                          >
                            {tz}
                            <Check
                              className={cn(
                                "ml-auto",
                                tz === field.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormDescription>
                The timezone that will be used for assigning the conversations with the heatmap
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />


        {/* <FormField
          control={form.control}
          name="timeZone"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Time Zone</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-[200px] justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value || "Select language"}
                      <ChevronsUpDown className="opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search Time Zone..."
                      className="h-9"
                      onInput={(event) => {
                        console.log("Command Input Value:", event.currentTarget.value)
                      }}
                    />
                    <CommandList>
                      <CommandEmpty>No Time Zone found.</CommandEmpty>
                      <CommandGroup>
                        {timeZones.map((timeZone) => (
                          <CommandItem
                            value={timeZone}
                            key={timeZone}
                            onSelect={() => {
                              console.log("Selected Time Zone:", timeZone);
                              form.setValue("timeZone", timeZone, {shouldValidate: true});
                            }}
                          >
                            {timeZone}
                            <Check
                              className={cn(
                                "ml-auto",
                                timeZone === field.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormDescription>
                This will be the time zone for creating the heat map.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        /> */}

        {/* Year Input Field */}
        <FormField
          control={form.control}
          name="year"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Year</FormLabel>
              <FormControl>
                <Input placeholder="Enter the year" type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Generate Heatmap</Button>
      </form>
    </Form>
  );
}
