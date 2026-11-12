/**
 * Whether files are being dragged over the page, and how many. Browsers
 * show only the count and kind of the files before the drop (no names).
 */

/** The state of a file drag over the page. */
export interface FileDrag {
  /** True while files are over the page. */
  active: boolean;
  /** Files in the drag; 0 when the browser does not say. */
  count: number;
}

/**
 * The drag ends this long (ms) after the last dragover.
 *
 * @remarks
 * Real drags from a file manager (Chrome on Linux, logged 2026-11-11) send
 * no dragover while the pointer stands still: gaps of up to 809 ms, and
 * 550 ms just before a drop, so 400 ms dropped the zone back to idle before
 * the drop.
 */
const END_AFTER = 1000;

let state: FileDrag = { active: false, count: 0 };
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;

function set(next: FileDrag) {
  if (next.active === state.active && next.count === state.count) return;
  state = next;
  listeners.forEach((l) => l());
}

const hasFiles = (e: DragEvent) =>
  e.dataTransfer?.types.includes("Files") ?? false;

// Step 1: dragenter and dragover with files mark the drag as active.
function onDrag(e: DragEvent) {
  if (!hasFiles(e)) return;
  // Step 1.1: Each dragover restarts a timer; the drag ends when it runs out (leaving
  // the window or Escape fire no reliable event; Safari's dragleave has no target).
  clearTimeout(timer);
  timer = setTimeout(() => set({ active: false, count: 0 }), END_AFTER);
  set({ active: true, count: e.dataTransfer?.items.length ?? 0 });
  // Step 2: Outside a drop zone, refuse the drop (the cursor shows it), so the
  // browser never opens the file. A drop zone has accepted it on its way up.
  if (e.type === "dragover" && !e.defaultPrevented) {
    e.preventDefault();
    e.dataTransfer!.dropEffect = "none";
  }
}

let started = false;
/** Adds the window listeners once; every drop zone shares them. */
function start() {
  if (started) return;
  started = true;
  window.addEventListener("dragenter", onDrag);
  window.addEventListener("dragover", onDrag);
  window.addEventListener("drop", (e) => {
    if (!e.defaultPrevented) e.preventDefault(); // Step 2: refuse the drop.
    clearTimeout(timer);
    set({ active: false, count: 0 });
  });
}

/**
 * Subscribes to the drag state, for `useSyncExternalStore`.
 *
 * @param listener - Called when the drag starts, ends or changes its count.
 * @returns A function that removes the listener.
 * @see {@link getFileDrag}
 * @see {@link https://react.dev/reference/react/useSyncExternalStore | useSyncExternalStore}
 */
export function subscribeFileDrag(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Gives the current drag state, for `useSyncExternalStore`.
 *
 * @returns The same object until the state changes.
 * @see {@link subscribeFileDrag}
 */
export const getFileDrag = () => state;
