import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn, plural } from "@/lib/utils";
import {
  buildIndex,
  searchZones,
  zoneList,
  type ZoneEntry,
} from "@/lib/time-zones";

/** The search index, built once per visit (about 50 ms). */
let index: ZoneEntry[] | undefined;
const getIndex = () => (index ??= buildIndex(zoneList()));

/** Space in px the list needs below the field before it opens upward. */
const LIST_ROOM = 320;

/**
 * A searchable time zone field (the WAI-ARIA combobox pattern): type a city,
 * a zone, a time name ("Gulf Standard Time"), an abbreviation ("IST") or an
 * offset ("+5:30"); small typos still match. The input id is
 * `${id}-time-zone`; the list adds `-list`, an option `-option-N`.
 *
 * Step 1: On focus, empty the field (the current zone stays as the
 *         placeholder) and open the list. Selecting the text instead fails
 *         in Safari: its mouseup moves the caret to the click point.
 * Step 2: Typing ranks the zones (lib/time-zones.ts); the best one is active.
 * Step 3: Arrow keys move the active option, Enter or a click picks it,
 *         Escape or leaving the field keeps the current zone.
 */
export function TimeZonePicker({
  id,
  timeZone,
  setTimeZone,
  inline = false,
  label = inline ? "Days start at midnight in" : "Time zone",
}: {
  id: string;
  timeZone: string;
  setTimeZone: (timeZone: string) => void;
  /** Label and field in one sentence ("Days start at midnight in ..."), for the welcome screen. */
  inline?: boolean;
  /** The label text; the top bar says "Time zone" in the inline layout. */
  label?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputId = `${id}-time-zone`;
  const listId = `${inputId}-list`;

  // Build the index when the browser is idle, so the first open is instant.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((f) => setTimeout(f, 1500));
    idle(() => getIndex());
  }, []);

  // Step 2: an empty query lists the current zone first, then every zone.
  const results = useMemo(() => {
    if (!open) return [];
    const all = getIndex();
    if (query.trim()) return searchZones(all, query);
    const current = all.find((e) => e.zone === timeZone);
    return current ? [current, ...all.filter((e) => e !== current)] : all;
  }, [open, query, timeZone]);

  // Keep the active option in view while the arrow keys move it.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, results]);

  /** Opens the list, upward when the field is near the bottom of the screen. */
  function openList() {
    const box = inputRef.current?.getBoundingClientRect();
    setUp(
      !!box &&
        window.innerHeight - box.bottom < LIST_ROOM &&
        box.top > LIST_ROOM,
    );
    setActive(0);
    setOpen(true);
  }

  /** Picks a zone and closes the field. */
  function pick(entry: ZoneEntry | undefined) {
    if (entry && entry.zone !== timeZone) setTimeZone(entry.zone);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  }

  // Step 3
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return openList();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive(
        (a) => (a + step + results.length) % Math.max(results.length, 1),
      );
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      if (results[active]) pick(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    }
  }

  const activeId =
    open && results[active] ? `${inputId}-option-${active}` : undefined;

  return (
    <div
      className={
        inline
          ? "flex flex-wrap items-center gap-x-2 gap-y-1"
          : "flex flex-col gap-2"
      }
    >
      <label
        htmlFor={inputId}
        className={
          inline
            ? "text-sm text-zinc-600 dark:text-zinc-400"
            : "text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400"
        }
      >
        {label}
      </label>
      <div className={cn("relative", inline ? "w-64 max-w-full" : "w-full")}>
        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          value={open ? query : timeZone}
          placeholder={timeZone}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className="h-9 w-full rounded-md border border-zinc-200 bg-white pr-8 pl-3 text-sm shadow-xs transition-[border-color,box-shadow] duration-150 placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-hidden dark:border-zinc-800 dark:bg-zinc-950 dark:placeholder:text-zinc-500"
          // Step 1
          onFocus={openList}
          onClick={() => !open && openList()}
          onChange={(e) => {
            setQuery(e.currentTarget.value);
            setActive(0);
            if (!open) openList();
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            setOpen(false);
            setQuery("");
          }}
        />
        <ChevronsUpDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-zinc-400"
        />
        {open && (
          <div
            className={cn(
              "absolute right-0 left-0 z-30 animate-tooltip-in overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg shadow-zinc-950/10 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/40",
              inline && "min-w-80",
              up
                ? "bottom-full mb-1 origin-bottom"
                : "top-full mt-1 origin-top",
            )}
          >
            <ul
              ref={listRef}
              id={listId}
              // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-element-to-interactive-role -- a <select> cannot show this list; the combobox pattern needs a listbox
              role="listbox"
              aria-label="Time zones"
              // Chrome puts a scrolling box in the Tab order; Tab must leave
              // the field for the next control, not land in the list as it closes.
              tabIndex={-1}
              className="max-h-72 overflow-y-auto overscroll-contain p-1"
            >
              {results.map((e, i) => (
                // oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- the combobox pattern: the input handles the keys and points at the option with aria-activedescendant
                <li
                  key={e.zone}
                  id={`${inputId}-option-${i}`}
                  data-index={i}
                  // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-element-to-interactive-role -- a native <option> cannot hold this layout
                  role="option"
                  aria-selected={i === active}
                  // Keeps the focus in the field, so the click picks before the blur closes the list.
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => pick(e)}
                  onMouseMove={() => i !== active && setActive(i)}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-1.5 text-sm",
                    i === active && "bg-zinc-100 dark:bg-zinc-800",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {e.city}
                    </span>
                    {e.area && (
                      <span className="ml-1.5 text-zinc-600 dark:text-zinc-400">
                        {e.area}
                      </span>
                    )}
                    <span className="block truncate text-xs text-zinc-600 dark:text-zinc-400">
                      {e.long}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-zinc-600 tabular-nums dark:text-zinc-400">
                    {e.offset}
                  </span>
                  <Check
                    aria-hidden="true"
                    className={cn(
                      "size-4 shrink-0 text-accent",
                      e.zone !== timeZone && "invisible",
                    )}
                  />
                </li>
              ))}
              {results.length === 0 && (
                <li className="px-2.5 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                  No time zone matches "{query.trim()}". Try a city, a time name
                  such as "Pacific Time", or an offset such as +5:30.
                </li>
              )}
            </ul>
          </div>
        )}
        {/* Tells screen reader users how many zones match. */}
        <p aria-live="polite" className="sr-only">
          {open && query.trim() ? plural(results.length, "time zone") : ""}
        </p>
      </div>
    </div>
  );
}
