/**
 * Draw interaction v4 (ChatGPT spec, 2026-11-13): the numbers behind the fan, kept apart from
 * React so they can be tested. Phone: one swipeable row, the centred card lifted and a little
 * larger. Desktop: every card on one gentle arc.
 */
export const PHONE = { width: 76, height: 122, step: 34, lift: 14, grow: 0.12, tilt: 2.5, maxTilt: 12, drop: 5, maxDrop: 25 } as const;
export const DESK = { width: 104, height: 168, maxStep: 64, tilt: 3, arc: 1.4 } as const;
export const MOTION = {
  dragThreshold: 8, // px before a touch becomes a swipe instead of a tap
  rubberBand: 12, // px past either end of the fan
  momentumMs: 180, // how far a fling carries, as time at release speed
  maxFling: 4, // cards
  snapMs: 220,
  flightMs: 420,
  flightEase: "cubic-bezier(.25,.8,.25,1)",
  lastPickPauseMs: 240,
  shuffleMs: 840,
  openStaggerMs: 35,
  openMs: 310,
} as const;

export type Mode = "phone" | "desk";
export type Placement = { x: number; y: number; rotate: number; scale: number; z: number };

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Where card `index` sits when `centre` (a fractional card index, phone only) is in the middle. */
export function placeCard(index: number, count: number, centre: number, mode: Mode, stageWidth: number): Placement {
  if (mode === "phone") {
    const distance = index - centre;
    const away = Math.abs(distance);
    const near = Math.max(0, 1 - away);
    return {
      x: distance * PHONE.step,
      y: Math.min(away * PHONE.drop, PHONE.maxDrop) - PHONE.lift * near,
      rotate: clamp(distance * PHONE.tilt, -PHONE.maxTilt, PHONE.maxTilt),
      scale: 1 + PHONE.grow * near,
      z: 100 - Math.round(away * 4),
    };
  }
  const distance = index - (count - 1) / 2;
  const step = Math.min(DESK.maxStep, Math.max(12, (stageWidth - DESK.width - 48) / Math.max(1, count - 1)));
  return { x: distance * step, y: distance * distance * DESK.arc, rotate: distance * DESK.tilt, scale: 1, z: index + 1 };
}

/** Past either end, the fan gives a little (at most `rubberBand` px) instead of running away. */
export function rubberBand(centre: number, count: number) {
  const last = Math.max(0, count - 1);
  const stretch = (over: number) => (MOTION.rubberBand * Math.tanh((over * PHONE.step) / (MOTION.rubberBand * 3))) / PHONE.step;
  if (centre < 0) return -stretch(-centre);
  if (centre > last) return last + stretch(centre - last);
  return centre;
}

/** The card a swipe settles on: release speed (px per ms, finger moving right is positive) carries it on, at most four cards. */
export function flingTarget(centre: number, velocity: number, count: number) {
  const carry = clamp((-velocity / PHONE.step) * MOTION.momentumMs, -MOTION.maxFling, MOTION.maxFling);
  return clamp(Math.round(centre + carry), 0, Math.max(0, count - 1));
}

/** The fan opens from the middle outwards, 35ms apart. */
export function openRank(index: number, count: number) {
  return Math.round(Math.abs(index - (count - 1) / 2));
}

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
