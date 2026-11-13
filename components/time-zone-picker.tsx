import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Globe } from "lucide-react";
import { cn, plural } from "@/lib/utils";
import {
  buildIndex,
  nearestFirst,
  searchZones,
  zoneLabel,
  zoneList,
  type ZoneEntry,
} from "@/lib/time-zones";

/** The search index, built once per visit (about 50 ms). */
let index: ZoneEntry[] | undefined;
/** The search index, built on first use ({@link buildIndex}). */
const getIndex = () => (index ??= buildIndex(zoneList()));
/** The list before a search: UTC, then the zones nearest the computer's. */
let nearest: ZoneEntry[] | undefined;
/** The list before a search, made on first use ({@link nearestFirst}). */
const getNearest = () => (nearest ??= nearestFirst(getIndex()));

/** Space in px the list needs below the field before it opens upward. */
const LIST_ROOM = 320;

/**
 * A searchable time zone field (the WAI-ARIA combobox pattern).
 *
 * @remarks
 * Type a city, a zone, a time name ("Gulf Standard Time"), an abbreviation
 * ("IST") or an offset ("+5:30"); small typos still match ({@link searchZones}).
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
 */
export function TimeZonePicker({
  id,
  timeZone,
  setTimeZone,
  inline = false,
  compact = false,
}: {
  /** The id prefix: the input id is `${id}-time-zone`; the list adds
   *  `-list`, an option `-option-N`. */
  id: string;
  /** The IANA zone that the days are counted in. */
  timeZone: string;
  /** Picks a new time zone. */
  setTimeZone: (timeZone: string) => void;
  /**
   * Label and field in one sentence ("Days start at midnight in ..."), for the welcome screen.
   *
   * @defaultValue false
   */
  inline?: boolean;
  /**
   * The top bar: the label is for screen readers only, and a globe in the
   * field marks it, so the bar keeps its room.
   *
   * @defaultValue false
   */
  compact?: boolean;
}) {
  const label = inline ? "Days start at midnight in" : "Time zone";
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

  // Step 2: Before any typing: UTC, then the zones nearest the computer's zone.
  // Typing ranks the zones (lib/time-zones.ts). The best one is active.
  const results = useMemo(() => {
    if (!open) return [];
    return query.trim() ? searchZones(getIndex(), query) : getNearest();
  }, [open, query]);

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
    setActive(
      Math.max(
        0,
        getNearest().findIndex((e) => e.zone === timeZone),
      ),
    );
    setOpen(true);
  }

  /**
   * Picks a zone and closes the field.
   *
   * @param entry - the zone to pick; undefined keeps the current zone
   */
  function pick(entry: ZoneEntry | undefined) {
    if (entry && entry.zone !== timeZone) setTimeZone(entry.zone);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  }

  // Step 3: Arrow keys move the active option, Enter or a click picks it,
  // Escape or leaving the field keeps the current zone.
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
        compact
          ? "flex min-w-0 items-center"
          : inline
            ? "flex flex-wrap items-center gap-x-2 gap-y-1"
            : "flex flex-col gap-2"
      }
    >
      <label
        htmlFor={inputId}
        className={
          compact
            ? "sr-only"
            : inline
              ? "text-sm text-zinc-600 dark:text-zinc-400"
              : "text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400"
        }
      >
        {label}
      </label>
      <div
        className={cn(
          "relative",
          compact
            ? "w-52 min-w-40 shrink"
            : inline
              ? "w-64 max-w-full"
              : "w-full",
        )}
      >
        {compact && (
          <Globe
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-zinc-400"
          />
        )}
        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          value={open ? query : zoneLabel(timeZone)}
          placeholder={timeZone}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          // 16 px on a touch screen: iOS zooms the page into a smaller field.
          className={cn(
            "h-9 w-full rounded-md border border-zinc-200 bg-white pr-8 text-sm shadow-xs pointer-coarse:text-base transition-[border-color,box-shadow] duration-150 placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-hidden dark:border-zinc-800 dark:bg-zinc-950 dark:placeholder:text-zinc-500",
            compact ? "pl-8" : "pl-3",
          )}
          // Step 1: On focus, empty the field (the zone is the placeholder) and open
          // the list. Selecting the text fails in Safari: mouseup moves the caret.
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
              (inline || compact) && "min-w-80",
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
                    {/* The country, or the area for UTC; not twice for a
                        city-state ("Qatar Qatar"). */}
                    {(e.country || e.area) && e.country !== e.city && (
                      <span className="ml-1.5 text-zinc-600 dark:text-zinc-400">
                        {e.country || e.area}
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
