/**
 * The mail slot drop moment (components/mail-slot.tsx). Web Animations on
 * transform and opacity only; a card's clip is set once, never animated. A
 * card moves to the opening (faster once the read is done), its front edge
 * pushes the flap in, it slides in at its own pace (never faster), and the
 * flap snaps shut behind the last card. The order and the feel come from a
 * frame-by-frame study of a letter being posted (the flap opens on contact,
 * rests on the letter, and snaps shut with no rebound); the times are UI
 * times, not to scale. These timings are measured as one set, so they stay
 * here as constants and do not use the --dur-* tokens.
 */

/** Card size (px); mail-slot.tsx draws the card at this size. */
export const CARD = { w: 232, h: 52 };
/** At most this many cards; more files share the last one. */
export const MAX_CARDS = 4;

/**
 * A damped spring as CSS linear(), from SwiftUI's spring(duration:bounce:)
 * (WWDC23 "Animate with springs"): damping ratio = 1 - bounce, period =
 * `perceptual` ms. With `stop`, the motion ends where it first reaches its
 * target, as a flap stopped by its frame: it hits the stop with speed left
 * and has no overshoot. Returns the easing and the duration.
 */
export function spring(bounce: number, perceptual: number, stop = false) {
  const zeta = 1 - bounce;
  const w = (2 * Math.PI) / perceptual;
  const wd = w * Math.sqrt(1 - zeta * zeta);
  // x(t) = 1 first where tan(wd t) = -wd / (zeta w). Else cut where the
  // envelope is under 0.5%: the rest of the tail is invisible.
  const end = stop
    ? (Math.PI - Math.atan(wd / (zeta * w))) / wd
    : Math.log(200) / (zeta * w);
  const x = (t: number) =>
    1 -
    Math.exp(-zeta * w * t) *
      (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t));
  const n = stop ? 20 : 60;
  const points = Array.from(
    { length: n + 1 },
    (_, i) => +x((end * i) / n).toFixed(4),
  );
  points[n] = 1;
  return { easing: `linear(${points.join(", ")})`, duration: Math.round(end) };
}

/** The flap snaps shut in about 65 ms and stops on its frame. */
const SNAP = spring(0.65, 200, true);
/**
 * Timings (ms). approach: from the drop point to the opening. next: from
 * one card to the next. open: the flap opens as a card's edge pushes it.
 * pass: from the push until the card is out of sight. hold: a card that
 * waits for the read slides partly in. push: from there until out of
 * sight. out: a card the read refused slides back out. appear: the fade in.
 * Only appear, next and approach run faster once the read is done.
 */
const T = {
  approach: 220,
  next: 50,
  open: 80,
  pass: 180,
  hold: 160,
  push: 180,
  out: 200,
  appear: 90,
};
/** Lean (deg, the top edge toward you): at the push, and as the card slides in. */
const LEAN = { push: 34, in: 62 };
/** The flap opens this far (deg) when a card pushes it, and rests on the card. */
const FLAP = 64;
/** A card slides this share of its length in; the slow end of its easing is out of sight. */
const OVER = 1.3;
/** Perspective (px) of a card: the part inside shrinks toward the opening. */
const DEPTH = 420;
/** How far (px) the way rises over the opening: an arc, so a card swoops in and never turns on a point. */
const LIFT = 18;
/** Keyframes on the arc; enough for a smooth curve. */
const STEPS = 8;
/** Once the read is done, the approach runs this much faster. */
const RUSH = 4;
/** Behind the front card, each card sits this much up, left and turned (the stack in the hand). */
const FAN = { rotate: -5, x: -16, y: -8 };
/** Space (px) at each side of a card in the opening; the open flap shows there. */
const MARGIN = 12;
/** While the read goes on, the last card waits with this share of its length in. */
const WAIT_IN = 0.3;
/** Arrives with speed left (end slope 0.2), so a card never stops dead at the opening. */
const ARRIVE = "cubic-bezier(0.3, 0.7, 0.55, 0.9)";
/**
 * Starts at speed (start slope 1), at about the arrival speed; slows out of
 * sight. A held card uses it too: it answers the read at once.
 */
const SLIDE = "cubic-bezier(0.3, 0.3, 0.25, 1)";

/**
 * The share of the time at which a cubic-bezier easing reaches progress y
 * (bisection on the curve parameter), so a step can run when a card passes
 * a point on its way.
 */
function timeAt(easing: string, y: number) {
  const [x1, y1, x2, y2] = (easing.match(/-?[\d.]+/g) ?? []).map(Number);
  const at = (p1: number, p2: number, s: number) =>
    3 * (1 - s) ** 2 * s * p1 + 3 * (1 - s) * s * s * p2 + s ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (at(y1, y2, mid) < y) lo = mid;
    else hi = mid;
  }
  return at(x1, x2, lo);
}

/** "34.9 MB", "16 kB", "512 B". */
export function fileSize(bytes: number) {
  const units = ["byte", "kilobyte", "megabyte", "gigabyte"];
  const i = Math.min(3, Math.floor(Math.log10(Math.max(bytes, 1)) / 3));
  if (i === 0) return `${bytes} B`;
  return new Intl.NumberFormat(undefined, {
    style: "unit",
    unit: units[i],
    unitDisplay: "short",
    maximumFractionDigits: 1,
  }).format(bytes / 1000 ** i);
}

/** One file card: the real name and size, known only after the drop. */
export interface Card {
  name: string;
  meta: string;
}

/** The cards for a drop: one per file, up to MAX_CARDS; the last one holds the rest. */
export function cardsFor(files: { name: string; size: number }[]): Card[] {
  const card = (f: { name: string; size: number }) => ({
    name: f.name,
    meta: fileSize(f.size),
  });
  if (files.length <= MAX_CARDS) return files.map(card);
  const rest = files.slice(MAX_CARDS - 1);
  return [
    ...files.slice(0, MAX_CARDS - 1).map(card),
    {
      name: `${rest.length} more files`,
      meta: fileSize(rest.reduce((n, f) => n + f.size, 0)),
    },
  ];
}

const token = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();
/** Thrown inside the run when the drop moment is stopped (a newer drop). */
const STOP = Symbol("stop");

/**
 * Runs the drop moment for `cards` (drawn in .mail-card-clip wrappers in the
 * slot) dropped at `at` (client px). `read` settles when the files are read:
 * true when they loaded. Returns `done` (the flap is at rest) and `stop`,
 * which cancels every animation and removes what the run added.
 *
 * Step 1: Measure the opening, and hold the flap where it is (ajar when
 *         files came near). A card fits it with MARGIN px each side and
 *         goes in through its middle line. A shade over the opening under
 *         that line darkens the part of a card that is inside.
 * Step 2: Each card rests at the opening; its transform moves it to the
 *         drop point, where the cards fade in as a fanned stack.
 * Step 3: One after another (T.next apart), a card moves on an arc from the
 *         drop point to the opening, shrinking to fit and turning its top
 *         edge toward you, and arrives with speed left.
 * Step 4: Contact: the card's front edge pushes the flap open; the card is
 *         cut at the opening's bottom edge (the door hides the rest).
 * Step 5: The card slides in along its own plane, at its own pace. If the
 *         read still runs, the last card stops partly in and waits: a done
 *         read pushes it in, a failed one slides it back out.
 * Step 6: Once the last card is out of sight (mail-in), the flap snaps shut.
 * Reduced motion: no cards; the read alone shows.
 */
export function insertCards(
  slot: HTMLElement,
  cards: HTMLElement[],
  at: { x: number; y: number },
  read: Promise<boolean>,
) {
  const all: Animation[] = [];
  /** Animations that keep their own pace when the read is done. */
  const fixed = new Set<Animation>();
  const added: HTMLElement[] = [];
  let rate = 1;
  let stopped = false;
  const play = (
    el: Element,
    keys: Keyframe[],
    opts: KeyframeAnimationOptions,
    own = false,
  ) => {
    const a = el.animate(keys, opts);
    if (own) fixed.add(a);
    else a.playbackRate = rate;
    all.push(a);
    return a;
  };
  /** Waits for an animation; ends the run if it was stopped meanwhile. */
  const step = async (a: Animation) => {
    await a.finished.catch(() => {});
    if (stopped) throw STOP;
  };
  /** A pause; with `own`, it never runs faster. */
  const wait = (ms: number, own = false) =>
    step(play(slot, [], { duration: Math.max(0, ms) }, own));
  /** How long ago (ms) an animation ended, so the next one can start where it would be by now. */
  const late = (a: Animation) => {
    const end =
      (a.startTime as number) +
      (a.effect!.getComputedTiming().endTime as number) / a.playbackRate;
    return Math.max(0, (document.timeline.currentTime as number) - end);
  };
  const stop = () => {
    stopped = true;
    all.forEach((a) => a.cancel());
    added.forEach((e) => e.remove());
    cards.forEach((c) => {
      const wrap = c.parentElement as HTMLElement;
      wrap.style.zIndex = "";
      wrap.style.clipPath = "";
      wrap.style.visibility = "";
    });
    slot.querySelector<HTMLElement>(".mail-flap")!.style.transition = "";
  };

  if (!cards.length || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    performance.mark("mail-in");
    performance.mark("mail-shut");
    return { done: Promise.resolve(), stop };
  }

  // Step 1
  const s = slot.getBoundingClientRect();
  const hole = slot.querySelector(".mail-hole")!.getBoundingClientRect();
  const flap = slot.querySelector<HTMLElement>(".mail-flap")!;
  // Files that came near left the flap ajar (mail-slot.tsx): it stays there
  // until a card pushes it. A CSS transition would win over the animations
  // (it is higher in the cascade), so the run turns it off.
  const ajar = getComputedStyle(flap).transform;
  const rest = ajar === "none" ? "rotateX(0deg)" : ajar;
  flap.style.transition = "none";
  flap.style.transform = "";
  play(
    flap,
    [{ transform: rest }, { transform: rest }],
    { duration: 0, fill: "forwards" },
    true,
  );
  const h = {
    x: hole.left - s.left,
    y: hole.top - s.top,
    w: hole.width,
    hh: hole.height,
  };
  /** The line a card goes in through, and the opening's bottom edge. */
  const lineY = h.y + h.hh / 2;
  const bottom = h.y + h.hh;
  const cx = h.x + h.w / 2;
  const fit = (h.w - 2 * MARGIN) / CARD.w;
  const len = CARD.h * fit;
  const layer = cards[0].parentElement!.parentElement!;
  const shade = document.createElement("span");
  shade.className = "mail-shade";
  shade.style.cssText = `left:${h.x}px;top:${lineY}px;width:${h.w}px;height:${bottom - lineY}px`;
  layer.append(shade);
  added.push(shade);

  /**
   * A card's transform, by its bottom centre (x, y). The card turns on its
   * bottom edge (transform-origin in app/globals.css) and slides `d` px along its
   * own plane, into the door. One function list everywhere, so every pair
   * of poses interpolates. A card rests at the opening (Step 2), so the
   * translate is 0 there: perspective() looks from the card's resting
   * place, and any offset from it slants the card.
   */
  const pose = (x: number, y: number, sc: number, lean = 0, rot = 0, d = 0) =>
    `translate(${x - cx}px, ${y - lineY}px) perspective(${DEPTH}px) rotateX(${-lean}deg) rotate(${rot}deg) translateY(${d}px) scale(${sc})`;
  const contact = pose(cx, lineY, fit, LEAN.push);
  const inside = pose(cx, lineY, fit, LEAN.in, 0, len * OVER);
  const waiting = pose(cx, lineY, fit, LEAN.in * 0.8, 0, len * WAIT_IN);
  const easeOut = token("--ease-out");
  /** The pass lasts long enough that the card is out of sight at T.pass (the push: at T.push). */
  const passFor = T.pass / timeAt(SLIDE, 1 / OVER);

  /** True once the files loaded; a failed read keeps it false, so the last card waits and goes back out. */
  let readOk = false;
  void read.then((ok) => {
    readOk = ok;
    if (!ok || stopped) return;
    rate = RUSH;
    for (const a of all)
      if (!fixed.has(a) && a.playState !== "finished")
        a.updatePlaybackRate(RUSH);
  });

  let flapOpen = false;
  /** Step 4: the front edge pushes the flap; only the first card has to. */
  const pushFlap = () => {
    if (flapOpen) return;
    flapOpen = true;
    const open = {
      duration: T.open,
      easing: easeOut,
      fill: "forwards",
    } as const;
    play(
      flap,
      [{ transform: rest }, { transform: `rotateX(${-FLAP}deg)` }],
      open,
      true,
    );
    // The shade is over the flap too, so it shows only while the flap is open.
    play(shade, [{ opacity: 0 }, { opacity: 1 }], open, true);
  };

  // Front card first: the last card in the DOM is the top of the stack.
  const order = [...cards].reverse();
  const n = order.length;

  const runs = order.map(async (card, k) => {
    const wrap = card.parentElement as HTMLElement;
    const shadow = card.querySelector(".mail-card-shadow")!;
    /** All of the card is inside: hide the dark rest, so it never shows on the shut flap. */
    const gone = () => (wrap.style.visibility = "hidden");
    // A card centred on the drop point, by its bottom centre.
    const x0 = at.x - s.left + k * FAN.x;
    const y0 = at.y - s.top + k * FAN.y + CARD.h / 2;
    wrap.style.zIndex = String(30 + n - k);
    card.style.left = `${cx - CARD.w / 2}px`;
    card.style.top = `${lineY - CARD.h}px`;
    // Step 2
    const appear = {
      duration: T.appear,
      delay: k * 20,
      easing: easeOut,
      fill: "both",
    } as const;
    play(card, [{ opacity: 0 }, { opacity: 1 }], appear);
    play(
      card,
      [
        { transform: pose(x0, y0, 0.96, 0, k * FAN.rotate) },
        { transform: pose(x0, y0, 1, 0, k * FAN.rotate) },
      ],
      appear,
    );
    // Step 3: a quadratic arc whose control point sits over the opening, so
    // the way ends going down into it.
    if (k) await wait(k * T.next);
    const top = Math.min(y0, lineY) - LIFT;
    const arc = Array.from({ length: STEPS + 1 }, (_, i) => {
      const t = i / STEPS;
      const u = 1 - t;
      return {
        t,
        x: u * u * x0 + 2 * u * t * cx + t * t * cx,
        y: u * u * y0 + 2 * u * t * top + t * t * lineY,
      };
    });
    // Keyframes spaced by distance, so one easing gives one smooth speed all the way.
    const dist = [0];
    for (let i = 1; i <= STEPS; i++)
      dist.push(
        dist[i - 1] +
          Math.hypot(arc[i].x - arc[i - 1].x, arc[i].y - arc[i - 1].y),
      );
    const keys: Keyframe[] = arc.map((p, i) => {
      // The card turns to the opening on the second half of the way (smoothstep).
      const turn = Math.min(1, Math.max(0, (p.t - 0.5) / 0.5));
      return {
        transform: pose(
          p.x,
          p.y,
          1 + (fit - 1) * p.t,
          LEAN.push * turn * turn * (3 - 2 * turn),
          k * FAN.rotate * (1 - p.t),
        ),
        offset: dist[STEPS] ? dist[i] / dist[STEPS] : i / STEPS,
      };
    });
    const approach = play(card, keys, {
      duration: T.approach,
      easing: ARRIVE,
      fill: "forwards",
    });
    await step(approach);
    // Step 4
    const lag = late(approach);
    if (k === n - 1) performance.mark("mail-contact");
    wrap.style.zIndex = String(10 + k);
    wrap.style.clipPath = `inset(-100vh -100vw ${s.height - bottom}px -100vw)`;
    play(
      shadow,
      [{ opacity: 0 }],
      { duration: 120, easing: easeOut, fill: "forwards" },
      true,
    );
    pushFlap();
    // Step 5
    if (k === n - 1 && !readOk) {
      const hold = play(
        card,
        [{ transform: contact }, { transform: waiting }],
        { duration: T.hold, easing: easeOut, fill: "forwards" },
        true,
      );
      hold.currentTime = lag;
      // A read that ends during the hold cuts it short: the card goes on from where it is.
      await Promise.race([read, hold.finished.catch(() => {})]);
      const ok = await read;
      if (stopped) throw STOP;
      const p = hold.effect!.getComputedTiming().progress ?? 1;
      const d0 = len * WAIT_IN * p;
      const from = pose(
        cx,
        lineY,
        fit,
        LEAN.push + (LEAN.in * 0.8 - LEAN.push) * p,
        0,
        d0,
      );
      if (!ok) {
        const back = {
          duration: T.out,
          easing: easeOut,
          fill: "forwards",
        } as const;
        play(
          card,
          [{ transform: from }, { transform: pose(cx, lineY - 12, fit) }],
          back,
          true,
        );
        hold.cancel();
        await step(play(card, [{ opacity: 0 }], back, true));
        return;
      }
      const pushFor = T.push / timeAt(SLIDE, (len - d0) / (len * OVER - d0));
      play(
        card,
        [{ transform: from }, { transform: inside }],
        { duration: pushFor, easing: SLIDE, fill: "forwards" },
        true,
      );
      hold.cancel();
      await wait(T.push, true);
      gone();
      return;
    }
    const pass = play(
      card,
      [{ transform: contact }, { transform: inside }],
      { duration: passFor, easing: SLIDE, fill: "forwards" },
      true,
    );
    pass.currentTime = lag;
    await wait(T.pass - lag, true);
    gone();
  });

  const done = (async () => {
    try {
      await Promise.all(runs);
      // Step 6: the app can show the heatmap at mail-shut, once the flap is shut.
      performance.mark("mail-in");
      if (flapOpen) {
        play(
          shade,
          [{ opacity: 0 }],
          { duration: 60, easing: easeOut, fill: "forwards" },
          true,
        );
        await step(
          play(
            flap,
            [
              { transform: `rotateX(${-FLAP}deg)` },
              { transform: "rotateX(0deg)" },
            ],
            { ...SNAP, fill: "forwards" },
            true,
          ),
        );
      }
      performance.mark("mail-shut");
    } catch (e) {
      if (e !== STOP) throw e;
    }
  })();
  return { done, stop };
}
