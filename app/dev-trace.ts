/**
 * One recorded pointer event: [type, ms, x, y, pointer id, pointer type,
 * buttons, pressure, target]. The target is a day (`2025-03-14`), an id, or a
 * tag name; "-" is no element (the pointer left the page).
 */
type Sample = [
  string,
  number,
  number,
  number,
  number,
  string,
  number,
  number,
  string,
];

/** A hover with no press is sent after this long (ms) with no event. */
const IDLE = 1000;

/**
 * Dev only: with `?trace` in the address, records every pointer event and
 * sends each finished press, or hover, to the dev server, which appends it
 * to a file.
 *
 * @remarks
 * For tuning the swipe numbers (components/calendar-swipe.ts, the day
 * sheet, the toasts) from a real thumb, not from defaults, and for finding
 * which boundary events a pen or a mouse sends (a hover that ends with no
 * press). It records places and times only. The production build defines
 * `process.env.NODE_ENV`, so the bundler drops this code.
 *
 * @see scripts/dev.ts, the `/__trace` route.
 */
export function startTrace() {
  if (process.env.NODE_ENV === "production") return;
  if (!new URLSearchParams(location.search).has("trace")) return;
  let press: Sample[] = [];
  let idle: ReturnType<typeof setTimeout> | undefined;
  /** Sends the recorded events with the view, the sheet and the card they led to. */
  const send = () => {
    const sent = press;
    press = [];
    if (!sent.length) return;
    const body = JSON.stringify({
      at: new Date().toISOString(),
      screen: [innerWidth, innerHeight, devicePixelRatio],
      view: document.querySelector("#year-tabs label[data-picked]")?.id,
      sheet: !!document.querySelector(".day-sheet[data-open]"),
      card: !!document.querySelector("#calendar-tip"),
      press: sent,
    });
    void fetch("/__trace", { method: "POST", body, keepalive: true });
  };
  const record = (e: PointerEvent) => {
    const t = e.target instanceof Element ? e.target : null;
    press.push([
      e.type.slice(7),
      Math.round(e.timeStamp),
      Math.round(e.clientX),
      Math.round(e.clientY),
      e.pointerId,
      e.pointerType,
      e.buttons,
      Math.round(e.pressure * 100) / 100,
      t?.getAttribute("data-day") ?? (t?.id || t?.localName || "-"),
    ]);
    clearTimeout(idle);
    // Step 2: A press ended: send it after the click and the view change.
    // A hover with no press goes after a pause, with the card state then.
    if (e.type === "pointerup" || e.type === "pointercancel")
      idle = setTimeout(send, 300);
    else idle = setTimeout(send, IDLE);
  };
  // Step 1: Listen first (capture), so no handler can hide an event. Enter
  // and leave do not bubble, but a capture listener on the document gets them.
  for (const t of [
    "pointerdown",
    "pointermove",
    "pointerup",
    "pointercancel",
    "pointerover",
    "pointerout",
    "pointerenter",
    "pointerleave",
  ] as const)
    document.addEventListener(t, record, {
      capture: true,
      passive: true,
    });
}
