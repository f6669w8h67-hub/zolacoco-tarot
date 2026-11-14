// 本命盤 calculation for 探索妳的星盤, run in the visitor's browser: birth data never leaves the device.
//
// - Planet positions: astronomy-engine (MIT), geocentric, true ecliptic of date (tropical zodiac).
// - Apparent geocentric positions (light time and aberration) on the true ecliptic of date, i.e. the
//   tropical zodiac as most astrology software shows it. Verified against Swiss Ephemeris for 16 charts
//   (tests/fixtures/natal-reference.json): Taiwan, southern hemisphere, 64°N, leap day, stations.
// - Retrograde: the change in longitude over two hours around the birth moment.
// - Houses: Placidus from the local sidereal time, latitude and obliquity. Only with a birth time. When
//   Placidus has no solution (a semi-arc is undefined near the poles) the chart says so and uses equal
//   houses from the Ascendant.
// - North Node: mean node.
// - Local birth time → UTC with the place's IANA time zone (the browser's time-zone data includes past
//   daylight-saving years, e.g. Taiwan 1945–1979).
import * as Astronomy from "astronomy-engine";

export const SIGNS = [
  { id: "aries", name: "牡羊座", glyph: "♈︎", element: "火" },
  { id: "taurus", name: "金牛座", glyph: "♉︎", element: "土" },
  { id: "gemini", name: "雙子座", glyph: "♊︎", element: "風" },
  { id: "cancer", name: "巨蟹座", glyph: "♋︎", element: "水" },
  { id: "leo", name: "獅子座", glyph: "♌︎", element: "火" },
  { id: "virgo", name: "處女座", glyph: "♍︎", element: "土" },
  { id: "libra", name: "天秤座", glyph: "♎︎", element: "風" },
  { id: "scorpio", name: "天蠍座", glyph: "♏︎", element: "水" },
  { id: "sagittarius", name: "射手座", glyph: "♐︎", element: "火" },
  { id: "capricorn", name: "摩羯座", glyph: "♑︎", element: "土" },
  { id: "aquarius", name: "水瓶座", glyph: "♒︎", element: "風" },
  { id: "pisces", name: "雙魚座", glyph: "♓︎", element: "水" },
] as const;

export type SignId = (typeof SIGNS)[number]["id"];

export const PLANETS = [
  { id: "sun", name: "太陽", glyph: "☉", body: "Sun" },
  { id: "moon", name: "月亮", glyph: "☽", body: "Moon" },
  { id: "mercury", name: "水星", glyph: "☿", body: "Mercury" },
  { id: "venus", name: "金星", glyph: "♀", body: "Venus" },
  { id: "mars", name: "火星", glyph: "♂", body: "Mars" },
  { id: "jupiter", name: "木星", glyph: "♃", body: "Jupiter" },
  { id: "saturn", name: "土星", glyph: "♄", body: "Saturn" },
  { id: "uranus", name: "天王星", glyph: "♅", body: "Uranus" },
  { id: "neptune", name: "海王星", glyph: "♆", body: "Neptune" },
  { id: "pluto", name: "冥王星", glyph: "♇", body: "Pluto" },
  { id: "node", name: "北交點", glyph: "☊", body: null },
] as const;

export type PlanetId = (typeof PLANETS)[number]["id"];

export type BirthInput = {
  /** YYYY-MM-DD, local date at the birth place */
  date: string;
  /** HH:MM local time, or null when unknown */
  time: string | null;
  latitude: number;
  longitude: number;
  timeZone: string;
  /**
   * The birth moment as an ISO instant, when the page has already resolved the local time (a time
   * that happened twice on a daylight-saving day needs her choice). Without it, the local time must
   * exist exactly once.
   */
  utc?: string;
};

export type Placement = {
  id: PlanetId;
  longitude: number;
  sign: SignId;
  /** degrees within the sign, 0–30 */
  degree: number;
  retrograde: boolean;
  /** 1–12, only with a birth time */
  house: number | null;
};

export type NatalChart = {
  utc: string;
  timeKnown: boolean;
  placements: Placement[];
  ascendant: number | null;
  midheaven: number | null;
  /** 12 cusp longitudes, house 1 first; null without a birth time */
  cusps: number[] | null;
  houseSystem: "placidus" | "equal" | null;
  /**
   * Without a birth time, any body that changes sign during the birth date (local day at the birth
   * place): its sign at the start and at the end of that day. Those signs are not certain.
   */
  uncertain: Partial<Record<PlanetId, [SignId, SignId]>>;
};

const DEG = Math.PI / 180;
const norm = (angle: number) => ((angle % 360) + 360) % 360;

export function signOf(longitude: number): SignId {
  return SIGNS[Math.floor(norm(longitude) / 30)].id;
}

/** Minutes the zone is ahead of UTC at this instant (Taipei: +480). */
export function zoneOffsetMinutes(timeZone: string, instant: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(instant);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
  return Math.round((asUtc - instant.getTime()) / 60000);
}

function wallClock(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return Date.UTC(year, month - 1, day, hour, minute);
}

export type LocalTimeOption = { utc: Date; offsetMinutes: number };
export type LocalTimeResolution =
  | { kind: "exact"; utc: Date }
  /** The clocks jumped forward over this time: it never happened there (ChatGPT review #34 B1). */
  | { kind: "gap" }
  /** The clocks went back: this time happened twice, earlier offset first. She has to choose. */
  | { kind: "repeated"; options: [LocalTimeOption, LocalTimeOption] };

/**
 * A local wall-clock time at the place → every UTC instant that shows exactly that time there.
 * Candidate offsets are the zone's offsets around that day; each is kept only if the instant really
 * reads back as the same date and time in that zone.
 */
export function resolveLocalTime(date: string, time: string, timeZone: string): LocalTimeResolution {
  const wall = wallClock(date, time);
  const offsets = new Set([-36, -24, -12, 0, 12, 24, 36].map((hours) => zoneOffsetMinutes(timeZone, new Date(wall + hours * 3600000))));
  const found = new Map<number, LocalTimeOption>();
  for (const offset of offsets) {
    const utc = wall - offset * 60000;
    if (zoneOffsetMinutes(timeZone, new Date(utc)) === offset) found.set(utc, { utc: new Date(utc), offsetMinutes: offset });
  }
  const options = [...found.values()].sort((a, b) => a.utc.getTime() - b.utc.getTime());
  if (options.length === 0) return { kind: "gap" };
  if (options.length === 1) return { kind: "exact", utc: options[0].utc };
  return { kind: "repeated", options: [options[0], options[1]] };
}

/**
 * Local time → one UTC instant, never refusing: for the edges of a birth day without a birth time.
 * A repeated time takes its first occurrence; a skipped time is read with the offset in force just
 * before the jump (so 00:30 on a day the clocks jump at 00:00 lands just after the jump).
 */
export function localToUtc(date: string, time: string, timeZone: string) {
  const resolved = resolveLocalTime(date, time, timeZone);
  if (resolved.kind === "exact") return resolved.utc;
  if (resolved.kind === "repeated") return resolved.options[0].utc;
  const wall = wallClock(date, time);
  return new Date(wall - zoneOffsetMinutes(timeZone, new Date(wall - 86400000)) * 60000);
}

export class BirthTimeError extends Error {
  /** gap: the time never happened there; repeated: it happened twice; mismatch: the given `utc` is not that time. */
  reason: "gap" | "repeated" | "mismatch";
  constructor(reason: "gap" | "repeated" | "mismatch") {
    super(reason === "gap" ? "BIRTH_TIME_SKIPPED" : reason === "repeated" ? "BIRTH_TIME_REPEATED" : "BIRTH_TIME_MISMATCH");
    this.reason = reason;
  }
}

/**
 * The birth instant for a known time: exact, or the page's resolved choice; never a silent guess.
 * A given `utc` must be one of the instants that really show this date and time at the place, so a
 * caller that skipped resolveLocalTime cannot chart a different moment (review #34, non-blocking).
 */
function birthInstant(input: BirthInput) {
  const resolved = resolveLocalTime(input.date, input.time!, input.timeZone);
  if (input.utc) {
    const given = new Date(input.utc).getTime();
    const candidates = resolved.kind === "exact" ? [resolved.utc] : resolved.kind === "repeated" ? resolved.options.map((option) => option.utc) : [];
    const match = candidates.find((candidate) => candidate.getTime() === given);
    if (!match) throw new BirthTimeError("mismatch");
    return match;
  }
  if (resolved.kind === "gap") throw new BirthTimeError("gap");
  if (resolved.kind === "repeated") throw new BirthTimeError("repeated");
  return resolved.utc;
}

function eclipticLongitude(body: string, time: Astronomy.AstroTime) {
  if (body === "Moon") return Astronomy.EclipticGeoMoon(time).lon;
  return Astronomy.Ecliptic(Astronomy.GeoVector(body as Astronomy.Body, time, true)).elon;
}

function meanNode(time: Astronomy.AstroTime) {
  const t = time.tt / 36525;
  return norm(125.0445479 - 1934.1362891 * t + 0.0020754 * t * t + (t * t * t) / 467441);
}

/** True obliquity (with nutation), consistent with the apparent sidereal time used for the RAMC. */
function trueObliquity(time: Astronomy.AstroTime) {
  return Astronomy.e_tilt(time).tobl;
}

/** The ecliptic longitude whose right ascension is `ra` (both degrees). */
function eclipticFromRa(ra: number, obliquity: number) {
  return norm(Math.atan2(Math.sin(ra * DEG), Math.cos(ra * DEG) * Math.cos(obliquity * DEG)) / DEG);
}

export function anglesFor(ramc: number, latitude: number, obliquity: number) {
  const e = obliquity * DEG;
  const r = ramc * DEG;
  const midheaven = eclipticFromRa(ramc, obliquity);
  const ascendant = norm(Math.atan2(Math.cos(r), -(Math.sin(r) * Math.cos(e) + Math.tan(latitude * DEG) * Math.sin(e))) / DEG);
  return { ascendant, midheaven };
}

/**
 * Placidus: a cusp is the ecliptic point whose hour angle is a third (or two thirds) of its own
 * diurnal or nocturnal semi-arc. Solved by iteration from the RAMC. Null if a semi-arc is undefined.
 */
export function placidusCusps(ramc: number, latitude: number, obliquity: number): number[] | null {
  const e = obliquity * DEG;
  const phi = latitude * DEG;
  const { ascendant, midheaven } = anglesFor(ramc, latitude, obliquity);
  function cusp(fraction: number, above: boolean) {
    let ra = above ? norm(ramc + 90 * fraction) : norm(ramc + 180 - 90 * fraction);
    for (let i = 0; i < 100; i++) {
      const lon = eclipticFromRa(ra, obliquity);
      const dec = Math.asin(Math.sin(e) * Math.sin(lon * DEG));
      const x = Math.tan(phi) * Math.tan(dec);
      if (!Number.isFinite(x) || Math.abs(x) >= 1) return null;
      const ad = Math.asin(x) / DEG;
      const next = above ? norm(ramc + fraction * (90 + ad)) : norm(ramc + 180 - fraction * (90 - ad));
      const diff = Math.abs(((next - ra + 540) % 360) - 180);
      ra = next;
      if (diff < 1e-9) return eclipticFromRa(ra, obliquity);
    }
    return null;
  }
  const c11 = cusp(1 / 3, true);
  const c12 = cusp(2 / 3, true);
  const c2 = cusp(2 / 3, false);
  const c3 = cusp(1 / 3, false);
  if (c11 === null || c12 === null || c2 === null || c3 === null) return null;
  return [ascendant, c2, c3, norm(midheaven + 180), norm(c11 + 180), norm(c12 + 180), norm(ascendant + 180), norm(c2 + 180), norm(c3 + 180), midheaven, c11, c12];
}

/** Which house (1–12) a longitude falls in, given 12 cusps starting with house 1. */
export function houseOf(longitude: number, cusps: number[]) {
  for (let i = 0; i < 12; i++) {
    const start = cusps[i];
    const end = cusps[(i + 1) % 12];
    const span = norm(end - start);
    if (norm(longitude - start) < span) return i + 1;
  }
  return 1;
}

function positionsAt(time: Astronomy.AstroTime) {
  return PLANETS.map((planet) => planet.body ? norm(eclipticLongitude(planet.body, time)) : meanNode(time));
}

export function computeNatalChart(input: BirthInput): NatalChart {
  const timeKnown = input.time !== null;
  const utcDate = timeKnown ? birthInstant(input) : localToUtc(input.date, "12:00", input.timeZone);
  const time = Astronomy.MakeTime(utcDate);
  const now = positionsAt(time);
  const later = positionsAt(time.AddDays(1 / 24));
  const earlier = positionsAt(time.AddDays(-1 / 24));

  let cusps: number[] | null = null;
  let ascendant: number | null = null;
  let midheaven: number | null = null;
  let houseSystem: NatalChart["houseSystem"] = null;
  if (timeKnown) {
    const obliquity = trueObliquity(time);
    const ramc = norm(Astronomy.SiderealTime(time) * 15 + input.longitude);
    ({ ascendant, midheaven } = anglesFor(ramc, input.latitude, obliquity));
    cusps = placidusCusps(ramc, input.latitude, obliquity);
    houseSystem = cusps ? "placidus" : "equal";
    if (!cusps) {
      const asc = ascendant;
      cusps = Array.from({ length: 12 }, (_, index) => norm(asc + index * 30));
    }
  }

  const placements: Placement[] = PLANETS.map((planet, index) => {
    const longitude = now[index];
    const motion = ((later[index] - earlier[index] + 540) % 360) - 180;
    return {
      id: planet.id,
      longitude,
      sign: signOf(longitude),
      degree: longitude % 30,
      retrograde: planet.id !== "sun" && planet.id !== "moon" && planet.id !== "node" && motion < 0,
      house: cusps ? houseOf(longitude, cusps) : null,
    };
  });

  const uncertain: NatalChart["uncertain"] = {};
  if (!timeKnown) {
    // The local day at the birth place, not the UTC day: 00:00 to 23:59 there, after time zone and DST.
    const start = positionsAt(Astronomy.MakeTime(localToUtc(input.date, "00:00", input.timeZone)));
    const end = positionsAt(Astronomy.MakeTime(localToUtc(input.date, "23:59", input.timeZone)));
    PLANETS.forEach((planet, index) => {
      const first = signOf(start[index]);
      const last = signOf(end[index]);
      if (first !== last) uncertain[planet.id] = [first, last];
    });
  }

  return { utc: utcDate.toISOString(), timeKnown, placements, ascendant, midheaven, cusps, houseSystem, uncertain };
}

/**
 * 四元素: the ten bodies Sun to Pluto, one each (the node and the Ascendant are not counted), leaving out
 * any whose sign is uncertain without a birth time. A hint for self-reflection, not a score.
 */
export function elementCounts(chart: NatalChart) {
  const counts = { 火: 0, 土: 0, 風: 0, 水: 0 };
  for (const placement of chart.placements) {
    if (placement.id === "node" || chart.uncertain[placement.id]) continue;
    const sign = SIGNS.find((item) => item.id === placement.sign);
    if (sign) counts[sign.element] += 1;
  }
  return counts;
}
