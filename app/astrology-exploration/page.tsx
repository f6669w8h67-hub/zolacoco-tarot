"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ZOLA_LINE_URL } from "@/lib/contact";
import { MUSIC_WAIT_MS, initialMusic, musicStep, type MusicEvent, type MusicState } from "@/lib/astro-music";
import "../styles/pearl-page.css";
import "./astrology-exploration.css";

const YT_ORIGIN = "https://www.youtube-nocookie.com";

type View = "intro" | "theme" | "state" | "need" | "focus" | "result" | "service" | "records";
type Choice = { id: string; title: string; note: string };
type Result = {
  title: string;
  chartFocus: string;
  focusNote: string;
  innerNeed: string;
  pattern: string;
  questions: string[];
};
type RecordItem = {
  id: string;
  date: string;
  theme: Choice;
  state: Choice;
  need: Choice;
  focus: Choice;
  note: string;
  result: Result;
};

const STORE = "zolacoco-astrology-exploration-records-v1";

const themes: Choice[] = [
  { id: "relationship", title: "感情與關係", note: "理解自己的愛情需求、互動方式與關係模式" },
  { id: "career", title: "工作天賦與方向", note: "整理適合發揮的能力、職涯選擇與成就感來源" },
  { id: "emotion", title: "情緒與安全感", note: "看見情緒反應、依附需要與真正能安心的方式" },
  { id: "identity", title: "自我價值與定位", note: "理解我是誰、如何表達自己，以及容易懷疑自己的地方" },
  { id: "lesson", title: "人生課題與轉變", note: "釐清目前的考驗、成長方向與生命轉折" },
  { id: "pattern", title: "反覆出現的模式", note: "理解為什麼相似的關係、情緒或選擇總會再次發生" },
];

const states: Choice[] = [
  { id: "unclear", title: "我不知道自己真正想要什麼", note: "選項很多，卻很難做出相信自己的決定" },
  { id: "anxious", title: "我很容易焦慮或想太多", note: "即使事情還沒發生，心裡已經反覆演練很多次" },
  { id: "repeating", title: "相似的問題一直重複", note: "換了情境或對象，熟悉的感受仍然再次出現" },
  { id: "stuck", title: "我很努力，卻感覺卡在原地", note: "做了很多事，仍然沒有真正靠近想要的生活" },
  { id: "pleasing", title: "我常先照顧別人的期待", note: "知道別人需要什麼，卻不容易說出自己的需要" },
  { id: "transition", title: "我正處在人生轉換期", note: "舊的狀態正在結束，新的方向還沒有完全成形" },
];

const needs: Choice[] = [
  { id: "security", title: "安全感與穩定", note: "希望知道自己可以放心依靠什麼" },
  { id: "understood", title: "被理解與被接住", note: "希望真實感受能被看見，而不必一直解釋" },
  { id: "freedom", title: "自由與選擇空間", note: "希望能按照自己的節奏生活，不再被期待推著走" },
  { id: "recognition", title: "肯定與成就感", note: "希望自己的努力有價值，也能相信自己的能力" },
  { id: "belonging", title: "歸屬感與連結", note: "希望在關係或群體中，仍然能安心做自己" },
  { id: "direction", title: "清楚的方向感", note: "希望知道現在的選擇，正把自己帶往哪裡" },
];

const focuses: Choice[] = [
  { id: "inner", title: "我的內在情緒與安全感", note: "想從月亮、第四宮與情緒反應開始理解" },
  { id: "self", title: "我是誰，以及如何活出自己", note: "想從太陽、上升與第一宮整理自我定位" },
  { id: "love", title: "我的感情需求與關係模式", note: "想從金星、火星與第七宮理解互動方式" },
  { id: "career", title: "我的天賦、工作與人生方向", note: "想從天頂、第十宮與土星理解職涯課題" },
  { id: "lesson", title: "反覆出現的人生課題", note: "想從南北交點、土星與冥王星尋找深層線索" },
  { id: "whole", title: "我還不確定，想從整體星盤開始", note: "希望先看懂星盤主軸，再決定最想深入的地方" },
];

const focusByTheme: Record<string, { title: string; chart: string; note: string }> = {
  relationship: { title: "在關係裡，看見真正想被如何愛著的自己", chart: "金星 × 火星 × 第七宮", note: "適合深入愛情需求、被吸引的模式、主動與退讓的方式，以及長期關係中的課題。" },
  career: { title: "在工作選擇裡，找回屬於自己的成就感", chart: "天頂 × 第十宮 × 土星", note: "適合整理天賦如何被看見、對成就的期待、職涯壓力，以及願意長期累積的方向。" },
  emotion: { title: "理解情緒背後，那個一直想被安穩接住的自己", chart: "月亮 × 第四宮 × 上升", note: "適合理解本能反應、安全感來源、家庭影響，以及壓力來臨時如何照顧自己。" },
  identity: { title: "把外界的期待放下，重新認識真正的自己", chart: "太陽 × 上升 × 第一宮", note: "適合整理自我認同、表達方式、核心動力，以及為什麼有時很難肯定自己的選擇。" },
  lesson: { title: "理解此刻的轉變，正在邀請妳學會什麼", chart: "南北交點 × 土星 × 冥王星", note: "適合梳理重要轉折、長期考驗、需要放下的習慣，以及下一階段的成長方向。" },
  pattern: { title: "看懂反覆出現的模式，才有機會做出不同選擇", chart: "土星 × 冥王星 × 南北交點", note: "適合理解熟悉卻消耗的循環、害怕改變的原因，以及生命中需要重新建立的界線。" },
};

const needCopy: Record<string, string> = {
  security: "妳此刻很重視可預期、可依靠的感覺。比起逼自己勇敢，更重要的是先辨認什麼會讓妳真正安心。",
  understood: "妳需要的不一定是更多建議，而是感受能被聽懂。星盤探索可以幫妳找到情緒語言，以及妳習慣隱藏需要的方式。",
  freedom: "妳正在尋找能自己做決定的空間。值得理解的是：妳害怕失去什麼，又為了符合期待放下了什麼。",
  recognition: "妳希望努力能被看見，也想更相信自己的價值。這份需要可以帶妳回到成就感、能力與自我肯定的來源。",
  belonging: "妳渴望連結，但也不想在關係裡失去自己。適合整理親密、界線與歸屬感之間的平衡。",
  direction: "妳需要一條能相信的路。星盤不替妳決定答案，但能幫助妳看懂自己做選擇時最在意的核心。",
};

const stateCopy: Record<string, string> = {
  unclear: "當方向模糊時，妳可能不是沒有答案，而是同時聽見太多期待。先分辨哪些聲音屬於自己。",
  anxious: "焦慮常在替妳預演失去控制的可能。理解情緒反應與安全感來源，能讓妳不用只靠反覆思考保護自己。",
  repeating: "重複不代表妳沒有成長，它常提醒某個需要、界線或害怕仍未被真正理解。",
  stuck: "努力沒有帶來靠近感時，值得重新確認：現在追求的目標，是否真的符合妳的內在動力。",
  pleasing: "習慣先讀懂別人，可能讓自己的聲音越來越小。這次探索邀請妳把需要放回同等重要的位置。",
  transition: "轉換期的不確定不是失敗，而是舊方法已經不再適合。妳正在為下一個版本的自己騰出空間。",
};

/**
 * Step 4 (ChatGPT spec, 2026-11-14): a bright pearl astrology salon. The seven dark scene photos
 * (3 MB PNGs each) are no longer requested; one light gold chart in line, drawn in SVG, decorates
 * every view at a different size. It is a decoration only: nothing here calculates a natal chart.
 */
function AstroChart({ className = "" }: { className?: string }) {
  const planets = [18, 74, 131, 199, 262, 318];
  const at = (deg: number, r: number) => [100 + r * Math.cos((deg * Math.PI) / 180), 100 + r * Math.sin((deg * Math.PI) / 180)];
  return <svg className={`astro-chart ${className}`} viewBox="0 0 200 200" fill="none" stroke="currentColor" aria-hidden="true">
    <circle cx="100" cy="100" r="94" strokeWidth="1.1" /><circle cx="100" cy="100" r="80" strokeWidth=".8" /><circle cx="100" cy="100" r="44" strokeWidth=".8" /><circle cx="100" cy="100" r="7" strokeWidth=".8" />
    {Array.from({ length: 72 }, (_, i) => { const [x1, y1] = at(i * 5, 80); const [x2, y2] = at(i * 5, i % 6 === 0 ? 94 : 85); return <line key={`t${i}`} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={i % 6 === 0 ? .9 : .5} />; })}
    {Array.from({ length: 12 }, (_, i) => { const [x1, y1] = at(i * 30 + 15, 44); const [x2, y2] = at(i * 30 + 15, 80); return <line key={`h${i}`} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth=".5" />; })}
    <ellipse className="astro-chart-ring" cx="100" cy="100" rx="96" ry="30" transform="rotate(-24 100 100)" strokeWidth=".8" strokeDasharray="3 4" />
    <ellipse className="astro-chart-ring" cx="100" cy="100" rx="96" ry="22" transform="rotate(58 100 100)" strokeWidth=".7" strokeDasharray="2 5" />
    <path className="astro-chart-aspect" d={`M${at(planets[0], 62).join(" ")} L${at(planets[2], 62).join(" ")} L${at(planets[4], 62).join(" ")} Z M${at(planets[1], 62).join(" ")} L${at(planets[3], 62).join(" ")}`} strokeWidth=".7" strokeDasharray="2 3" />
    {planets.map((deg) => { const [x, y] = at(deg, 62); return <circle key={deg} cx={x} cy={y} r="2.6" fill="currentColor" stroke="none" />; })}
  </svg>;
}

const dateLabel = () => new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "long", day: "numeric" }).format(new Date());
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `astro-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function makeResult(theme: Choice, state: Choice, need: Choice, focus: Choice, note: string): Result {
  const base = focusByTheme[theme.id] ?? focusByTheme.pattern;
  const customFocus = focus.id === "whole" ? base.chart : focus.title.replace("我的", "");
  const subject = theme.id === "relationship" ? "關係中真正需要的互動與安全感" : theme.id === "career" ? "工作選擇、天賦與成就感" : theme.id === "emotion" ? "情緒反應與安全感來源" : theme.id === "identity" ? "自我定位與表達方式" : theme.id === "lesson" ? "人生轉折與成長課題" : "反覆出現的選擇與情緒模式";
  return {
    title: base.title,
    chartFocus: focus.id === "whole" ? base.chart : `${customFocus}｜${base.chart}`,
    focusNote: base.note,
    innerNeed: needCopy[need.id],
    pattern: stateCopy[state.id],
    questions: [
      `我的星盤如何呈現「${need.title}」這項核心需要？`,
      `為什麼我在${subject}上，容易出現「${state.title}」的感受？`,
      note.trim() ? `關於「${note.trim()}」，我的本命盤能提供哪些理解與行動方向？` : `我可以如何運用自己的星盤優勢，回應目前最在意的「${theme.title}」課題？`,
    ],
  };
}

function ChoicePage({ view, step, title, copy, choices, value, onSelect, onBack, onNext, music, children }: { view: View; step: number; title: string; copy: string; choices: Choice[]; value: Choice | null; onSelect: (choice: Choice) => void; onBack: () => void; onNext: () => void; music: React.ReactNode; children?: React.ReactNode }) {
  return <section className={`astro-step astro-step-${view}`}>
    <AstroChart className="astro-chart-side" />
    <div className="astro-step-panel">
      <div className="astro-progress"><button onClick={onBack}>← 上一步</button><span aria-label={`第 ${step} 步，共 4 步`}>{String(step).padStart(2, "0")} / 04</span>{music}</div>
      <div className="astro-progress-line" role="progressbar" aria-label="探索進度" aria-valuemin={0} aria-valuemax={4} aria-valuenow={step}><i style={{ width: `${step * 25}%` }} /></div>
      <small>follow your honest feeling</small>
      <h1>{title}</h1>
      <p className="astro-lead">{copy}</p>
      <aside className="astro-mindset"><b>作答提醒</b><p>先選第一個讓妳有感覺的答案。這裡沒有好壞或標準答案，也不需要選擇「理想中的自己」。</p></aside>
      <div className="astro-choices">{choices.map((choice, index) => <button key={choice.id} type="button" aria-pressed={value?.id === choice.id} className={value?.id === choice.id ? "active" : ""} onClick={() => onSelect(choice)}><i>{String(index + 1).padStart(2, "0")}</i><span><b>{choice.title}</b><small>{choice.note}</small></span><em>{value?.id === choice.id ? "✓ 已選擇" : "選擇"}</em></button>)}</div>
      {children}
      <button className="astro-primary astro-next" disabled={!value} onClick={onNext}>{step === 4 ? "整理我的探索結果" : "繼續探索"} <b>→</b></button>
    </div>
  </section>;
}

export default function AstrologyExplorationPage() {
  const [view, setView] = useState<View>("intro");
  const [theme, setTheme] = useState<Choice | null>(null);
  const [state, setState] = useState<Choice | null>(null);
  const [need, setNeed] = useState<Choice | null>(null);
  const [focus, setFocus] = useState<Choice | null>(null);
  const [note, setNote] = useState("");
  // read on the client after mounting, so the first render matches the server (records unchanged)
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [recordsReady, setRecordsReady] = useState(false);
  useEffect(() => {
    const load = window.setTimeout(() => {
      try { setRecords(JSON.parse(localStorage.getItem(STORE) || "[]")); } catch { setRecords([]); }
      setRecordsReady(true);
    }, 0);
    return () => window.clearTimeout(load);
  }, []);
  const [saved, setSaved] = useState(false);
  // Music: never starts by itself. The rules live in lib/astro-music.ts; this only runs its
  // commands, keeps the wait timer and talks to the YouTube player.
  const [player, setPlayer] = useState<MusicState>(initialMusic);
  const playerRef = useRef<MusicState>(initialMusic);
  const musicFrame = useRef<HTMLIFrameElement | null>(null);
  const musicWait = useRef(0);
  const musicHello = useRef(0);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [view]);

  const result = useMemo(() => theme && state && need && focus ? makeResult(theme, state, need, focus, note) : null, [theme, state, need, focus, note]);

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

  function beginJourney() {
    setView("theme");
  }

  const music = <div className="astro-music">
    <button className={`astro-music-toggle ${player.phase === "playing" ? "is-playing" : ""}`} type="button" aria-pressed={player.phase === "playing"} aria-busy={player.phase === "loading"} onClick={() => dispatchMusic({ type: "tap" })}>
      <i aria-hidden="true"><span /><span /><span /></i>
      <span>{player.phase === "playing" ? "暫停音樂" : player.phase === "loading" ? "音樂準備中…" : "播放音樂"}</span>
    </button>
    {player.notice ? <p className="astro-music-notice" role="status">{player.notice}</p> : null}
  </div>;

  function restart() { setTheme(null); setState(null); setNeed(null); setFocus(null); setNote(""); setSaved(false); setView("intro"); }
  function saveRecord() {
    if (!theme || !state || !need || !focus || !result || saved) return;
    const item: RecordItem = { id: makeId(), date: dateLabel(), theme, state, need, focus, note, result };
    const next = [item, ...records];
    setRecords(next);
    localStorage.setItem(STORE, JSON.stringify(next));
    setSaved(true);
    void fetch("/api/activity", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "astrology_exploration", title: "探索妳的星盤", summary: `${theme.title}・${result.chartFocus}`, details: item }) });
  }
  function removeRecord(id: string) {
    if (!window.confirm("確定要刪除這份星盤探索紀錄嗎？")) return;
    const next = records.filter((record) => record.id !== id);
    setRecords(next);
    localStorage.setItem(STORE, JSON.stringify(next));
  }

  return <main className={`astro-page pearl-page astro-view-${view}`}>
    {player.mounted ? <div className="astro-audio-only" aria-hidden="true"><iframe key={player.frame} ref={musicFrame} onLoad={onMusicLoad} src="https://www.youtube-nocookie.com/embed/MRQsx1-_1jc?enablejsapi=1&playsinline=1&loop=1&playlist=MRQsx1-_1jc&controls=0&rel=0" title="探索妳的星盤背景音樂" allow="autoplay; encrypted-media" referrerPolicy="strict-origin-when-cross-origin" tabIndex={-1} /></div> : null}
    {view === "intro" && <section className="astro-intro">
      <div className="astro-intro-art"><AstroChart className="astro-chart-hero" /></div>
      <div className="astro-intro-copy"><div className="astro-intro-head"><small>inner astrology journey</small>{music}</div><h1>探索妳的星盤</h1><p className="astro-subtitle">看見妳的人生課題、內在需求，<br />以及此刻最值得理解的自己。</p><div className="astro-about"><h2>這個體驗可以帶給妳什麼？</h2><p>透過四個簡單提問，整理妳目前最在意的生活主題、反覆感受與內在需要，最後找到適合帶進個人星盤解析的重點。</p><ul><li>約 3 分鐘完成</li><li>不需要先懂占星</li><li>不需要提供出生資料</li></ul></div><aside><b>開始以前，請先記得</b><p>這是自我探索引導，不是實際的本命盤計算。跟著當下最真實的感覺回答即可，妳不需要想得很完整，也不需要迎合任何理想答案。</p></aside><button className="astro-primary" onClick={beginJourney}>開始探索自己 <b>→</b></button><button className="astro-text-button" onClick={() => setView("records")}>查看過往探索紀錄</button></div>
    </section>}

    {view === "theme" && <ChoicePage music={music} view="theme" step={1} title="妳現在最想了解自己的哪一部分？" copy="不用選最嚴重的問題，只要選此刻最希望被理解的地方。" choices={themes} value={theme} onSelect={setTheme} onBack={() => setView("intro")} onNext={() => setView("state")} />}
    {view === "state" && <ChoicePage music={music} view="state" step={2} title="最近，哪一種狀態最靠近妳？" copy="回想最近一至三個月，不必分析原因，先辨認最常出現的感受。" choices={states} value={state} onSelect={setState} onBack={() => setView("theme")} onNext={() => setView("need")} />}
    {view === "need" && <ChoicePage music={music} view="need" step={3} title="在這些感受背後，妳真正想被滿足的是什麼？" copy="選擇最想擁有的感覺，而不是妳覺得自己『應該』需要的答案。" choices={needs} value={need} onSelect={setNeed} onBack={() => setView("state")} onNext={() => setView("focus")} />}
    {view === "focus" && <ChoicePage music={music} view="focus" step={4} title="如果打開自己的星盤，妳最想先從哪裡開始？" copy="這會幫助妳把模糊的困擾，整理成更適合深入解析的方向。" choices={focuses} value={focus} onSelect={setFocus} onBack={() => setView("need")} onNext={() => setView("result")}><label className="astro-note"><b>還有一件最想理解的事嗎？</b><span>可以留下一句話，完成後會替妳整理成解析問題（選填）。</span><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={120} placeholder="例如：為什麼我在關係裡總是不敢說出真正的需要？" /><small>{note.length} / 120</small></label></ChoicePage>}

    {view === "result" && result && theme && state && need && focus && <section className="astro-result">
      <div className="astro-top-bar">{music}</div>
      <div className="astro-result-hero"><small>your inner exploration summary</small><h1><span className="astro-keep">此刻最值得理解的</span><span className="astro-keep">星盤主題</span></h1><p>{result.title}</p></div>
      <div className="astro-result-sheet"><AstroChart className="astro-chart-watermark" /><div className="astro-result-label"><span>探索方向</span><b>{theme.title}</b></div><h2>{result.chartFocus}</h2><p className="astro-focus-note">{result.focusNote}</p><div className="astro-insights"><article><small>妳此刻真正重視的需要</small><h3>{need.title}</h3><p>{result.innerNeed}</p></article><article><small>最近反覆出現的內在訊號</small><h3>{state.title}</h3><p>{result.pattern}</p></article></div><section className="astro-questions"><small>帶進正式解析的 3 個問題</small><h2><span className="astro-keep">妳可以從這三個方向，</span><span className="astro-keep">更深入理解自己</span></h2><ol>{result.questions.map((question) => <li key={question}>{question}</li>)}</ol></section><aside className="astro-clarify"><b>關於這份結果</b><p>這是依照妳的回答整理出的自我探索方向，不是本命盤計算結果。真正的個人星盤解析仍需要出生日期、準確時間與出生地點，才能看見行星、星座和宮位之間的完整關係。</p></aside><div className="astro-result-actions"><button className="astro-primary" onClick={saveRecord}>{saved ? "已收進我的探索紀錄" : "儲存這份探索摘要"}</button><button onClick={() => setView("service")}>了解個人星盤解析 <b>→</b></button><button onClick={restart}>重新做一次</button></div></div>
    </section>}

    {view === "service" && result && <section className="astro-service">
      <div className="astro-service-art"><AstroChart className="astro-chart-service" /></div>
      <div className="astro-service-copy"><div className="astro-top-bar"><button className="astro-back" onClick={() => setView("result")}>← 回到探索摘要</button>{music}</div><small>personal natal chart reading</small><h1>為妳保留一個，<br />好好理解自己的位置</h1><p>免費體驗幫妳找到想問的重點；個人本命星盤解析，則會根據妳的出生資料，完整梳理性格、情緒、關係、工作天賦與人生課題。</p><div className="astro-service-grid"><article><h2>解析會看見什麼？</h2><ul><li>太陽、月亮與上升：核心自我、情緒與外在表現</li><li>金星、火星與第七宮：感情需求與關係模式</li><li>天頂、第十宮與土星：工作天賦、責任與成長方向</li><li>南北交點與重要相位：反覆課題與生命發展主軸</li></ul></article><article><h2>預約前請準備</h2><ul><li>西元出生年月日</li><li>盡量準確的出生時間</li><li>出生城市或地區</li><li>目前最想深入的 1～3 個問題</li></ul></article></div><aside><b>妳這次找到的解析主題</b><p>{result.chartFocus}</p></aside><div className="astro-service-actions"><a className="astro-primary" href={ZOLA_LINE_URL} target="_blank" rel="noreferrer">前往官方 LINE 預約 ↗</a><Link href="/#consult">了解 Zola 的服務方式</Link></div><p className="astro-service-note">點擊後會前往 Zolacoco 官方 LINE，由 Zola 親自確認解析內容與預約方式。</p></div>
    </section>}

    {view === "records" && <section className="astro-records"><div className="astro-records-sheet"><div className="astro-top-bar"><button className="astro-back" onClick={() => setView("intro")}>← 回到星盤探索</button>{music}</div><small>my exploration records</small><h1>我的星盤探索紀錄</h1><p>完成的摘要會保存在這個裝置上，方便妳日後預約解析時再次查看。</p>{!recordsReady ? <p className="astro-loading" role="status">正在讀取這台裝置上的紀錄…</p> : records.length ? <div className="astro-record-list">{records.map((record) => <article key={record.id}><small>{record.date}</small><h2>{record.theme.title}</h2><b>{record.result.chartFocus}</b><p>{record.result.title}</p><ol>{record.result.questions.map((question) => <li key={question}>{question}</li>)}</ol><div className="astro-record-actions"><button onClick={() => { setTheme(record.theme); setState(record.state); setNeed(record.need); setFocus(record.focus); setNote(record.note); setSaved(true); setView("result"); }}>查看完整摘要</button><button onClick={() => removeRecord(record.id)}>刪除</button></div></article>)}</div> : <div className="astro-empty"><AstroChart className="astro-chart-empty" /><h2>還沒有探索紀錄</h2><p>完成四個簡單提問後，妳的內在探索摘要會收藏在這裡。</p><button className="astro-primary" onClick={() => setView("theme")}>開始第一次探索</button></div>}</div></section>}

    <footer className="astro-footer">這項體驗用於自我整理與星盤服務前的問題聚焦，不替代心理、醫療、法律或財務專業建議。</footer>
  </main>;
}
