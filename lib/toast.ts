/** A short message at the bottom of the screen. */
export interface Toast {
  /** Unique, rising number; pass it to {@link dismissToast}. */
  id: number;
  /** "success" or "error"; sets the icon and the color. */
  kind: "success" | "error";
  /** The message. */
  text: string;
}

/** Toasts on screen at most; a new one pushes out the oldest. */
const MAX_TOASTS = 3;

let toasts: readonly Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

/**
 * Shows a toast. Any code can call it; `<Toaster>` draws the list.
 *
 * @remarks
 * At most {@link MAX_TOASTS} stay on screen; a new one pushes out the oldest.
 *
 * @param kind - "success" or "error".
 * @param text - The message.
 * @see components/toaster.tsx
 */
export function toast(kind: Toast["kind"], text: string): void {
  toasts = [...toasts, { id: nextId++, kind, text }].slice(-MAX_TOASTS);
  emit();
}

/**
 * Removes one toast.
 *
 * @param id - The `id` of the toast.
 */
export function dismissToast(id: number): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

/**
 * Adds a change listener, for `useSyncExternalStore`.
 *
 * @param listener - Called after each change to the list.
 * @returns A function that removes the listener.
 * @see {@link getToasts}
 * @see {@link https://react.dev/reference/react/useSyncExternalStore | useSyncExternalStore}
 */
export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Gives the current list, for `useSyncExternalStore`.
 *
 * @returns The toasts, oldest first (a new array after each change).
 * @see {@link subscribeToasts}
 */
export const getToasts = (): readonly Toast[] => toasts;
