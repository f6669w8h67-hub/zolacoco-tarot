// Layout for the gold chart wheel on 探索妳的星盤: pure geometry, so it can be tested.
// The Ascendant sits on the left and longitudes run counter-clockwise (houses 1–6 below the
// horizon), as in most chart software. Without a birth time, 0° Aries sits on the left.
import type { NatalChart, PlanetId } from "./natal-chart";

export const WHEEL = { size: 400, center: 200, outer: 196, zodiacInner: 158, planet: 128, degree: 104, inner: 62 } as const;

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
export function spreadLongitudes(longitudes: number[], gap = 9) {
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

export function wheelLayout(chart: NatalChart) {
  const base = chart.ascendant ?? 0;
  const shown = spreadLongitudes(chart.placements.map((placement) => placement.longitude));
  const planets = chart.placements.map((placement, index) => ({
    id: placement.id,
    mark: PLANET_MARKS[placement.id],
    retrograde: placement.retrograde,
    degree: Math.floor(placement.degree),
    tick: [pointAt(placement.longitude, WHEEL.zodiacInner, base), pointAt(placement.longitude, WHEEL.zodiacInner - 7, base)] as const,
    marker: pointAt(shown[index], WHEEL.planet, base),
    label: pointAt(shown[index], WHEEL.degree, base),
  }));
  const signs = Array.from({ length: 12 }, (_, index) => ({
    index,
    edge: [pointAt(index * 30, WHEEL.outer, base), pointAt(index * 30, WHEEL.zodiacInner, base)] as const,
    label: pointAt(index * 30 + 15, (WHEEL.outer + WHEEL.zodiacInner) / 2, base),
  }));
  const ticks = Array.from({ length: 72 }, (_, index) => ({
    major: index % 2 === 0,
    line: [pointAt(index * 5, WHEEL.zodiacInner, base), pointAt(index * 5, WHEEL.zodiacInner + (index % 2 === 0 ? 6 : 3.5), base)] as const,
  }));
  const houses = chart.cusps?.map((cusp, index) => {
    const next = chart.cusps![(index + 1) % 12];
    const middle = cusp + (((next - cusp) % 360) + 360) % 360 / 2;
    const angle = index % 3 === 0;
    return {
      number: index + 1,
      angle,
      line: [pointAt(cusp, WHEEL.inner, base), pointAt(cusp, WHEEL.zodiacInner, base)] as const,
      label: pointAt(middle, WHEEL.inner + 12, base),
    };
  }) ?? [];
  const axes = chart.ascendant !== null && chart.midheaven !== null
    ? [
        { name: "上升", at: pointAt(chart.ascendant, WHEEL.zodiacInner - 16, base), line: [pointAt(chart.ascendant, WHEEL.inner, base), pointAt(chart.ascendant, WHEEL.outer + 2, base)] as const },
        { name: "天頂", at: pointAt(chart.midheaven, WHEEL.zodiacInner - 16, base), line: [pointAt(chart.midheaven, WHEEL.inner, base), pointAt(chart.midheaven, WHEEL.outer + 2, base)] as const },
      ]
    : [];
  return { base, planets, signs, ticks, houses, axes };
}
