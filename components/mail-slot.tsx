import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { FileJson } from "lucide-react";
import { cn, plural, splitName } from "@/lib/utils";
import { getFileDrag, subscribeFileDrag } from "@/lib/file-drag";
import {
  CARD,
  cardsFor,
  insertCards,
  type Card,
} from "@/components/mail-motion";

/** Dragged files nearer than this (px) to the zone start to open the flap. */
const NEAR = 420;
/** The flap stands this far open (deg) while files are over the zone; a card pushes it the rest of the way. */
const AJAR = 40;

/** A drop in progress. */
interface Drop {
  /** A new value per drop, so the card list starts again. */
  id: number;
  /** Where it landed, in client px. */
  at: { x: number; y: number };
  /** One card per file ({@link cardsFor}). */
  cards: Card[];
  /** The read; resolves true when the files loaded. */
  read: Promise<boolean>;
}

/**
 * The welcome screen's drop zone: a post box.
 *
 * @remarks
 * The whole zone is the label
 * of the file input (one control, one tab stop); the box is its picture.
 * Dropped or picked files go in as cards (components/mail-motion.ts), and
 * the page keeps this screen until the flap is shut (`onPosting`).
 *
 * @see {@link insertCards}
 */
export function MailSlot({
  inputId,
  progress,
  uploads,
  error,
  onFiles,
  onPosting,
}: {
  /** The id of the file input; the other ids start with it. */
  inputId: string;
  /** Share of bytes read (0 to 1), or null when idle. */
  progress: number | null;
  /** Upload count; a new value restarts the progress line. */
  uploads: number;
  /** The upload error, or "" when there is none. */
  error: string;
  /** Reads the files; resolves true when they loaded. */
  onFiles: (files: FileList) => Promise<boolean>;
  /** True while cards are on their way in, so the page keeps this screen. */
  onPosting: (posting: boolean) => void;
}) {
  const slot = useRef<HTMLDivElement>(null);
  const cardEls = useRef<HTMLElement[]>([]);
  const [drop, setDrop] = useState<Drop | null>(null);
  const [isOver, setIsOver] = useState(false);
  const drag = useSyncExternalStore(subscribeFileDrag, getFileDrag);
  // A small export is read before the cards are in; hold 100% until they are.
  const shown = progress ?? (drop && !error ? 1 : null);
  const isReading = shown !== null;
  // Step 1: Pick the phase: posting, reading, over, ready (files over the
  // page) or idle.
  const phase = drop
    ? "posting"
    : isReading
      ? "reading"
      : isOver
        ? "over"
        : drag.active
          ? "ready"
          : "idle";
  const dragging = phase === "over" || phase === "ready";
  const files = drag.count ? plural(drag.count, "file") : "the files";

  // Step 1.1: While files are dragged, the flap opens as they come near the zone.
  // The angle goes on the flap, once a frame; its CSS transition fills the gaps.
  useEffect(() => {
    const flap = slot.current?.querySelector<HTMLElement>(".mail-flap");
    if (!flap || !drag.active || drop) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const open = () => {
      frame = 0;
      const b = slot.current!.querySelector("label")!.getBoundingClientRect();
      const d = Math.hypot(
        Math.max(b.left - x, 0, x - b.right),
        Math.max(b.top - y, 0, y - b.bottom),
      );
      const near = Math.max(0, 1 - d / NEAR);
      // Squared: it opens mostly in the last part of the way.
      flap.style.transform = `rotateX(${(-AJAR * near * near).toFixed(1)}deg)`;
    };
    const onDrag = (e: DragEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = requestAnimationFrame(open);
    };
    window.addEventListener("dragover", onDrag, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("dragover", onDrag, true);
      flap.style.transform = "";
    };
  }, [drag.active, drop]);

  // Step 2.2: Draw one card per file and run the drop moment, before paint, so
  // a card never shows at the top-left corner.
  useLayoutEffect(() => {
    if (!drop || !slot.current) return;
    onPosting(true);
    const run = insertCards(
      slot.current,
      cardEls.current.slice(0, drop.cards.length),
      drop.at,
      drop.read,
    );
    let live = true;
    void run.done.then(() => live && setDrop(null));
    return () => {
      live = false;
      run.stop();
      onPosting(false);
    };
  }, [drop, onPosting]);

  // Step 2.1: On a drop or a pick, start the drop moment and the read.
  /**
   * Starts the drop moment and the read.
   *
   * @param list - the dropped or picked files
   * @param x - where the cards start, in client px
   * @param y - where the cards start, in client px
   * @see {@link insertCards}
   */
  function take(list: FileList, x: number, y: number) {
    const all = Array.from(list);
    if (!all.length) return;
    performance.mark("mail-drop");
    // A drop's file list is locked after the event: keep the files in a new list.
    const copy = new DataTransfer();
    all.forEach((f) => copy.items.add(f));
    // Step 2.1.1: The read starts one frame later, so the cards show at once. It
    // steers the moment: loaded pushes the last card in, failed slides it out.
    const read = new Promise<boolean>((resolve) =>
      requestAnimationFrame(() =>
        setTimeout(() => resolve(onFiles(copy.files))),
      ),
    );
    setDrop({
      id: performance.now(),
      at: { x, y },
      cards: cardsFor(all),
      read,
    });
  }

  return (
    <div
      ref={slot}
      id={`${inputId}-slot`}
      className="mail-slot relative"
      data-phase={phase}
    >
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- drop target; keyboard users reach the linked file input */}
      <label
        htmlFor={inputId}
        id={`${inputId}-zone`}
        className={cn(
          "group/zone block cursor-pointer rounded-xl border-2 border-dashed select-none",
          "transition-[border-color] duration-(--dur-ui) ease-out",
          // The file input is hidden, so the zone shows its keyboard focus.
          "has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-accent",
          phase === "over" || phase === "posting"
            ? "border-accent/85"
            : phase === "ready"
              ? "border-accent/60"
              : error && phase === "idle"
                ? "border-red-500/60 dark:border-red-400/60"
                : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setIsOver(true);
        }}
        onDragLeave={(e) => {
          // Moving onto a child (the box, the text) also fires dragleave; ignore it.
          if (!e.currentTarget.contains(e.relatedTarget as Node | null))
            setIsOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsOver(false);
          take(e.dataTransfer.files, e.clientX, e.clientY);
        }}
      >
        <span className="flex flex-col items-center rounded-[10px] bg-white px-6 pt-5 pb-5.5 text-center dark:bg-zinc-900">
          <span className="mail-plate">
            <span aria-hidden="true" className="mail">
              <span className="mail-body" />
              <span className="mail-hole" />
              <span className="mail-flap" />
              <span className="mail-hood" />
            </span>
            {/* Step 3: A line under the box shows the read progress, for the eye;
                the progress element below is for screen readers. */}
            <span
              aria-hidden="true"
              className="mail-progress"
              style={{ opacity: isReading ? 1 : 0 }}
            >
              <span
                key={uploads}
                className="mail-progress-fill"
                style={{ transform: `scaleX(${shown ?? 0})` }}
              />
            </span>
          </span>
          <span aria-live="polite" className="text-base font-semibold">
            {isReading ? (
              "Reading files..."
            ) : phase === "over" ? (
              `Release to read ${files}`
            ) : dragging ? (
              `Drop ${files} here`
            ) : (
              <>
                <span className="pointer-coarse:hidden">
                  Drop conversations.json here
                </span>
                <span className="hidden pointer-coarse:inline">
                  Choose conversations.json
                </span>
              </>
            )}
          </span>
          {/* Hidden, not removed, while dragging: the zone keeps its height. */}
          <span
            aria-hidden={isReading}
            className={cn(
              "mt-0.5 text-sm text-zinc-500 tabular-nums dark:text-zinc-400",
              dragging && "invisible",
            )}
          >
            {isReading ? (
              `${Math.round(shown * 100)}%`
            ) : (
              <>
                <span className="pointer-coarse:hidden">
                  or{" "}
                  <span className="font-semibold text-accent-ink underline decoration-transparent decoration-1 underline-offset-3 transition-[text-decoration-color] duration-(--dur-micro) ease-out group-hover/zone:decoration-current">
                    choose files
                  </span>
                </span>
                <span className="hidden pointer-coarse:inline">
                  One export or both
                </span>
              </>
            )}
          </span>
        </span>
        <input
          id={inputId}
          type="file"
          accept="application/json,.json"
          multiple
          className="sr-only"
          onChange={(e) => {
            const input = e.currentTarget;
            const hole = slot
              .current!.querySelector(".mail-hole")!
              .getBoundingClientRect();
            // A picked file starts above the box, as if held over it.
            if (input.files?.length)
              take(input.files, hole.left + hole.width / 2, hole.top - 40);
            input.value = ""; // so picking the same file again fires onChange
          }}
        />
      </label>
      {/* Step 3.1: The native progress element, outside the label, which may
          hold no other form control. */}
      {isReading && (
        <progress
          id={`${inputId}-progress`}
          aria-label="Reading files"
          className="sr-only"
          value={shown}
        />
      )}
      <ul key={drop?.id} aria-hidden="true" className="mail-cards">
        {drop?.cards.map((c, i) => {
          const [head, tail] = splitName(c.name);
          return (
            <li key={i} className="mail-card-clip">
              <span
                ref={(el) => {
                  if (el) cardEls.current[i] = el;
                }}
                style={{ width: CARD.w, height: CARD.h }}
                className="absolute top-0 left-0 flex origin-bottom items-center gap-2.5 rounded-[10px] border border-zinc-200 bg-white px-3 opacity-0 dark:border-zinc-700 dark:bg-zinc-800"
              >
                {/* The lifted shadow, on its own layer so only its opacity moves. */}
                <span className="mail-card-shadow absolute -inset-px rounded-[inherit] shadow-[0_12px_24px_-10px_rgb(0_0_0/0.3),0_2px_6px_rgb(0_0_0/0.08)]" />
                <FileJson
                  className="size-5.5 shrink-0 text-accent"
                  strokeWidth={1.5}
                />
                <span className="flex min-w-0 flex-col text-left">
                  {/* Cut in the middle: the start ends in an ellipsis, the end (with the extension) stays. */}
                  <span className="flex min-w-0 text-[13px] leading-[18px] font-semibold whitespace-nowrap">
                    <span className="min-w-0 truncate">{head}</span>
                    {tail}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {c.meta}
                  </span>
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
