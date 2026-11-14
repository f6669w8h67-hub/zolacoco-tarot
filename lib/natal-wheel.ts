// Layout for the gold chart wheel on 探索妳的星盤: pure geometry, so it can be tested.
// The Ascendant sits on the left and longitudes run counter-clockwise (houses 1–6 below the
// horizon), as in most chart software. Without a birth time, 0° Aries sits on the left.
//
// v2 (Zola 2026-11-14: 盤面要更細、更漂亮; direction 精緻金色星象儀), from the rim inwards:
// a pearl-dotted gold rim, the zodiac band (12 tinted signs), a 1°/5°/10° astrolabe scale, the
// planets (each a small seal, fanned out so seals never touch, with a leader to its true degree),
// the houses, and in the middle the aspect web.
import type { NatalChart, PlanetId } from "./natal-chart";

export const WHEEL = {
  size: 400, center: 200,
  rim: 197, pearls: 194, outer: 190.5, zodiacInner: 160,
  scale: 160, tickMinor: 2.4, tickMid: 4.6, tickMajor: 7.5,
  trueMark: 152, planet: 133, degree: 115.5,
  houseOuter: 147, inner: 90, houseLabel: 98.5, aspect: 84,
  /** 上升／天頂 sit on their axis just inside the inner circle, clear of houses and planets */
  axisLabel: 70,
} as const;

/** Planets this far apart (degrees) on the wheel have seals that never touch. */
export const PLANET_GAP = 10;

/** Short Chinese marks for the planets (日月水金火木土天海冥北): clear on every phone, never emoji. */
export const PLANET_MARKS: Record<PlanetId, string> = {
  sun: "日", moon: "月", mercury: "水", venus: "金", mars: "火", jupiter: "木", saturn: "土", uranus: "天", neptune: "海", pluto: "冥", node: "北",
};

const round = (value: number) => Math.round(value * 100) / 100;

/** Screen point for an ecliptic longitude at radius r. */
export function pointAt(longitude: number, radius: number, base: number) {
  const angle = ((180 + longitude - base) * Math.PI) / 180;
  return { x: round(WHEEL.center + radius * Math.cos(angle)), y: round(WHEEL.center - radius * Math.sin(angle)) };
}

const norm = (angle: number) => ((angle % 360) + 360) % 360;

/**
 * Planets that sit close together are fanned out so their marks never overlap: at least `gap`
 * degrees apart on the wheel, each as near its true place as possible. The tick on the zodiac ring
 * still marks the true longitude. The circle is opened at its widest empty arc and laid on a line,
 * so a cluster around 0° Aries spreads both ways without planets passing each other.
 */
export function spreadLongitudes(longitudes: number[], gap = PLANET_GAP) {
  const count = longitudes.length;
  if (count < 2) return longitudes.map(norm);
  const order = longitudes.map((value, index) => ({ value: norm(value), index })).sort((a, b) => a.value - b.value);
  let widest = -1;
  let start = 0;
  for (let i = 0; i < count; i++) {
    const next = i + 1 < count ? order[i + 1].value : order[0].value + 360;
    if (next - order[i].value > widest) { widest = next - order[i].value; start = (i + 1) % count; }
  }
  const line = Array.from({ length: count }, (_, k) => ({ index: order[(start + k) % count].index, value: order[(start + k) % count].value + (start + k >= count ? 360 : 0) }));
  for (let pass = 0; pass < 1000; pass++) {
    let moved = false;
    for (let k = 0; k < count; k++) {
      const wraps = k === count - 1;
      const after = wraps ? line[0].value + 360 : line[k + 1].value;
      const distance = after - line[k].value;
      if (distance < gap - 1e-9) {
        const push = (gap - distance) / 2;
        line[k].value -= push;
        if (wraps) line[0].value += push; else line[k + 1].value += push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  const result = new Array<number>(count);
  for (const item of line) result[item.index] = norm(item.value);
  return result;
}

/** The major aspects drawn in the middle: blue for the easy ones, rose for the tense ones. */
export const ASPECTS = [
  { angle: 60, orb: 5, kind: "soft", name: "六分" },
  { angle: 90, orb: 6, kind: "hard", name: "四分" },
  { angle: 120, orb: 6, kind: "soft", name: "三分" },
  { angle: 180, orb: 7, kind: "hard", name: "對分" },
] as const;

export type AspectKind = (typeof ASPECTS)[number]["kind"];

/**
 * Aspects between the ten planets (the lunar node takes none). Without a birth time the Moon is
 * placed at noon and may be 6° or more away from its true place, so it takes no aspects then.
 */
export function aspectsOf(chart: Pick<NatalChart, "placements" | "timeKnown">) {
  const bodies = chart.placements.filter((placement) => placement.id !== "node" && (chart.timeKnown || placement.id !== "moon"));
  const found: { a: PlanetId; b: PlanetId; angle: number; kind: AspectKind; name: string; orb: number }[] = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const raw = Math.abs(norm(bodies[i].longitude) - norm(bodies[j].longitude));
      const separation = raw > 180 ? 360 - raw : raw;
      for (const aspect of ASPECTS) {
        const orb = Math.abs(separation - aspect.angle);
        if (orb <= aspect.orb) { found.push({ a: bodies[i].id, b: bodies[j].id, angle: aspect.angle, kind: aspect.kind, name: aspect.name, orb: round(orb) }); break; }
      }
    }
  }
  return found;
}

export function wheelLayout(chart: NatalChart) {
  const base = chart.ascendant ?? 0;
  const shown = spreadLongitudes(chart.placements.map((placement) => placement.longitude));
  const planets = chart.placements.map((placement, index) => {
    const moved = Math.abs(((shown[index] - placement.longitude + 540) % 360) - 180) > 0.5;
    return {
      id: placement.id,
      mark: PLANET_MARKS[placement.id],
      retrograde: placement.retrograde,
      degree: Math.floor(placement.degree),
      /** rose tick on the scale at the true longitude */
      tick: [pointAt(placement.longitude, WHEEL.scale, base), pointAt(placement.longitude, WHEEL.trueMark, base)] as const,
      /** hairline from the true longitude to the seal, only when the seal was fanned out */
      leader: moved ? [pointAt(placement.longitude, WHEEL.trueMark, base), pointAt(shown[index], WHEEL.planet + 10.5, base)] as const : null,
      marker: pointAt(shown[index], WHEEL.planet, base),
      label: pointAt(shown[index], WHEEL.degree, base),
      /** where its aspect lines start */
      aspectAt: pointAt(placement.longitude, WHEEL.aspect, base),
    };
  });
  const signs = Array.from({ length: 12 }, (_, index) => {
    const from = index * 30;
    const outerA = pointAt(from, WHEEL.outer, base), outerB = pointAt(from + 30, WHEEL.outer, base);
    const innerA = pointAt(from, WHEEL.zodiacInner, base), innerB = pointAt(from + 30, WHEEL.zodiacInner, base);
    return {
      index,
      edge: [outerA, innerA] as const,
      /** the sign's slice of the band (longitudes run counter-clockwise on screen) */
      band: `M ${outerA.x} ${outerA.y} A ${WHEEL.outer} ${WHEEL.outer} 0 0 0 ${outerB.x} ${outerB.y} L ${innerB.x} ${innerB.y} A ${WHEEL.zodiacInner} ${WHEEL.zodiacInner} 0 0 1 ${innerA.x} ${innerA.y} Z`,
      label: pointAt(from + 15, (WHEEL.outer + WHEEL.zodiacInner) / 2, base),
    };
  });
  const ticks = Array.from({ length: 360 }, (_, degree) => {
    const size = degree % 10 === 0 ? "major" : degree % 5 === 0 ? "mid" : "minor";
    const length = size === "major" ? WHEEL.tickMajor : size === "mid" ? WHEEL.tickMid : WHEEL.tickMinor;
    return { size, line: [pointAt(degree, WHEEL.scale, base), pointAt(degree, WHEEL.scale - length, base)] as const };
  });
  const pearls = Array.from({ length: 72 }, (_, index) => pointAt(index * 5 + 2.5, WHEEL.pearls, base));
  const houses = chart.cusps?.map((cusp, index) => {
    const next = chart.cusps![(index + 1) % 12];
    const middle = cusp + (((next - cusp) % 360) + 360) % 360 / 2;
    const angle = index % 3 === 0;
    return {
      number: index + 1,
      angle,
      line: [pointAt(cusp, WHEEL.inner, base), pointAt(cusp, WHEEL.houseOuter, base)] as const,
      label: pointAt(middle, WHEEL.houseLabel, base),
    };
  }) ?? [];
  const axes = chart.ascendant !== null && chart.midheaven !== null
    ? [
        { name: "上升", at: pointAt(chart.ascendant, WHEEL.axisLabel, base), line: [pointAt(chart.ascendant, WHEEL.axisLabel + 9, base), pointAt(chart.ascendant, WHEEL.rim, base)] as const },
        { name: "天頂", at: pointAt(chart.midheaven, WHEEL.axisLabel, base), line: [pointAt(chart.midheaven, WHEEL.axisLabel + 9, base), pointAt(chart.midheaven, WHEEL.rim, base)] as const },
      ]
    : [];
  const at = new Map(planets.map((planet) => [planet.id, planet.aspectAt]));
  const aspects = aspectsOf(chart).map((aspect) => ({ ...aspect, line: [at.get(aspect.a)!, at.get(aspect.b)!] as const }));
  return { base, planets, signs, ticks, pearls, houses, axes, aspects };
}
