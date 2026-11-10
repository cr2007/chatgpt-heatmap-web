import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import {
  dismissToast,
  getToasts,
  subscribeToasts,
  type Toast,
} from "@/lib/toast";
import { cn } from "@/lib/utils";

/** How long a toast stays, in ms; an error gives more time to read. */
const SHOW_MS = { success: 4000, error: 8000 } as const;
/** Length of the leave transition, in ms. */
const LEAVE_MS = 150;
/** Browsers without the Popover API (Safari before 17) get a plain fixed list. */
const HAS_POPOVER =
  typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype;

/**
 * Draws the toasts in the browser's top layer, above everything else.
 *
 * Step 1: Open the container once as a manual popover; it stays open, so its
 *         polite live region is in place before the first message arrives.
 * Step 2: Draw each toast; screen readers hear it through that region.
 */
export function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts);
  const ref = useRef<HTMLElement>(null);

  // Step 1
  useEffect(() => {
    const el = ref.current;
    // StrictMode runs effects twice in dev; a second showPopover would throw.
    if (HAS_POPOVER && el && !el.matches(":popover-open")) el.showPopover();
  }, []);

  // Step 2
  return (
    <section
      ref={ref}
      popover={HAS_POPOVER ? "manual" : undefined}
      aria-label="Notifications"
      className="pointer-events-none fixed inset-auto bottom-3 left-3 right-3 z-50 m-0 w-auto overflow-visible border-0 bg-transparent p-0 text-inherit sm:left-auto sm:right-4 sm:bottom-4"
    >
      <ol
        aria-live="polite"
        className="flex flex-col items-stretch gap-2 sm:w-[356px]"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </ol>
    </section>
  );
}

/**
 * One toast: it leaves by itself after a while, waits while the pointer or
 * focus is on it, and has a dismiss button.
 *
 * Step 1: Start the timer; hover and focus stop it, leaving starts it again.
 * Step 2: When the time is up (or on dismiss), play the leave transition,
 *         then remove the toast.
 */
function ToastItem({ toast }: { toast: Toast }) {
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Step 1
  const start = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setLeaving(true), SHOW_MS[toast.kind]);
  }, [toast.kind]);
  const stop = () => clearTimeout(timer.current);
  useEffect(() => {
    start();
    return () => clearTimeout(timer.current);
  }, [start]);

  // Step 2
  useEffect(() => {
    if (!leaving) return;
    const done = setTimeout(() => dismissToast(toast.id), LEAVE_MS);
    return () => clearTimeout(done);
  }, [leaving, toast.id]);

  const Icon = toast.kind === "error" ? CircleAlert : CircleCheck;
  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- hover only pauses the timer; the dismiss button is the control
    <li
      onMouseEnter={stop}
      onMouseLeave={start}
      onFocus={stop}
      onBlur={start}
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-lg border bg-white p-4 text-sm shadow-lg dark:bg-neutral-950",
        toast.kind === "error"
          ? "border-red-200 dark:border-red-900/60"
          : "border-neutral-200 dark:border-neutral-800",
        leaving
          ? "translate-y-1 opacity-0 transition-[opacity,translate] duration-150 ease-in"
          : "animate-toast-in",
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "mt-px size-4 shrink-0",
          toast.kind === "error"
            ? "text-red-600 dark:text-red-400"
            : "text-neutral-900 dark:text-neutral-50",
        )}
      />
      <p className="min-w-0 flex-1 break-words text-neutral-950 dark:text-neutral-50">
        {toast.text}
      </p>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => setLeaving(true)}
        className="-m-1 shrink-0 rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus-visible:ring-violet-400"
      >
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </li>
  );
}
