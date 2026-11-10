/** A short message at the bottom of the screen. */
export interface Toast {
  id: number;
  kind: "success" | "error";
  text: string;
}

/** Toasts on screen at most; a new one pushes out the oldest. */
const MAX_TOASTS = 3;

let toasts: readonly Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

/** Shows a toast. Any code can call it; `<Toaster>` draws the list. */
export function toast(kind: Toast["kind"], text: string): void {
  toasts = [...toasts, { id: nextId++, kind, text }].slice(-MAX_TOASTS);
  emit();
}

/** Removes one toast. */
export function dismissToast(id: number): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

/** For `useSyncExternalStore`: adds a change listener and returns its removal. */
export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** For `useSyncExternalStore`: the current list (a new array after each change). */
export const getToasts = (): readonly Toast[] => toasts;
