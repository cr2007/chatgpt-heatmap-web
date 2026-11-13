import { useEffect, useId, useLayoutEffect, useRef } from "react";
import { cn, count } from "@/lib/utils";
import type { YearView } from "@/lib/layout";

/** How a view change came: a click or a tap, the keyboard (the arrow keys or Space), or a drag of the pill. */
export type How = "pointer" | "key" | "drag";

/** Movement (px) before a press turns into a drag: Motion uses 3 px for a mouse, Vaul and Embla 10 px for a finger. */
const START = { mouse: 3, touch: 10 };
/**
 * The flick deceleration rate per ms: 0.99 is UIKit's fast rate.
 *
 * @remarks
 * WWDC18 "Designing Fluid Interfaces": a flick comes to rest v * d / (1 - d) px further, v in px/ms.
 *
 * @see https://developer.apple.com/videos/play/wwdc2018/803/
 */
const DECELERATION = 0.99;
/** The held pill lifts, as the iOS 26 lens does; 1.04 keeps it inside the row's 2 px padding. */
const HELD = 1.04;
/** Between two tabs the pill holds on a tab for this share of the way at each end. */
const MAGNET = 0.22;
/** Velocity is measured over this many of the last moves. */
const TRACK = 6;
/** The layout of a tab: a button and its copy in the pill must match to the pixel. */
const LABEL =
  "flex h-8 shrink-0 items-baseline gap-1.5 rounded-md px-3 text-sm";
/** The row's padding (px, p-0.5): where the first tab starts. */
const PAD = 2;

/**
 * The iOS rubber band: past an end, the pill moves less the further you pull.
 *
 * @param x - how far the pointer is past the end, in px
 * @param d - the room the pill may use, in px
 * @returns how far the pill moves past the end, in px (less than `d`)
 */
export const rubber = (x: number, d: number) =>
  (1 - 1 / ((x * 0.55) / d + 1)) * d;

/**
 * The magnet between two tabs: the pill stays on a tab near each end.
 *
 * The pill crosses the middle faster. Continuous, so the pill never jumps.
 *
 * @param t - the pointer's way from one tab (0) to the next (1)
 * @param share - the share of the way at each end where the pill holds,
 *   0 to 0.5
 * @returns the pill's way from one tab to the next, 0 to 1
 */
export const magnet = (t: number, share: number) =>
  Math.min(1, Math.max(0, (t - share) / (1 - 2 * share)));

/**
 * How far a flick carries on after the release.
 *
 * @param v - the release velocity, in px/ms
 * @returns the extra distance, in px (negative for a flick to the left)
 * @see {@link DECELERATION}
 */
export const project = (v: number) => (v * DECELERATION) / (1 - DECELERATION);

/**
 * The calendar view picker: "All years" or one year with its total.
 *
 * @remarks
 * It is a native radio group in a fieldset (WAI-ARIA APG radio group): Tab
 * enters at the picked year, the arrow keys pick the next or the
 * previous one, Space picks the focused one. Each year is a label around a
 * visually hidden radio. A pill marks the picked year; it lies over the
 * labels and holds a copy of them, moved against the pill so each sits on
 * its label. The pill clips that copy, so a label takes the pill's colours
 * exactly at its edge (as the iOS 26 lens does). The labels stay the click
 * targets; the pill takes no pointer. A keyboard pick moves the pill at
 * once (`data-instant`): no motion on a keyboard action.
 *
 * The pill can be dragged: press the picked year and slide. While held the
 * row has `data-state` ("pressed", "dragging") and the pill is accent glass
 * (app/globals.css, `.year-pill`).
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/radio/
 * @see {@link rubber}, {@link magnet} and {@link project} for the drag motion.
 */
export function YearTabs({
  years,
  totals,
  view,
  onView,
}: {
  /** Years with prompts, ascending. */
  years: number[];
  /** Prompts per year, in the order of `years`. */
  totals: number[];
  /** The picked view: "all" or one year. */
  view: YearView;
  /** Changes the view; `how` ({@link How}) is `key` for a keyboard pick, so the page can skip the motion. */
  onView: (view: YearView, how: How) => void;
}) {
  const row = useRef<HTMLFieldSetElement>(null);
  const pill = useRef<HTMLSpanElement>(null);
  const copy = useRef<HTMLSpanElement>(null);
  // A total that grows (a time zone change, a streaming upload) widens its
  // button but not the scrolling row, so the labels are part of the key.
  const labels = `${years.join()}|${totals.join()}`;
  /** The drag in progress, if any. */
  const drag = useRef<{
    id: number;
    x0: number;
    left0: number;
    on: boolean;
    track: { t: number; x: number }[];
  } | null>(null);
  const swallow = useRef(false);
  /** What made the last input: a pick from the keyboard gets no motion. */
  const via = useRef<"pointer" | "key">("pointer");
  const name = useId();

  /** The tab labels, in order. */
  const tabs = () => [
    ...(row.current?.querySelectorAll<HTMLLabelElement>(":scope > label") ??
      []),
  ];
  /** The view that a tab stands for. */
  const viewOf = (b: HTMLElement) =>
    (b.dataset.view === "all" ? "all" : Number(b.dataset.view)) as YearView;
  /**
   * Draws the pill; its label copy moves the other way, so the labels stay
   * on their buttons.
   *
   * @param left - the pill's left edge, in px in the row
   * @param width - the pill's width, in px
   */
  const paint = (left: number, width: number) => {
    pill.current!.style.translate = `${left}px 0`;
    pill.current!.style.width = `${width}px`;
    copy.current!.style.translate = `${PAD - left}px 0`;
  };
  /** Puts the pill on a button (the CSS spring moves it unless a drag holds it). */
  const placeOn = (b: HTMLElement) => paint(b.offsetLeft, b.offsetWidth);
  /** Scrolls the row (never the page) so a tab sits in its middle, clear of the edge fades. */
  const center = (b: HTMLElement) => {
    row.current!.scrollLeft =
      b.offsetLeft + b.offsetWidth / 2 - row.current!.clientWidth / 2;
  };
  /** Pressed or dragging, or none (rest). */
  const setState = (s?: "pressed" | "dragging") => {
    if (s) row.current!.dataset.state = s;
    else delete row.current!.dataset.state;
  };
  /** The glow starts under the pointer: its place in the pill, set on the pill only, so no other element restyles. */
  const glow = (e: React.PointerEvent) => {
    const r = pill.current!.getBoundingClientRect();
    pill.current!.style.setProperty(
      "--gx",
      `${((e.clientX - r.left) / r.width) * 100}%`,
    );
  };
  /**
   * Finds the tab whose middle is nearest to a point.
   *
   * @param x - the point, in px in the row
   * @returns the label of that tab
   */
  const nearest = (x: number) => {
    const mid = (b: HTMLElement) =>
      Math.abs(b.offsetLeft + b.offsetWidth / 2 - x);
    return tabs().reduce((best, b) => (mid(b) < mid(best) ? b : best));
  };

  // Step 1: Keep the picked year in view and put the pill on it, again when the
  // row resizes.
  useLayoutEffect(() => {
    const el = row.current;
    const on = el?.querySelector<HTMLElement>(":scope > label[data-picked]");
    if (!el || !on || drag.current?.on) return;
    /** The row clips (and scrolls) only when its tabs do not fit, so a pill
     *  pulled past an end, and its shadow, can show past the row's edge. */
    const fit = () => {
      const last = tabs().at(-1)!;
      el.toggleAttribute(
        "data-fits",
        last.offsetLeft + last.offsetWidth + PAD <= el.clientWidth + 0.5,
      );
    };
    /** Marks each side where more years hide, for the edge fades (app/globals.css). */
    const edges = () => {
      el.toggleAttribute("data-more-left", el.scrollLeft > 1);
      el.toggleAttribute(
        "data-more-right",
        el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
      );
    };
    fit();
    // Step 1.1: On a phone the row scrolls sideways (it clips only when its
    // years do not fit). Scroll the row only, never the page.
    center(on);
    edges();
    el.addEventListener("scroll", edges, { passive: true });
    // Step 1.2: Place the pill; it slides only after its first placement.
    placeOn(on);
    // A keyboard pick placed the pill at once; later moves slide again.
    requestAnimationFrame(() => el.removeAttribute("data-instant"));
    const resize = new ResizeObserver(() => {
      if (drag.current?.on) return;
      fit();
      edges();
      placeOn(on);
    });
    resize.observe(el);
    return () => {
      resize.disconnect();
      el.removeEventListener("scroll", edges);
    };
  }, [view, labels]);
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      row.current?.setAttribute("data-ready", ""),
    );
    return () => cancelAnimationFrame(frame);
  }, []);

  /**
   * Draws the pill for a pointer during a drag.
   *
   * @param x - where the pointer would put the pill's left edge, in px in
   *   the row
   * @see {@link rubber} past an end, {@link magnet} between two tabs.
   */
  function follow(x: number) {
    const bs = tabs();
    const first = bs[0];
    const last = bs.at(-1)!;
    // Step 2.1: Past the first or the last tab the pill is rubber-banded.
    if (x <= first.offsetLeft || x >= last.offsetLeft) {
      const end = x < first.offsetLeft ? first : last;
      paint(
        end === first
          ? first.offsetLeft -
              rubber(first.offsetLeft - x, first.offsetWidth / 2)
          : last.offsetLeft + rubber(x - last.offsetLeft, last.offsetWidth / 2),
        end.offsetWidth,
      );
      return;
    }
    // Step 2.2: Between two tabs the magnet holds it near each tab, and its
    // width blends from one tab to the other.
    const i = bs.findLastIndex((b) => b.offsetLeft <= x);
    const [a, b] = [bs[i], bs[i + 1]];
    const t = magnet(
      (x - a.offsetLeft) / (b.offsetLeft - a.offsetLeft),
      MAGNET,
    );
    paint(
      a.offsetLeft + (b.offsetLeft - a.offsetLeft) * t,
      a.offsetWidth + (b.offsetWidth - a.offsetWidth) * t,
    );
  }

  function onPointerDown(e: React.PointerEvent<HTMLFieldSetElement>) {
    via.current = "pointer";
    row.current?.removeAttribute("data-keys");
    // One pointer at a time, and only from the picked year.
    if (drag.current || e.button !== 0) return;
    const on = (e.target as Element).closest<HTMLLabelElement>(
      "label[data-picked]",
    );
    if (!on) return;
    drag.current = {
      id: e.pointerId,
      x0: e.clientX,
      left0: on.offsetLeft,
      on: false,
      track: [],
    };
    pill.current!.style.scale = String(HELD);
    glow(e);
    setState("pressed");
  }
  function onPointerMove(e: React.PointerEvent<HTMLFieldSetElement>) {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x0;
    // Step 2: A press on the picked year may become a drag: past START px it
    // captures the pointer, and the pill follows (`follow`).
    if (!d.on) {
      const start = e.pointerType === "mouse" ? START.mouse : START.touch;
      if (Math.abs(dx) < start) return;
      d.on = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      setState("dragging");
    }
    d.track.push({ t: e.timeStamp, x: e.clientX });
    if (d.track.length > TRACK) d.track.shift();
    follow(d.left0 + dx);
    glow(e);
  }
  /**
   * Ends a press or a drag of the pill.
   *
   * @param e - the pointer up or cancel event
   * @param cancel - true for a cancelled pointer: the view does not change
   */
  function end(e: React.PointerEvent<HTMLFieldSetElement>, cancel: boolean) {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    pill.current!.style.scale = "";
    setState();
    if (!d.on) return; // a press with no drag: the click does the rest
    // The click that ends a drag comes in this task; any later click is real.
    swallow.current = true;
    setTimeout(() => (swallow.current = false));
    // Step 3: On release, pick the year the flick points at, spring the pill to it
    // and change the view. A cancelled pointer puts the pill back, no change.
    const [a, b] = [d.track[0], d.track.at(-1)!];
    const v = a && b.t > a.t ? (b.x - a.x) / (b.t - a.t) : 0;
    const target = cancel
      ? tabs().find((t) => viewOf(t) === view)!
      : nearest(
          d.left0 +
            e.clientX -
            d.x0 +
            project(v) +
            pill.current!.offsetWidth / 2,
        );
    placeOn(target);
    if (viewOf(target) !== view) onView(viewOf(target), "drag");
  }

  const items = [
    ...(years.length > 1
      ? [{ v: "all" as YearView, label: "All years", total: undefined }]
      : []),
    ...years.map((y, i) => ({
      v: y as YearView,
      label: String(y),
      total: totals[i],
    })),
  ];
  /** A tab's label and count; a button and its copy in the pill share it, so both lay out the same. */
  const content = (label: string, total: number | undefined) => (
    <>
      <span className="leading-8">{label}</span>
      {total !== undefined && (
        <span className="year-count text-xs text-zinc-600 dark:text-zinc-400">
          {count(total)}
          <span className="sr-only"> prompts</span>
        </span>
      )}
    </>
  );
  return (
    <fieldset
      ref={row}
      id="year-tabs"
      // The row has its own sideways scroll and drag: no calendar swipe from it.
      data-no-swipe
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => end(e, false)}
      onPointerCancel={(e) => end(e, true)}
      // Before a drag the pointer is not captured, so a release outside
      // never reaches the row: leaving it ends the press.
      onPointerLeave={(e) => drag.current && !drag.current.on && end(e, true)}
      className="year-tabs relative isolate flex max-w-full min-w-0 gap-0.5 overflow-x-auto overscroll-x-contain rounded-lg bg-zinc-100 p-0.5 [scrollbar-width:none] dark:bg-zinc-900"
    >
      <legend className="sr-only">Years to show</legend>
      {items.map(({ v, label, total }) => (
        <label
          key={String(v)}
          id={`year-tab-${v}`}
          data-view={v}
          data-picked={view === v || undefined}
          className={cn(
            LABEL,
            "relative cursor-pointer transition-[color,scale] duration-(--dur-press) ease-out select-none has-focus-visible:ring-2 has-focus-visible:ring-accent has-focus-visible:outline-hidden active:scale-[0.97]",
            view === v
              ? "year-tab-grab font-medium text-zinc-900 dark:text-zinc-50"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
          )}
        >
          <input
            type="radio"
            name={name}
            value={String(v)}
            checked={view === v}
            // The browser scrolls a focused year only to the row's edge, under a fade.
            onFocus={(e) => center(e.currentTarget.parentElement!)}
            onKeyDown={() => {
              via.current = "key";
              // WebKit drops :focus-visible when an arrow key moves focus in a
              // radio group; the row keeps the keyboard's focus ring on (app/globals.css).
              row.current?.setAttribute("data-keys", "");
            }}
            onClick={(e) => {
              // The click that ends a drag (same task) must not pick the year under it.
              if (!swallow.current) return;
              swallow.current = false;
              e.preventDefault();
            }}
            onChange={() => {
              // Step 4: A pick by click, tap or key (a radio's change) changes the
              // view. A pick by key marks the row (`data-instant`), so the pill
              // moves at once (see app/globals.css); Step 1 clears the mark on
              // the next frame.
              if (via.current === "key")
                row.current?.setAttribute("data-instant", "");
              onView(v, via.current);
            }}
            className="sr-only"
          />
          {content(label, total)}
        </label>
      ))}
      {/* The pill, over the buttons: its own copy of the labels, in the pill's colours. */}
      <span
        ref={pill}
        aria-hidden="true"
        // ring-zinc-500: the picked year must differ from the row by 3:1 (WCAG 1.4.11; 4.4:1 light, 3.7:1 dark).
        className="year-pill pointer-events-none absolute top-0.5 left-0 h-8 rounded-md bg-white shadow-xs ring-1 ring-zinc-500 dark:bg-zinc-800"
      >
        <span
          ref={copy}
          inert
          className="year-pill-labels absolute top-0 left-0 flex gap-0.5"
        >
          {items.map(({ v, label, total }) => (
            <span
              key={String(v)}
              className={cn(LABEL, view === v && "font-medium")}
            >
              {content(label, total)}
            </span>
          ))}
        </span>
      </span>
    </fieldset>
  );
}
