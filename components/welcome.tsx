import { useMemo } from "react";
import { LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROVIDERS } from "@/lib/providers";
import { sampleYear } from "@/lib/sample";
import type { useUpload } from "@/hooks/use-upload";
import { DropZone } from "@/components/drop-zone";
import { TimeZonePicker } from "@/components/time-zone-picker";
import { CalendarHeatmap } from "@/components/calendar-heatmap";
import { AppBar } from "@/components/app-bar";
import { ExportGuide } from "@/components/export-guide";
import { FoldLayout } from "@/components/fold-layout";
import type { Posture } from "@/lib/layout";

/**
 * The first screen, before any export is loaded: what the app does, the
 * drop zone, the time zone, the privacy promise, how to get an export, and
 * an example year so the user knows what to expect.
 *
 * Step 1: The hero: headline, drop zone, upload error, time zone, privacy line.
 * Step 2: The guide: numbered export steps per provider and the example year.
 * Step 3: Flat screens put them side by side (stacked on a phone); a
 *         half-open foldable puts each on its own screen half: the hero
 *         with the bar on the left in book posture, at the bottom (within
 *         thumb reach) in tent posture.
 */
export function Welcome({
  upload,
  timeZone,
  setTimeZone,
  fold,
}: {
  /** The page's upload, so an upload keeps its progress and can be
   *  cancelled after this screen gives way to the loaded one. */
  upload: ReturnType<typeof useUpload>;
  timeZone: string;
  setTimeZone: (timeZone: string) => void;
  /** The posture of a half-open foldable, or undefined on a flat screen. */
  fold?: Posture;
}) {
  const { progress, uploads, error, isShaking, resetShake, processFiles } =
    upload;
  const sample = useMemo(() => sampleYear(), []);

  // Step 1
  const hero = (
    <section
      id="welcome-hero"
      aria-labelledby="welcome-title"
      className="flex flex-col"
    >
      <h2
        id="welcome-title"
        className="max-w-[15ch] text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-5xl"
      >
        Your AI chats, one square a day
      </h2>
      <p className="mt-4 max-w-[42ch] text-base text-zinc-600 sm:text-lg dark:text-zinc-400">
        Drop a ChatGPT or Claude export to see every day you sent a prompt, and
        the chats behind it.
      </p>

      <div className="mt-8">
        <DropZone
          hero
          inputId="welcome-file"
          progress={progress}
          uploads={uploads}
          error={error}
          onFiles={processFiles}
        />
        {error && (
          // No role="alert": the error toast already announces it once.
          <p
            className={cn(
              "mt-2 text-sm text-red-600 dark:text-red-400",
              isShaking && "animate-shake",
            )}
            onAnimationEnd={resetShake}
          >
            {error}
          </p>
        )}
      </div>

      <div className="mt-6">
        <TimeZonePicker
          id="welcome"
          inline
          timeZone={timeZone}
          setTimeZone={setTimeZone}
        />
      </div>

      <p
        id="privacy-note"
        className="mt-5 flex max-w-[46ch] gap-2 text-sm text-zinc-600 dark:text-zinc-400"
      >
        <LockKeyhole
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-zinc-500"
          strokeWidth={1.75}
        />
        <span>
          Your file is read in this tab and never uploaded. The page blocks
          every network request, so it cannot leave.
        </span>
      </p>

      {!fold && (
        <a
          href="#get-export"
          className="mt-6 text-sm font-medium text-accent-ink underline-offset-4 hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-hidden lg:hidden"
        >
          No export yet? See how to get one.
        </a>
      )}
    </section>
  );

  // Step 2
  const guide = (
    <section
      id="get-export"
      aria-labelledby="get-export-title"
      className="@container rounded-2xl border border-zinc-200/80 bg-white/70 p-6 dark:border-zinc-800/80 dark:bg-zinc-900/50"
    >
      <h2 id="get-export-title" className="text-lg font-semibold">
        No export yet? Ask for one first.
      </h2>
      <ExportGuide
        providers={PROVIDERS}
        idPrefix="get-export"
        className="mt-5 grid gap-8 @lg:grid-cols-2"
      />

      <figure
        id="example-year"
        className="mt-8 border-t border-zinc-200/80 pt-6 dark:border-zinc-800/80"
      >
        {/* Decoration: the caption says what it shows, and the cells are not real data. inert keeps its cells out of the Tab order too. */}
        <div inert>
          <CalendarHeatmap
            data={sample.data}
            dayTitles={{}}
            edges={sample.edges}
            from={new Date(2025, 0, 1)}
            to={new Date(2025, 11, 31)}
          />
        </div>
        <figcaption className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          What you get, drawn from sample data: teal days are ChatGPT, clay days
          Claude, and split days both.
        </figcaption>
      </figure>
    </section>
  );

  // Step 3
  if (fold)
    return (
      <FoldLayout
        posture={fold}
        controls={
          <>
            <AppBar />
            <main
              id="main-content"
              tabIndex={-1}
              className="px-5 py-6 outline-hidden"
            >
              {hero}
            </main>
          </>
        }
        content={<div className="p-5">{guide}</div>}
      />
    );
  return (
    <div className="flex min-h-dvh flex-col">
      <AppBar />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pt-8 pb-12 sm:px-8">
        <main
          id="main-content"
          tabIndex={-1}
          className="grid flex-1 grid-cols-[minmax(0,1fr)] items-start gap-10 outline-hidden lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16 lg:pt-10"
        >
          {hero}
          {guide}
        </main>
      </div>
    </div>
  );
}
