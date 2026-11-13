import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";
import { rubber } from "@/components/year-tabs";
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
/** Movement (px) before a press becomes a swipe and picks its axis. */
const LOCK_PX = 4;
/**
 * A swipe this long (px) or this fast (px/ms, from the press) dismisses.
 *
 * @see https://github.com/emilkowalski/sonner/blob/main/src/index.tsx (SWIPE_THRESHOLD, 0.11)
 */
const SWIPE = { px: 45, speed: 0.11 } as const;
/** Upward room (px) of the rubber band; up is not a dismiss direction. */
const RUBBER_PX = 16;
/** Browsers without the Popover API (Safari before 17) get a plain fixed list. */
const HAS_POPOVER =
  typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype;

/**
 * Draws the toasts in the browser's top layer, above everything else.
 *
 * Without the Popover API the list is a plain fixed element instead.
 *
 * @see {@link getToasts}
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Popover_API
 */
export function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts);
  const ref = useRef<HTMLElement>(null);

  // Step 1: Open the container once as a manual popover. It stays open, so its
  // polite live region is in place before the first message arrives.
  useEffect(() => {
    const el = ref.current;
    // StrictMode runs effects twice in dev; a second showPopover would throw.
    if (HAS_POPOVER && el && !el.matches(":popover-open")) el.showPopover();
  }, []);

  // Step 2: Draw each toast; screen readers hear it through that region.
  return (
    <section
      ref={ref}
      id="toasts"
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
 * Shows one toast message with a dismiss button.
 *
 * It leaves by itself after a while ({@link SHOW_MS}), and waits while the
 * pointer or focus is on it, or while a finger holds it.
 *
 * @remarks
 * A swipe sideways or down (the edge it rose from) dismisses it; up only
 * rubber-bands. The button stays the keyboard path (WCAG 2.5.1).
 *
 * @param props - `toast`, the message to show ({@link Toast})
 */
function ToastItem({ toast }: { toast: Toast }) {
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Step 1: Start the timer; hover and focus stop it, leaving starts it again.
  const start = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setLeaving(true), SHOW_MS[toast.kind]);
  }, [toast.kind]);
  const stop = () => clearTimeout(timer.current);
  useEffect(() => {
    start();
    return () => clearTimeout(timer.current);
  }, [start]);

  // Step 2: When the time is up (or on dismiss), play the leave transition,
  // then remove the toast.
  useEffect(() => {
    if (!leaving) return;
    const done = setTimeout(() => dismissToast(toast.id), LEAVE_MS);
    return () => clearTimeout(done);
  }, [leaving, toast.id]);

  // Step 3: Swipe. The press waits for LOCK_PX of movement, so a tap on the
  // button stays a click; then the toast follows the pointer, without renders.
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    t: number;
    axis?: "x" | "y";
  } | null>(null);
  /** Set by a swipe, so the click that ends it does not press the button. */
  const swiped = useRef(false);
  const onPointerDown = (e: React.PointerEvent) => {
    if (drag.current || !e.isPrimary || e.button !== 0) return;
    drag.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      t: e.timeStamp,
    };
    swiped.current = false;
    stop();
  };
  const onPointerMove = (e: React.PointerEvent<HTMLLIElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const el = e.currentTarget;
    // Step 3.1: Lock the axis of the larger movement and capture the pointer.
    if (!d.axis) {
      const [mx, my] = [e.clientX - d.x, e.clientY - d.y];
      if (Math.max(Math.abs(mx), Math.abs(my)) < LOCK_PX) return;
      d.axis = Math.abs(mx) > Math.abs(my) ? "x" : "y";
      swiped.current = true;
      el.setPointerCapture(e.pointerId);
      // A spring back still running is caught where it stands.
      const m = new DOMMatrix(getComputedStyle(el).transform);
      d.x -= m.m41;
      d.y -= m.m42;
      el.style.transition = "none";
    }
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    // Step 3.2: Follow 1:1, but resist upward.
    el.style.transform =
      d.axis === "x"
        ? `translateX(${dx}px)`
        : `translateY(${dy > 0 ? dy : -rubber(-dy, RUBBER_PX)}px)`;
  };
  const onPointerEnd = (e: React.PointerEvent<HTMLLIElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    drag.current = null;
    // A mouse still on the toast keeps the timer stopped until it leaves.
    if (e.pointerType !== "mouse") start();
    if (!d.axis) return;
    const el = e.currentTarget;
    const move = d.axis === "x" ? e.clientX - d.x : e.clientY - d.y;
    const allowed = d.axis === "x" || move > 0;
    const far =
      Math.abs(move) >= SWIPE.px ||
      Math.abs(move) / (e.timeStamp - d.t) > SWIPE.speed;
    // Step 3.3: Past the threshold it leaves the way it went and fades;
    // else it springs back. Reduced motion makes both instant (globals.css).
    if (e.type === "pointerup" && allowed && far) {
      const to = `calc(${move}px + ${Math.sign(move) * 100}%)`;
      el.style.transition =
        "transform var(--dur-micro) var(--ease-out), opacity var(--dur-micro) var(--ease-out)";
      el.style.transform =
        d.axis === "x" ? `translateX(${to})` : `translateY(${to})`;
      el.style.opacity = "0";
      setTimeout(() => dismissToast(toast.id), LEAVE_MS);
    } else {
      el.style.transition = "transform var(--dur-spring) var(--ease-spring)";
      el.style.transform = "";
    }
  };

  const Icon = toast.kind === "error" ? CircleAlert : CircleCheck;
  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- hover only pauses the timer; the dismiss button is the control
    <li
      onMouseEnter={stop}
      onMouseLeave={start}
      onFocus={stop}
      onBlur={start}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onClickCapture={(e) => {
        if (swiped.current && e.detail) e.stopPropagation(); // a key press has detail 0
      }}
      // Hand the leave transition back to the class once a snap back ends.
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && !drag.current)
          e.currentTarget.style.transition = "";
      }}
      className={cn(
        "pointer-events-auto flex touch-none select-none items-start gap-3 rounded-lg border bg-white p-4 text-sm shadow-lg dark:bg-zinc-950",
        toast.kind === "error"
          ? "border-red-200 dark:border-red-900/60"
          : "border-zinc-200 dark:border-zinc-800",
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
            : "text-zinc-900 dark:text-zinc-50",
        )}
      />
      <p className="min-w-0 flex-1 break-words text-zinc-950 dark:text-zinc-50">
        {toast.text}
      </p>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => setLeaving(true)}
        className="-m-1 shrink-0 rounded p-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
      >
        <X aria-hidden="true" className="size-3.5" />
      </button>
    </li>
  );
}
