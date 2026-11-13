/** One recorded pointer event: [type, ms, x, y, pointer id, pointer type]. */
type Sample = [string, number, number, number, number, string];

/**
 * Dev only: with `?trace` in the address, records every pointer event and
 * sends each finished press to the dev server, which appends it to a file.
 *
 * @remarks
 * For tuning the swipe numbers (components/calendar-swipe.ts, the day
 * sheet, the toasts) from a real thumb, not from defaults. It records
 * places and times only. The production build defines
 * `process.env.NODE_ENV`, so the bundler drops this code.
 *
 * @see scripts/dev.ts, the `/__trace` route.
 */
export function startTrace() {
  if (process.env.NODE_ENV === "production") return;
  if (!new URLSearchParams(location.search).has("trace")) return;
  let press: Sample[] = [];
  const record = (e: PointerEvent) => {
    press.push([
      e.type.slice(7),
      Math.round(e.timeStamp),
      Math.round(e.clientX),
      Math.round(e.clientY),
      e.pointerId,
      e.pointerType,
    ]);
    if (e.type !== "pointerup" && e.type !== "pointercancel") return;
    // Step 2: A press ended: send it with the view and the sheet it led to
    // (read after the click and the view change).
    const sent = press;
    press = [];
    setTimeout(() => {
      const body = JSON.stringify({
        at: new Date().toISOString(),
        screen: [innerWidth, innerHeight, devicePixelRatio],
        view: document.querySelector("#year-tabs label[data-picked]")?.id,
        sheet: !!document.querySelector(".day-sheet[data-open]"),
        press: sent,
      });
      void fetch("/__trace", { method: "POST", body, keepalive: true });
    }, 300);
  };
  // Step 1: Listen first (capture), so no handler can hide an event.
  for (const t of [
    "pointerdown",
    "pointermove",
    "pointerup",
    "pointercancel",
  ] as const)
    document.addEventListener(t, record, {
      capture: true,
      passive: true,
    });
}
