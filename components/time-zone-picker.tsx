import { useMemo, useRef, useState } from "react";
import { matchZone, zoneList } from "@/lib/time-zones";

/**
 * A labelled text field with the browser's own suggestion list (`<datalist>`)
 * for picking a time zone. The input id is `${id}-tz`.
 *
 * Step 1: On focus, empty the field and show the current zone as its
 *         placeholder, so typing starts fresh and the list shows every zone.
 *         (Selecting the text instead fails in Safari: its mouseup moves the
 *         caret to the click point.)
 * Step 2: While typing, apply a name the moment it matches a zone exactly
 *         (picking a suggestion does the same).
 * Step 3: Enter on unknown text shows an error. Blur or Escape puts the
 *         current zone back; unknown text leaves a note that says so.
 */
export function TimeZonePicker({
  id,
  timeZone,
  setTimeZone,
  inline = false,
}: {
  id: string;
  timeZone: string;
  setTimeZone: (timeZone: string) => void;
  /** Label and field in one sentence ("Days start at midnight in ..."), for the welcome screen. */
  inline?: boolean;
}) {
  const zones = useMemo(() => zoneList(), []);
  /** The text while the field is being edited; null shows the current zone. */
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState("");
  /** Set by Escape, so the blur that follows reverts without a note. */
  const cancelled = useRef(false);
  const inputId = `${id}-tz`;

  /** Ends editing: the field shows the current zone again. */
  function finish(text: string) {
    if (cancelled.current) {
      cancelled.current = false;
      setError("");
    } else if (text.trim() && !matchZone(text, zones))
      setError(`"${text.trim()}" is not a time zone, so ${timeZone} stays.`);
    setDraft(null);
  }

  return (
    <div
      className={
        inline
          ? "flex flex-wrap items-center gap-x-2 gap-y-1"
          : "form-grid__tz flex flex-col gap-2"
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
        {inline ? "Days start at midnight in" : "Time Zone"}
      </label>
      <input
        id={inputId}
        list={`${inputId}-list`}
        value={draft ?? timeZone}
        placeholder={timeZone}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={`h-9 ${inline ? "w-56" : "w-full"} rounded-md border border-neutral-200 bg-white px-3 text-sm shadow-xs transition-[border-color,box-shadow] duration-150 placeholder:text-zinc-400 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500 aria-invalid:border-red-500/60 dark:border-neutral-800 dark:bg-neutral-950 dark:placeholder:text-zinc-500 dark:focus-visible:ring-violet-400 dark:aria-invalid:border-red-400/60`}
        // Step 1
        onFocus={() => {
          setError("");
          setDraft("");
        }}
        // Step 2
        onChange={(e) => {
          const text = e.currentTarget.value;
          setDraft(text);
          setError("");
          const zone = matchZone(text, zones);
          if (zone && zone !== timeZone) setTimeZone(zone);
        }}
        // Step 3
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            cancelled.current = true;
            e.currentTarget.blur();
          } else if (e.key === "Enter" && draft !== null) {
            if (!draft.trim() || matchZone(draft, zones))
              e.currentTarget.blur();
            else setError("Pick a time zone from the list.");
          }
        }}
        onBlur={(e) => finish(e.currentTarget.value)}
      />
      <datalist id={`${inputId}-list`}>
        {zones.map((zone) => (
          // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- a datalist option is a suggestion, labelled by its value
          <option key={zone} value={zone} />
        ))}
      </datalist>
      {error && (
        <p
          id={`${inputId}-error`}
          aria-live="polite"
          className="basis-full text-xs text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}
