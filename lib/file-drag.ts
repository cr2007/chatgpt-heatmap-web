/**
 * Whether files are being dragged over the page, and how many. Browsers
 * show only the count and kind of the files before the drop (no names).
 *
 * Step 1: dragenter and dragover with files mark the drag as active; each
 *         dragover restarts a short timer, and the drag ends when the
 *         timer runs out (leaving the window or Escape fire no reliable
 *         event; Safari sends dragleave with no relatedTarget).
 * Step 2: Outside a drop zone, the drop is refused (the cursor shows it), so
 *         the browser never opens the file in place of the app.
 */

export interface FileDrag {
  active: boolean;
  /** Files in the drag; 0 when the browser does not say. */
  count: number;
}

/** The drag ends this long (ms) after the last dragover. */
const END_AFTER = 400;

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

// Step 1
function onDrag(e: DragEvent) {
  if (!hasFiles(e)) return;
  clearTimeout(timer);
  timer = setTimeout(() => set({ active: false, count: 0 }), END_AFTER);
  set({ active: true, count: e.dataTransfer?.items.length ?? 0 });
  // Step 2: a drop zone has already accepted the drag on its way up.
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
    if (!e.defaultPrevented) e.preventDefault(); // Step 2
    clearTimeout(timer);
    set({ active: false, count: 0 });
  });
}

/** Subscribes to the drag state (for useSyncExternalStore). */
export function subscribeFileDrag(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getFileDrag = () => state;
