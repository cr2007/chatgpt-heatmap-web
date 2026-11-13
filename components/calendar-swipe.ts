import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { rubber } from "@/components/year-tabs";

/** A touch that starts this close (px) to a screen edge is left to the browser:
 *  the iOS and Android back swipes start there (published code uses 10 to 20 px). */
export const EDGE = 24;
/** Movement (px) before a touch counts as a swipe; the year pill uses the same. */
export const SLOP = 10;
/**
 * A flick changes the year: at least `distance` px at `speed` px/ms or faster.
 *
 * @see https://cs.android.com/androidx/platform/frameworks/support/+/androidx-main:viewpager/viewpager/src/main/java/androidx/viewpager/widget/ViewPager.java
 *   (MIN_DISTANCE_FOR_FLING 25 dp, MIN_FLING_VELOCITY 400 dp/s)
 */
export const FLING = { distance: 25, speed: 0.4 };
/** A slow pull changes the year at this share of the calendar's width. */
export const COMMIT = 0.25;
/** The rubber band's room (px): the calendar moves less than this under the finger. */
export const PULL = 96;
/** Velocity is measured over this many of the last moves. */
const TRACK = 6;

/**
 * Decides if a press can start a swipe.
 *
 * @remarks
 * A finger and a pen swipe; the browser pans for both, so a press from a
 * screen edge is left to the back swipe. A mouse swipes with its main button
 * only, from anywhere (no back swipe starts from a mouse press).
 *
 * @param e - the press
 * @param width - the window's width, in px
 */
export function startsSwipe(
  e: Pick<PointerEvent, "pointerType" | "isPrimary" | "button" | "clientX">,
  width: number,
) {
  if (!e.isPrimary || e.button !== 0) return false;
  if (e.pointerType === "mouse") return true;
  if (e.pointerType !== "touch" && e.pointerType !== "pen") return false;
  return e.clientX >= EDGE && e.clientX <= width - EDGE;
}

/**
 * Decides where a released swipe goes.
 *
 * @param dx - the finger's way from the start, in px (negative to the left)
 * @param v - the release velocity, in px/ms (negative to the left)
 * @param width - the swipe area's width, in px
 * @returns 1 for the next view (the finger went left), -1 for the previous
 *   one, 0 for none
 */
export function swipeTo(dx: number, v: number, width: number): -1 | 0 | 1 {
  const dir = dx < 0 ? 1 : -1;
  // A flick back toward the start cancels, however far the pull went.
  if (Math.abs(v) >= FLING.speed && Math.sign(v) !== Math.sign(dx)) return 0;
  const flick = Math.abs(dx) >= FLING.distance && Math.abs(v) >= FLING.speed;
  return flick || Math.abs(dx) >= COMMIT * width ? dir : 0;
}

/** What the calendar swipe can go to, and what it does. */
export interface Swipe {
  /** The name of the previous view (a swipe to the right), if there is one. */
  prev?: string;
  /** The name of the next view (a swipe to the left), if there is one. */
  next?: string;
  /** Changes the view: 1 for the next one, -1 for the previous one. */
  onSwipe: (dir: 1 | -1) => void;
}

/**
 * A horizontal swipe on the calendar (a finger, a pen, or a mouse drag) goes
 * to the previous or next view.
 *
 * @remarks
 * The area has `touch-action: pan-y pinch-zoom`, so the browser keeps the
 * vertical scroll and the zoom and sends a horizontal move here. A mouse
 * drag gets no browser pan, and the area selects no text (`select-none`). The
 * calendar follows the finger on a rubber band (it has no next page to
 * show), and a hint at the side names the view it goes to; it fills with
 * the accent once a release would go there. On release the calendar
 * springs back and the page changes the view (the wave or the morph).
 *
 * @param area - the element that takes the touches
 * @param moved - the element that follows the finger
 * @param hints - the hints for a swipe to the right (`prev`) and to the left (`next`)
 * @param swipe - the views and the change; undefined turns the swipe off
 * @param onDrag - called once a press becomes a swipe (to hide a hover card)
 * @returns `swiped`, true from the moment a press became a swipe until the
 *   next press, so its release is not also a tap; and `held`, true while
 *   that swipe is under way, so the calendar shows no hover card meanwhile
 *   (the browser can send a mouse hover as the calendar moves under a pen)
 */
export function useCalendarSwipe(
  area: RefObject<HTMLElement | null>,
  moved: RefObject<HTMLElement | null>,
  hints: RefObject<{ prev: HTMLElement | null; next: HTMLElement | null }>,
  swipe: Swipe | undefined,
  onDrag?: () => void,
) {
  const swiped = useRef(false);
  const held = useRef(false);
  const latest = useRef({ swipe, onDrag });
  useLayoutEffect(() => {
    latest.current = { swipe, onDrag };
  });
  const on = !!swipe && !!(swipe.prev || swipe.next);

  useEffect(() => {
    const el = area.current;
    if (!el || !on) return;
    let press: {
      id: number;
      x0: number;
      y0: number;
      locked: boolean;
      armed: boolean;
      /** Where the calendar stood at the lock (px): a spring back caught mid-way. */
      base: number;
      /** The area's top in the window at the lock (px), for the hint. */
      top: number;
      track: { t: number; x: number }[];
    } | null = null;

    /** Sets the hint of one direction; the other one hides. */
    const hint = (dir: 1 | -1 | 0, y = 0, progress = 0, armed = false) => {
      for (const [key, d] of [
        ["next", 1],
        ["prev", -1],
      ] as const) {
        const h = hints.current[key];
        if (!h) continue;
        const shown = d === dir;
        h.style.opacity = shown ? String(Math.min(1, progress)) : "0";
        // A transform, not `top`: no layout on each move.
        if (shown) h.style.translate = `0 calc(${y}px - 50%)`;
        h.toggleAttribute("data-armed", shown && armed);
      }
    };
    /** Springs the calendar back to rest; reduced motion makes it instant (app/globals.css). */
    const settle = () => {
      const m = moved.current;
      if (!m) return;
      m.style.transition = "translate var(--dur-spring) var(--ease-spring)";
      m.style.translate = "";
      m.addEventListener(
        "transitionend",
        () => (m.style.transition = m.style.willChange = ""),
        { once: true },
      );
      hint(0);
    };

    function down(e: PointerEvent) {
      // Step 1: One finger, a pen or a mouse button, and not from a screen
      // edge (the back swipe).
      if (press) return; // a second finger during a swipe changes nothing
      swiped.current = false;
      if (!startsSwipe(e, window.innerWidth)) return;
      press = {
        id: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        locked: false,
        armed: false,
        base: 0,
        top: 0,
        track: [],
      };
    }
    function move(e: PointerEvent) {
      const p = press;
      if (!p || e.pointerId !== p.id) return;
      const dx = e.clientX - p.x0;
      const dy = e.clientY - p.y0;
      // Step 2: Past the slop, a mostly sideways move becomes a swipe; any other
      // move is left to the browser (it scrolls and cancels the pointer).
      if (!p.locked) {
        if (Math.hypot(dx, dy) < SLOP) return;
        if (Math.abs(dx) <= Math.abs(dy)) return void (press = null);
        p.locked = swiped.current = held.current = true;
        el!.setPointerCapture(e.pointerId);
        // Step 2.1: A spring back still running is caught where it stands.
        const m = moved.current!;
        p.base = parseFloat(getComputedStyle(m).translate) || 0;
        p.top = el!.getBoundingClientRect().top;
        m.style.transition = "";
        m.style.willChange = "translate";
        latest.current.onDrag?.();
      }
      p.track.push({ t: e.timeStamp, x: e.clientX });
      if (p.track.length > TRACK) p.track.shift();
      // Step 3: The calendar follows on a rubber band; with no view that way,
      // a stiffer one.
      const dir = dx < 0 ? 1 : -1;
      const to =
        dir === 1 ? latest.current.swipe?.next : latest.current.swipe?.prev;
      const room = to ? PULL : PULL / 4;
      moved.current!.style.translate = `${p.base + Math.sign(dx) * rubber(Math.abs(dx), room)}px 0`;
      if (!to) return hint(0);
      // Step 3.1: The hint shows the view; it fills once a release goes there.
      const width = el!.clientWidth;
      const armed = swipeTo(dx, 0, width) !== 0;
      if (armed && !p.armed) navigator.vibrate?.(8);
      p.armed = armed;
      hint(dir, e.clientY - p.top, Math.abs(dx) / (COMMIT * width), armed);
    }
    function end(e: PointerEvent) {
      const p = press;
      if (!p || e.pointerId !== p.id) return;
      press = null;
      if (!p.locked) return;
      held.current = false;
      // Step 4: Spring back; a release that goes somewhere changes the view.
      const [a, b] = [p.track[0], p.track.at(-1)];
      const v = a && b && b.t > a.t ? (b.x - a.x) / (b.t - a.t) : 0;
      const dx = e.clientX - p.x0;
      const dir = e.type === "pointerup" ? swipeTo(dx, v, el!.clientWidth) : 0;
      const s = latest.current.swipe;
      // The page measures the old view first (components/calendar-morph.ts),
      // where the calendar still stands, then the spring starts.
      if (dir === 1 && s?.next) s.onSwipe(1);
      if (dir === -1 && s?.prev) s.onSwipe(-1);
      settle();
    }

    el.addEventListener("pointerdown", down);
    // The rest on the window: a press that loses its capture and ends
    // outside the area still ends, so the calendar never stays moved.
    addEventListener("pointermove", move);
    addEventListener("pointerup", end);
    addEventListener("pointercancel", end);
    return () => {
      el.removeEventListener("pointerdown", down);
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", end);
      removeEventListener("pointercancel", end);
    };
  }, [area, moved, hints, on]);

  return { swiped, held };
}
