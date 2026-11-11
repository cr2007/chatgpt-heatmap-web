import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn, plural } from "@/lib/utils";
import { PROVIDERS, type ProviderInfo } from "@/lib/providers";
import type { Provider } from "@/lib/types";
import type { LoadedInfo } from "@/components/loaded-files";

/**
 * One loaded export in the top bar: the provider and its chat count, the
 * file name on hover, on keyboard focus or on a tap, and a remove button.
 *
 * Step 1: The chip button's accessible name holds the count and the file
 *         name, so a screen reader hears them without the tip.
 * Step 2: The tip shows on hover (after a short delay) and on focus; a click
 *         or a tap pins it until the next click, a tap outside or Escape.
 */
function Chip({
  p,
  info,
  onClear,
}: {
  p: ProviderInfo;
  info: LoadedInfo;
  onClear: () => void;
}) {
  const [pinned, setPinned] = useState(false);
  const ref = useRef<HTMLLIElement>(null);

  // Step 2: an outside tap or Escape unpins.
  useEffect(() => {
    if (!pinned) return;
    const outside = (e: PointerEvent) =>
      !ref.current?.contains(e.target as Node) && setPinned(false);
    const escape = (e: KeyboardEvent) => e.key === "Escape" && setPinned(false);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [pinned]);

  return (
    <li
      ref={ref}
      id={`export-${p.key}`}
      className="group/chip relative flex h-8 shrink-0 items-center rounded-full border border-zinc-200 bg-white/70 pr-1 text-sm dark:border-zinc-800 dark:bg-zinc-900/60"
    >
      <button
        type="button"
        aria-expanded={pinned}
        onClick={() => setPinned((v) => !v)}
        className="flex h-full items-center gap-2 rounded-full pr-1.5 pl-3 font-medium outline-hidden transition-[scale] duration-(--dur-press) ease-out focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.97]"
      >
        <span
          aria-hidden="true"
          className={cn("size-2.5 rounded-[3px]", p.dot)}
        />
        {p.label}
        <span className="font-normal text-zinc-500 tabular-nums dark:text-zinc-400">
          {plural(info.count, "chat")}
        </span>
        {/* Step 1 */}
        <span className="sr-only">, from {info.name}</span>
      </button>
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove ${p.label} export`}
        title={`Remove ${p.label} export`}
        // The ::before widens the hit area to 40 px without a bigger icon.
        className="relative grid size-6 place-items-center rounded-full text-zinc-500 transition-[background-color,color,scale] duration-(--dur-micro) ease-out before:absolute before:-inset-2 before:content-[''] hover:bg-zinc-100 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-hidden active:scale-[0.92] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
      >
        <X aria-hidden="true" size={14} />
      </button>
      {/* Step 2: for the eye only; the button's name already says it. */}
      <span
        aria-hidden="true"
        data-pinned={pinned || undefined}
        className="pointer-events-none absolute top-full left-0 z-30 mt-2 flex max-w-72 origin-top-left scale-[0.97] flex-col rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs whitespace-nowrap opacity-0 shadow-lg shadow-zinc-950/10 transition-[opacity,scale] duration-(--dur-micro) ease-out group-focus-within/chip:scale-100 group-focus-within/chip:opacity-100 group-hover/chip:scale-100 group-hover/chip:opacity-100 group-hover/chip:delay-150 data-pinned:scale-100 data-pinned:opacity-100 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/40"
      >
        <span className="truncate text-zinc-600 dark:text-zinc-300">
          {info.name}
        </span>
      </span>
    </li>
  );
}

/** The loaded exports as chips in the top bar, ChatGPT first. */
export function ExportChips({
  loaded,
  onClear,
}: {
  loaded: Record<Provider, LoadedInfo | null>;
  onClear: (provider: Provider) => void;
}) {
  return (
    <ul
      id="loaded-exports"
      aria-label="Loaded exports"
      className="flex shrink-0 items-center gap-1.5"
    >
      {PROVIDERS.map((p) => {
        const info = loaded[p.key];
        return (
          info && (
            <Chip
              key={p.key}
              p={p}
              info={info}
              onClear={() => onClear(p.key)}
            />
          )
        );
      })}
    </ul>
  );
}
