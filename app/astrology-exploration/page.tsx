"use client";

// 探索妳的星盤 v2 (Zola, 2026-11-14: 「兩個都要」「精緻金色星象儀」): a real natal chart from the birth
// date, time and place, a plain-language reading of six placements and the elements, then a way to
// book Zola's full chart reading on LINE. The chart is computed in this browser (lib/natal-chart.ts):
// birth data is never sent to the site. It goes into the LINE message only if she ticks
// 「附上我的出生資料」 and sees the text first (ChatGPT review B4).
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { lineMessageUrl } from "@/lib/contact";
import { bookingMessage } from "@/lib/natal-booking";
import { MUSIC_WAIT_MS, initialMusic, musicStep, type MusicEvent, type MusicState } from "@/lib/astro-music";
import { BIRTH_PLACES, PLACE_GROUPS, placeById } from "@/lib/birth-places";
import type { NatalChart, PlanetId, SignId } from "@/lib/natal-chart";
import { ASCENDANT_READINGS, ELEMENT_LINES, MARS_LINES, MERCURY_LINES, MOON_READINGS, SUN_READINGS, VENUS_LINES } from "@/lib/natal-readings";
import { WHEEL, type wheelLayout } from "@/lib/natal-wheel";
import "../styles/pearl-page.css";
import "./astrology-exploration.css";

const YT_ORIGIN = "https://www.youtube-nocookie.com";
/** Birth data kept on this device only when she ticks 「記住」; a new key, the old records stay as they are. */
const BIRTH_STORE = "zolacoco-natal-birth-v1";
/** The old four-question exploration records, still shown in 我的存檔 (/admin). Never removed here. */
const OLD_RECORDS = "zolacoco-astrology-exploration-records-v1";

type View = "intro" | "form" | "result";
/** placeId "custom": her own latitude, longitude and time zone (ChatGPT review #34 B2). fold: which of
 *  two occurrences of a repeated local time (the clocks went back that night): 0 first, 1 second. */
type Birth = { date: string; time: string | null; placeId: string; fold?: 0 | 1; custom?: { latitude: number; longitude: number; timeZone: string } };
type Place = { name: string; latitude: number; longitude: number; timeZone: string };
type Repeated = { offsets: [number, number] };
type Engine = {
  resolveLocalTime: typeof import("@/lib/natal-chart").resolveLocalTime;
  computeNatalChart: typeof import("@/lib/natal-chart").computeNatalChart;
  elementCounts: typeof import("@/lib/natal-chart").elementCounts;
  wheelLayout: typeof wheelLayout;
};
type Computed = { birth: Birth; place: Place; chart: NatalChart; wheel: ReturnType<typeof wheelLayout>; elements: Record<"火" | "土" | "風" | "水", number> };

const SIGN_NAMES: Record<SignId, string> = {
  aries: "牡羊座", taurus: "金牛座", gemini: "雙子座", cancer: "巨蟹座", leo: "獅子座", virgo: "處女座",
  libra: "天秤座", scorpio: "天蠍座", sagittarius: "射手座", capricorn: "摩羯座", aquarius: "水瓶座", pisces: "雙魚座",
};
const SIGN_ORDER: SignId[] = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const SHORT_SIGN = ["牡羊", "金牛", "雙子", "巨蟹", "獅子", "處女", "天秤", "天蠍", "射手", "摩羯", "水瓶", "雙魚"];
const PLANET_NAMES: Record<PlanetId, string> = {
  sun: "太陽", moon: "月亮", mercury: "水星", venus: "金星", mars: "火星", jupiter: "木星", saturn: "土星", uranus: "天王星", neptune: "海王星", pluto: "冥王星", node: "北交點",
};

function degreeText(longitude: number) {
  const within = ((longitude % 30) + 30) % 30;
  const whole = Math.floor(within);
  const minutes = Math.floor((within - whole) * 60);
  return `${whole}°${String(minutes).padStart(2, "0")}′`;
}

function signOfLongitude(longitude: number): SignId {
  return SIGN_ORDER[Math.floor((((longitude % 360) + 360) % 360) / 30)];
}

function todayInTaipei() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
}

const CUSTOM = "custom";

function validCustom(custom: Birth["custom"]) {
  return Boolean(custom && Number.isFinite(custom.latitude) && Math.abs(custom.latitude) <= 89.9 && Number.isFinite(custom.longitude) && Math.abs(custom.longitude) <= 180 && zoneExists(custom.timeZone));
}

function zoneExists(zone: string) {
  try { new Intl.DateTimeFormat("en", { timeZone: zone }); return true; } catch { return false; }
}

/** The place the chart uses, said plainly: a city's centre, or her own coordinates. */
function placeFor(birth: Birth): Place | null {
  if (birth.placeId === CUSTOM) {
    if (!validCustom(birth.custom)) return null;
    const { latitude, longitude, timeZone } = birth.custom!;
    return { name: `自訂座標（${latitude >= 0 ? "北緯" : "南緯"} ${Math.abs(latitude).toFixed(2)}°、${longitude >= 0 ? "東經" : "西經"} ${Math.abs(longitude).toFixed(2)}°）`, latitude, longitude, timeZone };
  }
  const city = placeById(birth.placeId);
  return city ? { name: `${city.name}（市中心座標）`, latitude: city.latitude, longitude: city.longitude, timeZone: city.timeZone } : null;
}

function utcLabel(offsetMinutes: number) {
  const hours = offsetMinutes / 60;
  return `UTC${hours >= 0 ? "+" : "−"}${Number.isInteger(hours) ? Math.abs(hours) : Math.abs(hours).toFixed(1)}`;
}

/** Every time zone the browser knows, else the ones on the place list. */
function timeZones() {
  const all = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.("timeZone");
  return all?.length ? all : [...new Set(BIRTH_PLACES.map((place) => place.timeZone))].sort();
}

function readBirth(): Birth | null {
  try {
    const value = JSON.parse(localStorage.getItem(BIRTH_STORE) ?? "null") as Birth | null;
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value.date) && (value.time === null || /^\d{2}:\d{2}$/.test(value.time)) && placeFor(value)) return value;
  } catch { /* nothing kept */ }
  return null;
}

export default function AstrologyExplorationPage() {
  const [view, setView] = useState<View>("intro");
  const [saved, setSaved] = useState<Birth | null>(null);
  const [hasOldRecords, setHasOldRecords] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [placeId, setPlaceId] = useState("tw-taipei");
  const [customLat, setCustomLat] = useState("");
  const [customLon, setCustomLon] = useState("");
  const [customZone, setCustomZone] = useState("Asia/Taipei");
  const [repeated, setRepeated] = useState<Repeated | null>(null);
  const [fold, setFold] = useState<0 | 1 | null>(null);
  const [remember, setRemember] = useState(false);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [computed, setComputed] = useState<Computed | null>(null);
  const [attachBirth, setAttachBirth] = useState(false);
  const engine = useRef<Engine | null>(null);

  // Read this device's kept birth data after mounting, so the first render matches the server.
  useEffect(() => {
    const load = window.setTimeout(() => {
      setSaved(readBirth());
      try { setHasOldRecords((JSON.parse(localStorage.getItem(OLD_RECORDS) || "[]") as unknown[]).length > 0); } catch { setHasOldRecords(false); }
    }, 0);
    return () => window.clearTimeout(load);
  }, []);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [view]);

  // Music: never starts by itself. The rules live in lib/astro-music.ts; this only runs its
  // commands, keeps the wait timer and talks to the YouTube player.
  const [player, setPlayer] = useState<MusicState>(initialMusic);
  const playerRef = useRef<MusicState>(initialMusic);
  const musicFrame = useRef<HTMLIFrameElement | null>(null);
  const musicWait = useRef(0);
  const musicHello = useRef(0);

  const dispatchMusic = useCallback((first: MusicEvent) => {
    const send = (func: string, args: unknown[] = []) => musicFrame.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), YT_ORIGIN);
    function apply(event: MusicEvent) {
      const before = playerRef.current;
      const { state: next, commands } = musicStep(before, event);
      playerRef.current = next;
      setPlayer(next);
      for (const order of commands) {
        if (order === "play") { send("unMute"); send("setVolume", [55]); send("playVideo"); }
        else send("pauseVideo");
      }
      if (next.phase !== "loading") window.clearTimeout(musicWait.current);
      else if (next.request !== before.request) {
        window.clearTimeout(musicWait.current);
        const request = next.request;
        musicWait.current = window.setTimeout(() => apply({ type: "timeout", request }), MUSIC_WAIT_MS);
      }
      if (!next.mounted || next.ready) window.clearInterval(musicHello.current);
    }
    apply(first);
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      // Only the player that is in the page right now may change the button.
      if (event.origin !== YT_ORIGIN || typeof event.data !== "string") return;
      if (!musicFrame.current || event.source !== musicFrame.current.contentWindow) return;
      let data: { event?: string; info?: unknown } = {};
      try { data = JSON.parse(event.data); } catch { return; }
      const frame = playerRef.current.frame;
      if (data.event === "onReady") dispatchMusic({ type: "ready", frame });
      const playerState = data.event === "onStateChange" ? data.info : data.event === "infoDelivery" ? (data.info as { playerState?: number } | undefined)?.playerState : undefined;
      if (playerState === 1) dispatchMusic({ type: "playing", frame });
      if (playerState === 2) dispatchMusic({ type: "paused", frame });
    }
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(musicWait.current);
      window.clearInterval(musicHello.current);
    };
  }, [dispatchMusic]);

  function onMusicLoad() {
    // Say hello until the player answers that it is ready (as YouTube's own API does).
    const frame = playerRef.current.frame;
    let tries = 0;
    const hello = () => {
      const now = playerRef.current;
      if (now.frame !== frame || !now.mounted || now.ready || ++tries > 40) { window.clearInterval(musicHello.current); return; }
      musicFrame.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: "astro-music", channel: "widget" }), YT_ORIGIN);
    };
    window.clearInterval(musicHello.current);
    hello();
    musicHello.current = window.setInterval(hello, 250);
  }

  const music = <div className="astro-music">
    <button className={`astro-music-toggle ${player.phase === "playing" ? "is-playing" : ""}`} type="button" aria-pressed={player.phase === "playing"} aria-busy={player.phase === "loading"} onClick={() => dispatchMusic({ type: "tap" })}>
      <i aria-hidden="true"><span /><span /><span /></i>
      <span>{player.phase === "playing" ? "暫停音樂" : player.phase === "loading" ? "音樂準備中…" : "播放音樂"}</span>
    </button>
    {player.notice ? <p className="astro-music-notice" role="status">{player.notice}</p> : null}
  </div>;

  async function loadEngine() {
    if (engine.current) return engine.current;
    const [natal, wheel] = await Promise.all([import("@/lib/natal-chart"), import("@/lib/natal-wheel")]);
    engine.current = { resolveLocalTime: natal.resolveLocalTime, computeNatalChart: natal.computeNatalChart, elementCounts: natal.elementCounts, wheelLayout: wheel.wheelLayout };
    return engine.current;
  }

  async function compute(birth: Birth) {
    const place = placeFor(birth);
    if (!place) { setFormError("請選擇出生地點。"); return false; }
    setBusy(true);
    try {
      const tools = await loadEngine();
      // A known birth time must exist exactly once at the place; a repeated one needs her choice.
      let utc: string | undefined;
      if (birth.time) {
        const resolved = tools.resolveLocalTime(birth.date, birth.time, place.timeZone);
        if (resolved.kind === "gap") {
          setFormError(`${birth.date} ${birth.time} 在出生地剛好遇到夏令時間開始，時鐘直接跳過了這段時間，這個時刻在當地不存在。請再確認出生時間（例如出生證明上的時間）。`);
          setView("form");
          return false;
        }
        if (resolved.kind === "repeated") {
          if (birth.fold === undefined) {
            setRepeated({ offsets: [resolved.options[0].offsetMinutes, resolved.options[1].offsetMinutes] });
            setFormError("這個出生時間在出生地出現了兩次（夏令時間結束、時鐘撥回），請在下方選擇是哪一次。");
            setView("form");
            return false;
          }
          utc = resolved.options[birth.fold].utc.toISOString();
        } else {
          utc = resolved.utc.toISOString();
        }
      }
      const chart = tools.computeNatalChart({ date: birth.date, time: birth.time, latitude: place.latitude, longitude: place.longitude, timeZone: place.timeZone, utc });
      setComputed({ birth, place, chart, wheel: tools.wheelLayout(chart), elements: tools.elementCounts(chart) });
      setAttachBirth(false);
      setView("result");
      return true;
    } catch {
      setFormError("星盤暫時排不出來，請重新整理頁面後再試一次。");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setFormError("");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < "1900-01-01" || date > todayInTaipei()) { setFormError("請填寫正確的出生日期。"); return; }
    if (!timeUnknown && !/^\d{2}:\d{2}$/.test(time)) { setFormError("請填寫出生時間；不知道的話，勾選「不知道出生時間」。"); return; }
    let custom: Birth["custom"];
    if (placeId === CUSTOM) {
      custom = { latitude: Number(customLat), longitude: Number(customLon), timeZone: customZone };
      if (customLat.trim() === "" || customLon.trim() === "" || !validCustom(custom)) { setFormError("請填寫正確的緯度（-89.9～89.9）、經度（-180～180），並選擇出生地的時區。"); return; }
    }
    if (repeated && fold === null && !timeUnknown) { setFormError("這個出生時間在出生地出現了兩次，請在下方選擇是哪一次。"); return; }
    const birth: Birth = { date, time: timeUnknown ? null : time, placeId, ...(custom ? { custom } : {}), ...(repeated && fold !== null && !timeUnknown ? { fold } : {}) };
    const done = await compute(birth);
    if (!done) return;
    try {
      if (remember) { localStorage.setItem(BIRTH_STORE, JSON.stringify(birth)); setSaved(birth); }
    } catch { /* this device cannot keep it; the chart still shows */ }
  }

  function editBirth(from: Birth | null) {
    if (from) {
      setDate(from.date);
      setTime(from.time ?? "");
      setTimeUnknown(from.time === null);
      setPlaceId(from.placeId);
      if (from.custom) { setCustomLat(String(from.custom.latitude)); setCustomLon(String(from.custom.longitude)); setCustomZone(from.custom.timeZone); }
    }
    setRepeated(null);
    setFold(null);
    setRemember(false);
    setFormError("");
    setView("form");
  }

  function forget() {
    try { localStorage.removeItem(BIRTH_STORE); } catch { /* nothing kept */ }
    setSaved(null);
  }

  const replacing = Boolean(saved && remember && (saved.date !== date || saved.time !== (timeUnknown ? null : time) || saved.placeId !== placeId || (placeId === CUSTOM && (String(saved.custom?.latitude) !== customLat || String(saved.custom?.longitude) !== customLon || saved.custom?.timeZone !== customZone))));
  // Any change to the date, time or place asks again whether the time is repeated there.
  const resetTime = () => { setRepeated(null); setFold(null); setFormError(""); };

  return <main className={`astro-page pearl-page astro-view-${view}`}>
    {player.mounted ? <div className="astro-audio-only" aria-hidden="true"><iframe key={player.frame} ref={musicFrame} onLoad={onMusicLoad} src="https://www.youtube-nocookie.com/embed/MRQsx1-_1jc?enablejsapi=1&playsinline=1&loop=1&playlist=MRQsx1-_1jc&controls=0&rel=0" title="探索妳的星盤背景音樂" allow="autoplay; encrypted-media" referrerPolicy="strict-origin-when-cross-origin" tabIndex={-1} /></div> : null}

    {view === "intro" && <section className="astro-intro">
      <div className="astro-intro-art"><img src="/astrology-exploration/armillary.webp" srcSet="/astrology-exploration/armillary-560.webp 560w, /astrology-exploration/armillary.webp 880w" sizes="(max-width: 760px) 78vw, 440px" alt="香檳金色的天球儀，刻著十二星座的金環，中心是一顆珍珠球" width={880} height={880} /></div>
      <div className="astro-intro-copy">
        <div className="astro-intro-head"><small>your natal chart</small>{music}</div>
        <h1>探索妳的星盤</h1>
        <p className="astro-subtitle">輸入出生日期、時間和地點，排出妳的本命盤，看看太陽、月亮、上升和其他行星落在哪裡，以及它們在說些什麼。</p>
        <ul className="astro-facts"><li>約 2 分鐘</li><li>不需要先懂占星</li><li>出生資料只在妳的裝置上排盤</li></ul>
        <div className="astro-actions">
          {saved ? <button type="button" className="astro-primary" disabled={busy} onClick={() => void compute(saved)}>用記住的出生資料排盤 <b>→</b></button> : null}
          <button type="button" className={saved ? "astro-secondary" : "astro-primary"} onClick={() => editBirth(saved)}>{saved ? "輸入新的出生資料" : "開始排盤"} {saved ? null : <b>→</b>}</button>
        </div>
        {saved ? <p className="astro-kept">這台裝置記住了 {saved.date} 的出生資料。<button type="button" className="astro-text-button" onClick={forget}>清除記住的出生資料</button></p> : null}
        {hasOldRecords ? <p className="astro-kept">以前的星盤探索紀錄，可以在 <Link href="/admin">我的存檔</Link> 查看。</p> : null}
      </div>
    </section>}

    {view === "form" && <section className="astro-form-view">
      <div className="astro-top-bar"><button type="button" className="astro-back" onClick={() => setView("intro")}>← 返回</button>{music}</div>
      <small className="astro-kicker">birth details</small>
      <h1>妳的出生資料</h1>
      <p className="astro-lead">出生時間越準確，上升星座和宮位越準確。可以參考出生證明或媽媽手冊。</p>
      <form className="astro-form" onSubmit={(event) => { event.preventDefault(); void submit(); }} noValidate>
        <label><span>出生日期</span><input type="date" value={date} min="1900-01-01" max={todayInTaipei()} onChange={(event) => { setDate(event.target.value); resetTime(); }} required /></label>
        <label><span>出生時間</span><input type="time" value={time} disabled={timeUnknown} onChange={(event) => { setTime(event.target.value); resetTime(); }} /></label>
        <label className="astro-check"><input type="checkbox" checked={timeUnknown} onChange={(event) => { setTimeUnknown(event.target.checked); resetTime(); }} /><span>不知道出生時間（不會顯示上升星座和宮位）</span></label>
        {repeated && !timeUnknown ? <fieldset className="astro-fold">
          <legend>這個時間在出生地出現了兩次，是哪一次？</legend>
          <label className="astro-check"><input type="radio" name="fold" checked={fold === 0} onChange={() => setFold(0)} /><span>第一次（時鐘撥回前，{utcLabel(repeated.offsets[0])}）</span></label>
          <label className="astro-check"><input type="radio" name="fold" checked={fold === 1} onChange={() => setFold(1)} /><span>第二次（時鐘撥回後，{utcLabel(repeated.offsets[1])}）</span></label>
          <small>不確定的話，可以問問家人，或看出生證明上有沒有寫「夏令時間」。</small>
        </fieldset> : null}
        <label><span>出生地點</span>
          <select value={placeId} onChange={(event) => { setPlaceId(event.target.value); resetTime(); }}>
            {PLACE_GROUPS.map((group) => <optgroup label={group} key={group}>{BIRTH_PLACES.filter((place) => place.group === group).map((place) => <option value={place.id} key={place.id}>{place.name}</option>)}</optgroup>)}
            <optgroup label="其他"><option value={CUSTOM}>自行輸入經緯度（進階）</option></optgroup>
          </select>
          <small>排盤使用所選城市的市中心座標。出生城市不在清單裡，可以選最接近的城市（上升和宮位會是近似值），或選最下方的「自行輸入經緯度」。</small>
        </label>
        {placeId === CUSTOM ? <div className="astro-custom">
          <label><span>緯度</span><input type="number" inputMode="decimal" step="0.01" min="-89.9" max="89.9" placeholder="例如 25.03（南緯用負數）" value={customLat} onChange={(event) => { setCustomLat(event.target.value); resetTime(); }} /></label>
          <label><span>經度</span><input type="number" inputMode="decimal" step="0.01" min="-180" max="180" placeholder="例如 121.56（西經用負數）" value={customLon} onChange={(event) => { setCustomLon(event.target.value); resetTime(); }} /></label>
          <label><span>出生地時區</span><select value={customZone} onChange={(event) => { setCustomZone(event.target.value); resetTime(); }}>{timeZones().map((zone) => <option value={zone} key={zone}>{zone}</option>)}</select></label>
          <small>可以在地圖 App 長按出生地點，複製顯示的緯度和經度。時區用出生地所在城市（例如 Asia/Taipei）。</small>
        </div> : null}
        <label className="astro-check"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span>記住這次的出生資料（只存在這台裝置，可以隨時清除）</span></label>
        {replacing ? <p className="astro-warn">勾選後，會取代之前記住的 {saved?.date} 出生資料。</p> : null}
        {formError ? <p className="astro-error" role="alert">{formError}</p> : null}
        <button type="submit" className="astro-primary" disabled={busy}>{busy ? "排盤中…" : "排出我的星盤"} <b>→</b></button>
      </form>
    </section>}

    {view === "result" && computed && <ChartResult computed={computed} music={music} attachBirth={attachBirth} setAttachBirth={setAttachBirth} onEdit={() => editBirth(computed.birth)} />}

    <footer className="astro-footer">星盤解讀是自我探索的參考，不替代心理、醫療、法律或財務專業建議。出生資料只在妳的裝置上用來排盤，不會傳到網站；只有勾選「附上我的出生資料」時，才會放進 LINE 預填訊息。背景音樂由 YouTube 播放。</footer>
  </main>;
}

const PLANET_MARK_TEXT: Record<PlanetId, string> = { sun: "日", moon: "月", mercury: "水", venus: "金", mars: "火", jupiter: "木", saturn: "土", uranus: "天", neptune: "海", pluto: "冥", node: "北" };

function Reading({ chart, id, title, question, texts }: { chart: NatalChart; id: PlanetId; title: string; question: string; texts: Record<SignId, string> }) {
  const item = chart.placements.find((placement) => placement.id === id)!;
  const unsure = chart.uncertain[id];
  return <article className="astro-reading">
    <header><span className="astro-mark" aria-hidden="true">{PLANET_MARK_TEXT[id]}</span><div><h3>{title}</h3><small>{question}</small></div></header>
    {unsure ? <>
      <p className="astro-placement">{PLANET_NAMES[id]}可能在 {SIGN_NAMES[unsure[0]]} 或 {SIGN_NAMES[unsure[1]]}</p>
      <p className="astro-unsure">妳出生那天{PLANET_NAMES[id]}換了星座，沒有出生時間無法確定是哪一個。兩段都可以讀讀看，留意哪一段比較像妳。</p>
      <p><b>{SIGN_NAMES[unsure[0]]}：</b>{texts[unsure[0]]}</p>
      <p><b>{SIGN_NAMES[unsure[1]]}：</b>{texts[unsure[1]]}</p>
    </> : <>
      <p className="astro-placement">{PLANET_NAMES[id]}在{SIGN_NAMES[item.sign]} {degreeText(item.longitude)}{item.house ? `・第 ${item.house} 宮` : ""}{item.retrograde ? "・逆行" : ""}</p>
      <p>{texts[item.sign]}</p>
    </>}
  </article>;
}

function ChartResult({ computed, music, attachBirth, setAttachBirth, onEdit }: { computed: Computed; music: React.ReactNode; attachBirth: boolean; setAttachBirth: (value: boolean) => void; onEdit: () => void }) {
  const { chart, birth, place, wheel, elements } = computed;
  const message = bookingMessage({ date: birth.date, time: birth.time, place: place.name }, attachBirth);
  const strongest = (Object.entries(elements) as ["火" | "土" | "風" | "水", number][]).sort((a, b) => b[1] - a[1]);
  const total = strongest.reduce((sum, [, count]) => sum + count, 0);
  const lead = strongest[0][1] > strongest[1][1] ? strongest[0][0] : null;

  return <section className="astro-result">
    <div className="astro-top-bar"><button type="button" className="astro-back" onClick={onEdit}>← 修改出生資料</button>{music}</div>
    <small className="astro-kicker">your natal chart</small>
    <h1>妳的本命盤</h1>
    <p className="astro-birth-line">{birth.date}・{birth.time ?? "出生時間不確定"}{birth.fold !== undefined ? `（當地第${birth.fold === 0 ? "一" : "二"}次的 ${birth.time}）` : ""}・{place.name}</p>

    <figure className="astro-wheel-wrap">
      <ChartWheel wheel={wheel} houses={chart.cusps !== null} />
      <figcaption>{chart.timeKnown ? `外圈是十二星座，內圈是十二宮（${chart.houseSystem === "placidus" ? "Placidus 宮位制" : "等宮制"}）；日、月、水、金、火、木、土、天、海、冥、北代表各個星體。` : "沒有出生時間，所以只畫出星座與行星，不畫上升、天頂和宮位。"}{wheel.aspects.length ? <span className="astro-wheel-legend"><span><i className="is-soft" aria-hidden="true" />藍線：和諧相位（六分、三分）</span><span><i className="is-hard" aria-hidden="true" />粉線：挑戰相位（四分、對分）</span>{chart.timeKnown ? null : <span>沒有出生時間時，月亮的位置不夠準，不畫月亮的相位。</span>}</span> : null}</figcaption>
    </figure>
    {chart.houseSystem === "equal" ? <p className="astro-note">出生地點緯度很高，Placidus 宮位在這個時刻無法計算，這裡改用從上升起算的等宮制。</p> : null}
    {!chart.timeKnown ? <p className="astro-note">沒有出生時間時，用出生當天中午排盤：不顯示上升星座、天頂和宮位{Object.keys(chart.uncertain).length ? "；當天換了星座的星體，會列出兩個可能。" : "。"}</p> : null}

    <h2 className="astro-section-title">三個核心</h2>
    <div className="astro-readings">
      <Reading chart={chart} id="sun" title="太陽" question="我最想活成什麼樣子？" texts={SUN_READINGS} />
      <Reading chart={chart} id="moon" title="月亮" question="什麼讓我感到安心？" texts={MOON_READINGS} />
      {chart.ascendant !== null ? <article className="astro-reading">
        <header><span className="astro-mark" aria-hidden="true">升</span><div><h3>上升</h3><small>我習慣如何面對世界？</small></div></header>
        <p className="astro-placement">上升在{SIGN_NAMES[signOfLongitude(chart.ascendant)]} {degreeText(chart.ascendant)}</p>
        <p>{ASCENDANT_READINGS[signOfLongitude(chart.ascendant)]}</p>
      </article> : <article className="astro-reading is-missing"><header><span className="astro-mark" aria-hidden="true">升</span><div><h3>上升</h3><small>我習慣如何面對世界？</small></div></header><p>上升星座需要準確的出生時間（每兩小時左右就會換一個星座），知道出生時間後再回來排一次。</p></article>}
    </div>

    <h2 className="astro-section-title">思考、喜歡與行動</h2>
    <div className="astro-readings">
      <Reading chart={chart} id="mercury" title="水星" question="我如何理解與表達？" texts={MERCURY_LINES} />
      <Reading chart={chart} id="venus" title="金星" question="我如何表達喜歡、建立連結？" texts={VENUS_LINES} />
      <Reading chart={chart} id="mars" title="火星" question="我如何推進事情、面對衝突？" texts={MARS_LINES} />
    </div>

    <h2 className="astro-section-title">四元素</h2>
    <div className="astro-elements">
      {(["火", "土", "風", "水"] as const).map((element) => <div key={element}><b>{element}</b><span className="astro-bar"><i style={{ width: `${total ? Math.round((elements[element] / total) * 100) : 0}%` }} /></span><em>{elements[element]}</em></div>)}
      <p>{lead ? ELEMENT_LINES[lead] : "四個元素分布得比較平均：妳能在不同狀態之間切換，也可以留意自己最常用、最少用的是哪一種。"}</p>
      <small>計算太陽到冥王星共 {total} 顆星體，只是自我探索的提示，不是性格分數。</small>
    </div>

    <h2 className="astro-section-title">行星位置</h2>
    <div className="astro-table-wrap"><table className="astro-table">
      <thead><tr><th scope="col">星體</th><th scope="col">星座</th><th scope="col">度數</th>{chart.timeKnown ? <th scope="col">宮位</th> : null}</tr></thead>
      <tbody>
        {chart.placements.map((item) => <tr key={item.id}><th scope="row">{PLANET_NAMES[item.id]}{item.retrograde ? <small>逆行</small> : null}</th><td>{chart.uncertain[item.id] ? `${SIGN_NAMES[chart.uncertain[item.id]![0]]}／${SIGN_NAMES[chart.uncertain[item.id]![1]]}` : SIGN_NAMES[item.sign]}</td><td>{chart.uncertain[item.id] ? "—" : degreeText(item.longitude)}</td>{chart.timeKnown ? <td>{item.house}</td> : null}</tr>)}
        {chart.ascendant !== null && chart.midheaven !== null ? <>
          <tr><th scope="row">上升</th><td>{SIGN_NAMES[signOfLongitude(chart.ascendant)]}</td><td>{degreeText(chart.ascendant)}</td><td>1</td></tr>
          <tr><th scope="row">天頂</th><td>{SIGN_NAMES[signOfLongitude(chart.midheaven)]}</td><td>{degreeText(chart.midheaven)}</td><td>10</td></tr>
        </> : null}
      </tbody>
    </table></div>

    <section className="astro-booking" aria-labelledby="astro-booking-title">
      <small className="astro-kicker">personal chart reading</small>
      <h2 id="astro-booking-title">想看懂整張星盤？</h2>
      <p>這裡讀的是單一星體落在哪個星座，是認識自己的入門。Zola 的星盤解析會把整張星盤放在一起看：妳的核心議題、反覆出現的模式，以及此刻最值得理解的地方。</p>
      <label className="astro-check"><input type="checkbox" checked={attachBirth} onChange={(event) => setAttachBirth(event.target.checked)} /><span>附上我的出生資料（日期、時間、地點）</span></label>
      <p className="astro-preview-label">打開 LINE 後會先放進輸入框，妳確認後再按送出：</p>
      <pre className="astro-preview">{message}</pre>
      <a className="astro-primary" href={lineMessageUrl(message)} target="_blank" rel="noreferrer">傳 LINE 預約星盤解析 <b>→</b></a>
    </section>
  </section>;
}

function ChartWheel({ wheel, houses }: { wheel: ReturnType<typeof wheelLayout>; houses: boolean }) {
  const { center, rim, outer, zodiacInner, inner, aspect } = WHEEL;
  // v2 (精緻金色星象儀): pearl rim, tinted zodiac band, 1° scale, planet seals, houses, aspect web.
  return <svg className="astro-wheel" viewBox="0 0 400 400" role="img" aria-label="本命盤圖：外圈十二星座、刻度與各星體位置，內圈宮位，中間的線是相位，詳細數值見下方表格">
    <defs>
      <radialGradient id="astro-wheel-pearl" cx="50%" cy="42%" r="62%"><stop offset="0%" stopColor="#ffffff" /><stop offset="72%" stopColor="#fdf8fb" /><stop offset="100%" stopColor="#f2f5fb" /></radialGradient>
      <linearGradient id="astro-wheel-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ead7a8" /><stop offset="45%" stopColor="#c5a46f" /><stop offset="100%" stopColor="#dcc28d" /></linearGradient>
      <radialGradient id="astro-wheel-seal" cx="40%" cy="35%" r="70%"><stop offset="0%" stopColor="#ffffff" /><stop offset="100%" stopColor="#fbf1f5" /></radialGradient>
    </defs>
    <circle cx={center} cy={center} r={rim} fill="url(#astro-wheel-pearl)" stroke="url(#astro-wheel-gold)" strokeWidth="1.8" />
    <circle cx={center} cy={center} r={rim - 5} fill="none" stroke="#d9bf8c" strokeWidth=".5" />
    {wheel.pearls.map((pearl, index) => <circle key={`pearl-${index}`} cx={pearl.x} cy={pearl.y} r="1.35" fill="#fffaf2" stroke="#cfb07a" strokeWidth=".45" />)}
    {wheel.signs.map((sign) => <path key={`band-${sign.index}`} d={sign.band} fill={sign.index % 2 === 0 ? "#fcf1f5" : "#f1f5fc"} stroke="#d2b47d" strokeWidth=".7" />)}
    <circle cx={center} cy={center} r={outer} fill="none" stroke="url(#astro-wheel-gold)" strokeWidth="1.1" />
    {wheel.signs.map((sign) => <text key={`sign-${sign.index}`} x={sign.label.x} y={sign.label.y} className="astro-wheel-sign" textAnchor="middle" dominantBaseline="central">{SHORT_SIGN[sign.index]}</text>)}
    <circle cx={center} cy={center} r={zodiacInner} fill="#fffdfb" stroke="url(#astro-wheel-gold)" strokeWidth="1.3" />
    <g className="astro-wheel-scale">
      {wheel.ticks.map((tick, index) => <line key={`tick-${index}`} x1={tick.line[0].x} y1={tick.line[0].y} x2={tick.line[1].x} y2={tick.line[1].y} stroke={tick.size === "minor" ? "#d8be8a" : "#c5a46f"} strokeWidth={tick.size === "major" ? 1 : tick.size === "mid" ? .75 : .5} />)}
    </g>
    {houses ? wheel.houses.map((house) => <g key={`house-${house.number}`}>
      <line x1={house.line[0].x} y1={house.line[0].y} x2={house.line[1].x} y2={house.line[1].y} stroke={house.angle ? "#c5a46f" : "#dcc69a"} strokeWidth={house.angle ? 1 : .55} />
      <text x={house.label.x} y={house.label.y} className="astro-wheel-house" textAnchor="middle" dominantBaseline="central">{house.number}</text>
    </g>) : null}
    {wheel.axes.map((axis) => <line key={axis.name} x1={axis.line[0].x} y1={axis.line[0].y} x2={axis.line[1].x} y2={axis.line[1].y} stroke="#9a4a64" strokeWidth="1.1" />)}
    <circle cx={center} cy={center} r={inner} fill="url(#astro-wheel-pearl)" stroke="url(#astro-wheel-gold)" strokeWidth="1.1" />
    <circle cx={center} cy={center} r={aspect + 1.5} fill="none" stroke="#e2cfa6" strokeWidth=".4" strokeDasharray="1 2.6" />
    <g className="astro-wheel-aspects">
      {wheel.aspects.map((line) => <line key={`${line.a}-${line.b}`} x1={line.line[0].x} y1={line.line[0].y} x2={line.line[1].x} y2={line.line[1].y} stroke={line.kind === "soft" ? "#7f9fc8" : "#cf7f98"} strokeWidth={line.orb < 2 ? .95 : .65} strokeOpacity=".85" />)}
      {wheel.planets.filter((planet) => wheel.aspects.some((line) => line.a === planet.id || line.b === planet.id)).map((planet) => <circle key={`dot-${planet.id}`} cx={planet.aspectAt.x} cy={planet.aspectAt.y} r="1.5" fill="#c5a46f" />)}
    </g>
    <g className="astro-wheel-star" fill="#e9d6aa" stroke="#c5a46f" strokeWidth=".5">
      {Array.from({ length: 4 }, (_, index) => <path key={index} d={`M ${center} ${center - 7} L ${center + 1.6} ${center} L ${center} ${center + 7} L ${center - 1.6} ${center} Z`} transform={`rotate(${index * 45} ${center} ${center})`} />)}
    </g>
    {wheel.planets.map((planet) => <g key={planet.id} className="astro-wheel-planet">
      <line x1={planet.tick[0].x} y1={planet.tick[0].y} x2={planet.tick[1].x} y2={planet.tick[1].y} stroke="#9a4a64" strokeWidth="1.2" strokeLinecap="round" />
      {planet.leader ? <line x1={planet.leader[0].x} y1={planet.leader[0].y} x2={planet.leader[1].x} y2={planet.leader[1].y} stroke="#d8be8a" strokeWidth=".45" /> : null}
      <circle cx={planet.marker.x} cy={planet.marker.y} r="10" fill="url(#astro-wheel-seal)" stroke="url(#astro-wheel-gold)" strokeWidth=".9" />
      <text x={planet.marker.x} y={planet.marker.y} textAnchor="middle" dominantBaseline="central" className="astro-wheel-mark">{planet.mark}</text>
      <text x={planet.label.x} y={planet.label.y} textAnchor="middle" dominantBaseline="central" className="astro-wheel-degree">{planet.degree}°{planet.retrograde ? <tspan className="astro-wheel-retro">R</tspan> : null}</text>
    </g>)}
    {wheel.axes.map((axis) => <text key={`label-${axis.name}`} x={axis.at.x} y={axis.at.y} className="astro-wheel-axis" textAnchor="middle" dominantBaseline="central">{axis.name}</text>)}
  </svg>;
}
