"use client";

import { useEffect, useRef, useState } from "react";
import { tarotCards, topicLens, type TarotCard } from "./tarot-data";
import { TarotCardBack, TarotCardFace } from "./tarot-card";
import DrawFan from "./draw-fan";
import { MOTION } from "@/lib/draw-fan-math";
import "./styles/draw-pearl.css";
import "./styles/draw-fan.css";
import "./styles/pearl-page.css";
import "./styles/home-pearl.css";
import { ZOLA_LINE_URL, lineMessageUrl } from "@/lib/contact";
import { loadMemberProfile } from "@/lib/member-client";
import {
  QUESTION_LIMIT, SPREADS, TAROT_TOPICS, type SpreadId, cleanQuestion, consultMessage,
  memberExpiryLabel, recommendedSpread, relationshipLens, spreadAfterTopicChange, spreadForTopic, spreadsForTopic, tarotRecord,
} from "@/lib/tarot-reading";
import { type CardReading, othersLine, speaksForOthers, synthesisOpening, synthesisParts, topicReading } from "@/lib/tarot-synthesis";


// Explore v2 (2026-11-13): the three practices that open right here are tabs above their panel;
// the pendulum and the astro dice have pages of their own, so they are picture cards that link there.
const practiceTools = [
  { id: "archetype", number: "01", title: "此刻的內在原型", short: "內在原型", desc: "從幾個直覺選擇，看見此刻最靠近你的大牌能量。" },
  { id: "intuition", number: "02", title: "牌面直覺練習室", short: "直覺練習", desc: "先不看標準牌義，練習相信自己從畫面讀到的訊息。" },
  { id: "journal", number: "03", title: "七日塔羅內在筆記", short: "七日筆記", desc: "每天一個提問，慢慢整理情緒、關係與真正的需要。" },
] as const;
const pageTools = [
  { href: "/pendulum", number: "04", title: "靈擺直覺問答", desc: "把問題整理成是非題，透過擺動停下來聽見此刻的直覺。", room: "/pendulum/hero-desktop.webp", charm: ["/pendulum/metal.webp", "/pendulum/crystal.webp"] },
  { href: "/astro-dice", number: "05", title: "星骰此刻指引", desc: "擲出行星、星座與宮位，拆解此刻的能量、表現方式與生活領域。", room: "/astro-dice/hero-desktop.webp", charm: ["/astro-dice/die.webp"] },
] as const;

/** Thin gold line icons for the three practice tabs. */
function PracticeIcon({ id }: { id: string }) {
  const common = { width: 28, height: 28, viewBox: "0 0 28 28", fill: "none", stroke: "currentColor", strokeWidth: 1.3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (id === "intuition") return <svg {...common}><path d="M3 14c3-5 7-7.5 11-7.5S22 9 25 14c-3 5-7 7.5-11 7.5S6 19 3 14Z" /><circle cx="14" cy="14" r="3.6" /><path d="M14 3v1.6M6.5 5.5l1 1.2M21.5 5.5l-1 1.2" /></svg>;
  if (id === "journal") return <svg {...common}><path d="M6 4.5h13.5a2 2 0 0 1 2 2v17H8a2 2 0 0 1-2-2v-17Z" /><path d="M6 21.5a2 2 0 0 1 2-2h13.5M10 9h7M10 12.5h5" /><path d="M23.5 3.5 17 10" /></svg>;
  return <svg {...common}><circle cx="14" cy="14" r="9.5" /><path d="M14 7.5 15.6 12.4 20.5 14l-4.9 1.6L14 20.5l-1.6-4.9L7.5 14l4.9-1.6Z" /></svg>;
}

type Soundscape = "forest" | "cafe" | "meditation";

const soundscapes: Record<Soundscape, { icon: string; label: string; en: string; videoId: string }> = {
  forest: { icon: "♧", label: "森林鋼琴", en: "PIANO · FOREST WHITE NOISE", videoId: "_u95mLIAxvg" },
  cafe: { icon: "♫", label: "咖啡爵士", en: "SOFT JAZZ · BOSSA NOVA", videoId: "Uxz1ts_dRrQ" },
  meditation: { icon: "◇", label: "冥想淨化", en: "HEALING FREQUENCY · MEDITATION", videoId: "kqo9Z5Br63c" },
};

const archetypeQuestionSets = [
  [
    { q: "最近的你，更接近哪一種狀態？", a: ["想安靜整理自己", "想突破停滯往前走", "想被理解與好好照顧"] },
    { q: "面對不確定時，你最常怎麼做？", a: ["先觀察，不急著表態", "逼自己趕快做決定", "反覆確認別人的心意"] },
    { q: "此刻你最需要找回的是？", a: ["內在的答案", "行動的力量", "接住自己的溫柔"] },
  ],
  [
    { q: "當心裡有很多聲音時，你最想先做什麼？", a: ["暫時離開喧鬧，聽聽自己", "抓住一個方向開始行動", "找一個安心的人說說心情"] },
    { q: "最近哪一種感受最貼近你？", a: ["有些答案還在慢慢沉澱", "知道自己不能再停在原地", "總在照顧別人，卻忘了自己"] },
    { q: "如果今天能收到一份力量，你最想要的是？", a: ["清楚的內在直覺", "做出選擇的勇氣", "被溫柔接住的感覺"] },
  ],
  [
    { q: "面對一段反覆拉扯，你的第一個反應是？", a: ["退一步觀察真正發生的事", "想立刻打破僵局往前走", "想確認自己是不是被重視"] },
    { q: "最近你最常對自己說哪一句話？", a: ["我需要再聽聽自己的心", "我不能一直停在這裡", "我也值得被好好對待"] },
    { q: "哪一個畫面最像此刻的你？", a: ["獨自坐在安靜的月光下", "握緊方向盤準備出發", "在柔軟的花園裡慢慢休息"] },
  ],
  [
    { q: "當事情沒有照預期發展時，你通常會？", a: ["先整理線索，等待感受清楚", "調整策略，重新推進一次", "先照顧自己的失望與疲憊"] },
    { q: "最近最消耗你的是什麼？", a: ["太多外界意見蓋過自己的聲音", "想前進，卻還沒有明確方向", "一直付出，卻沒有得到回應"] },
    { q: "你希望接下來的自己更靠近哪種狀態？", a: ["相信自己的內在判斷", "有力量做出真正的選擇", "穩定地照顧自己的需要"] },
  ],
  [
    { q: "在關係裡，你現在最想釐清的是？", a: ["我心裡真正相信的是什麼", "我是否願意採取新的行動", "我的需要有沒有被好好看見"] },
    { q: "當對方的回應不如預期，你更容易？", a: ["沉默下來觀察彼此的變化", "想趕快做些什麼扭轉現況", "懷疑自己是不是不夠重要"] },
    { q: "此刻的關係最需要補回哪一種能量？", a: ["誠實與清楚", "方向與決心", "溫柔與安全感"] },
  ],
  [
    { q: "如果今天可以替自己留一點空間，你會？", a: ["安靜獨處，讓答案浮現", "完成一件一直拖延的事", "好好吃飯休息，不再勉強"] },
    { q: "最近你最想鬆開哪一種壓力？", a: ["一定要立刻想清楚的壓力", "害怕做錯而不敢前進的壓力", "必須一直照顧別人的壓力"] },
    { q: "今天的你，最值得被提醒的是？", a: ["你其實知道自己在意什麼", "方向可以邊走邊調整", "你的感受也需要被放在心上"] },
  ],
];

const ARCHETYPE_LOGIN_SET_KEY = "zolacoco-archetype-login-set";
const ARCHETYPE_LAST_SET_KEY = "zolacoco-archetype-last-set";
const JOURNAL_STORAGE_KEY = "zolacoco-journal-notes-v1";
const TAROT_STORAGE_KEY = "zolacoco-tarot-records-v1";

const archetypeResults = [
  { name: "女祭司", en: "THE HIGH PRIESTESS", text: "你不是沒有答案，而是外界的聲音暫時蓋過了自己的感受。此刻適合慢一點，留意那些還說不清楚、但心裡其實已經知道的事。" },
  { name: "戰車", en: "THE CHARIOT", text: "你正在找回前進的主導權。真正的力量不是催促自己，而是先確認方向，再把分散的心力帶回同一條路上。" },
  { name: "皇后", en: "THE EMPRESS", text: "你現在需要的可能不是再努力一點，而是先承認自己的需求。當你願意照顧內在，選擇才不會只建立在害怕失去之上。" },
];

const journalPrompts = ["我現在真正的情緒是什麼？", "我正在逃避或延後面對什麼？", "我內在最需要哪一種支持？", "我在人際關係中反覆出現什麼習慣？", "金錢與安全感對我代表什麼？", "如果不必迎合任何人，我想成為怎樣的人？", "這一週，我最想帶走的核心提醒是什麼？"];

type IntuitionOption = { text: string; correct: boolean; note: string };

function PracticeCard({ card, hidden = false, flipped = true }: { card: TarotCard; hidden?: boolean; flipped?: boolean }) {
  return <div className={`practice-tarot-card ${flipped ? "is-flipped" : ""}`} aria-label={hidden ? "尚未翻開的塔羅練習牌" : `${card.name}塔羅牌`}>
    <div className="practice-tarot-inner">
      <TarotCardBack className="practice-tarot-back" />
      <TarotCardFace card={card} className="practice-tarot-front" />
    </div>
  </div>;
}

function intuitionOptionsFor(card: TarotCard, cardIndex: number): IntuitionOption[] {
  const options: IntuitionOption[] = [
    { text: card.scene, correct: true, note: "這句話只描述牌面上確實看得到的角色、物件與場景，是建立解讀最穩定的第一步。" },
    { text: `抽到${card.name}，代表事情最後一定會照我期待的方向發展。`, correct: false, note: "這是「把期待當預測」的陷阱。牌面可以提供方向，卻不能跳過現況與當事人的實際選擇。" },
    { text: `這張牌已經證明對方心裡就是這樣想，只是還沒有說出口。`, correct: false, note: "這是「替別人斷言內心」的陷阱。沒有問題背景與行動證據，不能只靠一張牌替對方下結論。" },
    { text: `只要出現${card.name}，未來就注定無法改變。`, correct: false, note: "這是「命運定論」的陷阱。塔羅映照的是當下狀態與可能方向，不會抹去人的選擇與調整空間。" },
  ];
  const offset = cardIndex % options.length;
  return [...options.slice(offset), ...options.slice(0, offset)];
}

const archetypeCardIds = ["major-02", "major-07", "major-03"];
const journalCardIds = ["cups-13", "swords-08", "major-08", "cups-06", "pentacles-04", "major-17", "major-21"];

const positionLens: Record<string,string[]> = {
  healing:["這是妳現在值得溫柔看見的訊息。"],
  timeline:["這個模式可能來自過去，也仍在輕輕影響妳現在的判斷。","這是現況中值得先照顧的核心，看見它之後，事情才有機會慢慢鬆動。","這不是固定的預言，而是此刻可以陪妳往前走的方向。"],
  relationship:["這張牌映照出妳帶進關係裡的需要與反應。","牌面呈現的是對方目前可觀察到的狀態，我們不替對方斷言還沒說出口的心意。","這是雙方可以一起看見的關係課題，理解之後，才有機會走出原本的循環。"],
};

function shuffledDeck() {
  const deck = [...tarotCards];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// Desktop fans every card on one arc (--offset). Phones split the deck into two rows
// (--m-row / --m-offset) so every card stays on screen with a 44px tap strip.
// Spread-in order (spec v3 §1.3): the centre card first, then alternating left and right,
// 55ms apart, so the fan opens from the middle instead of queueing left to right.
function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// The three-card time-flow message opens with the topic she chose (reading check, 2026-11-13).
const TOPIC_OPENING: Record<string, string> = {
  感情: "在這段感情裡",
  工作: "在工作上",
  人際: "在人際互動裡",
  金錢: "在金錢與資源上",
  創業: "在創業這條路上",
  今日指引: "今天",
};

function synthesis(cards: TarotCard[], spreadId: string, topic: string, positions: string[]) {
  if (cards.length < 3) return cards[0]?.truth ?? "";
  const [first, second, third] = cards;
  const firstKey = first.keywords.split("・")[0];
  const secondKey = second.keywords.split("・")[0];
  const thirdKey = third.keywords.split("・")[0];
  if (spreadId === "relationship" && (topic === "感情" || topic === "人際")) return `妳這邊帶著「${firstKey}」，對方目前呈現「${secondKey}」，而這段關係值得一起看見的課題是「${thirdKey}」。關係可以是起點，真正的靠近仍需要雙方都願意理解與調整。`;
  // Other topics have no "對方": name the positions instead of implying another person (spec v2, #12).
  if (spreadId === "relationship") return `「${positions[0]}」落在「${firstKey}」，「${positions[1]}」呈現「${secondKey}」，而「${positions[2]}」是「${thirdKey}」。先看清這三者之間的關係，再決定下一步要從哪裡開始。`;
  return `${TOPIC_OPENING[topic] ?? "此刻"}，過去的「${firstKey}」可能仍在影響妳；現在最需要看見的是「${secondKey}」。接下來不必急著得到所有答案，「${third.name}」提醒妳留意「${thirdKey}」，先踏出一小步就好。`;
}

export default function Home() {
  const [topic, setTopic] = useState("今日指引");
  const [selected, setSelected] = useState<TarotCard[]>([]);
  const [spreadId, setSpreadId] = useState<SpreadId>(recommendedSpread("今日指引"));
  const [spreadChosen, setSpreadChosen] = useState(false);
  const [question, setQuestion] = useState("");
  const [soundOpen, setSoundOpen] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const [memberBanner, setMemberBanner] = useState<{ active: boolean; expires: string | null } | null>(null);
  const [consultCopy, setConsultCopy] = useState<"idle" | "copying" | "done" | "failed">("idle");
  const [revealed, setRevealed] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [seed, setSeed] = useState(0);
  const [spreadCards, setSpreadCards] = useState<TarotCard[]>([]);
  const [fanReady, setFanReady] = useState(false);
  // Reading v4: the written readings (about 60,000 characters) load only once she starts a draw.
  const [readings, setReadings] = useState<ReadonlyMap<string, CardReading> | null>(null);
  const readingsLoading = useRef(false);
  function loadReadings() {
    if (readings || readingsLoading.current) return;
    readingsLoading.current = true;
    import("./tarot-readings")
      .then((module) => setReadings(module.readingsById))
      .catch(() => { readingsLoading.current = false; });
  }
  // Draw-flow timeouts are tracked so starting over cancels them (spec v3 §1.6): an old
  // shuffle or pick can never update a newer reading.
  const drawTimers = useRef<number[]>([]);
  function later(run: () => void, ms: number) {
    const id = window.setTimeout(() => {
      drawTimers.current = drawTimers.current.filter((timer) => timer !== id);
      run();
    }, ms);
    drawTimers.current.push(id);
  }
  const [exploreTool, setExploreTool] = useState("archetype");
  const [archetypeStep, setArchetypeStep] = useState(0);
  const [archetypeScores, setArchetypeScores] = useState([0, 0, 0]);
  const [archetypeResult, setArchetypeResult] = useState<number | null>(null);
  const [archetypeSetIndex, setArchetypeSetIndex] = useState(0);
  const [intuitionStage, setIntuitionStage] = useState(0);
  const [intuitionCardIndex, setIntuitionCardIndex] = useState(9);
  const [intuitionChoice, setIntuitionChoice] = useState("");
  const [intuitionFeedback, setIntuitionFeedback] = useState<IntuitionOption | null>(null);
  const [journalDay, setJournalDay] = useState(0);
  const [journalNotes, setJournalNotes] = useState<Record<number, string>>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [tarotSaveState, setTarotSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundscape, setSoundscape] = useState<Soundscape>("forest");
  const audioFrames = useRef<Partial<Record<Soundscape, HTMLIFrameElement | null>>>({});
  // YouTube players are created only after a member picks a soundscape (Issue #9 P7),
  // so opening the page no longer loads three video players on a phone.
  const [mountedSoundscapes, setMountedSoundscapes] = useState<Soundscape[]>([]);
  const pendingSoundscape = useRef<Soundscape | null>(null);
  const loadedSoundscapes = useRef(new Set<Soundscape>());

  const positions = [-12, -6, 0, 6, 12];
  // Same spread ids for every topic; the relationship spread names its positions per topic.
  const activeSpread = spreadForTopic(spreadId, topic);
  const synthesisReadings = selected.map((card) => ({ name: card.name, reading: readings?.get(card.id) }));
  const synthesisCards = synthesisReadings.every((item) => item.reading)
    ? synthesisReadings.map((item) => ({ name: item.name, reading: item.reading as CardReading }))
    : null;
  const offeredSpreads = spreadsForTopic(topic).map((item) => spreadForTopic(item.id, topic));
  const recommendedId = recommendedSpread(topic);
  const intuitionCard = tarotCards[intuitionCardIndex] ?? tarotCards[0];
  const intuitionOptions = intuitionOptionsFor(intuitionCard, intuitionCardIndex);
  const archetypeQuestions = archetypeQuestionSets[archetypeSetIndex] ?? archetypeQuestionSets[0];
  const archetypeCard = archetypeResult === null ? null : tarotCards.find((card) => card.id === archetypeCardIds[archetypeResult]);
  const journalCard = tarotCards.find((card) => card.id === journalCardIds[journalDay]) ?? tarotCards[journalDay];

  function sendPlayerCommand(target: Soundscape, func: string, args: unknown[] = []) {
    audioFrames.current[target]?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  }

  function stopAllSoundscapes() {
    (Object.keys(soundscapes) as Soundscape[]).forEach((item) => {
      sendPlayerCommand(item, "pauseVideo");
      sendPlayerCommand(item, "mute");
    });
  }

  function startSoundscape(nextSoundscape: Soundscape) {
    stopAllSoundscapes();
    setSoundscape(nextSoundscape);
    setSoundEnabled(true);
    pendingSoundscape.current = nextSoundscape;
    setSoundBlocked(false);
    if (!mountedSoundscapes.includes(nextSoundscape)) {
      // If the player has not loaded after a while (blocked network, content blocker), say so.
      window.setTimeout(() => {
        if (pendingSoundscape.current === nextSoundscape && !loadedSoundscapes.current.has(nextSoundscape)) setSoundBlocked(true);
      }, 8000);
      // The new iframe starts itself (autoplay=1) and onLoad repeats the play command.
      // Only one player exists at a time; the previous one unmounts and is forgotten.
      loadedSoundscapes.current.clear();
      setMountedSoundscapes([nextSoundscape]);
      return;
    }
    const play = () => {
      sendPlayerCommand(nextSoundscape, "unMute");
      sendPlayerCommand(nextSoundscape, "setVolume", [65]);
      sendPlayerCommand(nextSoundscape, "playVideo");
    };
    play();
    window.setTimeout(play, 280);
    window.setTimeout(play, 820);
  }

  function toggleSoundscape(nextSoundscape: Soundscape) {
    if (soundEnabled && soundscape === nextSoundscape) {
      pendingSoundscape.current = null;
      stopAllSoundscapes();
      setSoundEnabled(false);
      return;
    }
    startSoundscape(nextSoundscape);
  }

  // Hero status for signed-in members (Issue #9 B4). Records still live on this device only.
  useEffect(() => {
    let active = true;
    void loadMemberProfile().then((result) => {
      if (!active || !result.ok) return;
      const member = result.member;
      const expires = member.role === "admin" ? null : member.access_expires_at;
      const valid = member.role === "admin" || (member.effective_status === "active" && Boolean(expires) && new Date(String(expires)).getTime() > Date.now());
      setMemberBanner({ active: valid, expires: valid ? memberExpiryLabel(expires) : null });
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const requestedTool = new URLSearchParams(window.location.search).get("tool");
    if (requestedTool === "archetype" || requestedTool === "intuition" || requestedTool === "journal") setExploreTool(requestedTool);
    try {
      const savedNotes = JSON.parse(localStorage.getItem(JOURNAL_STORAGE_KEY) ?? "{}") as Record<number, string>;
      setJournalNotes(savedNotes);
      const previousSet = Number(localStorage.getItem(ARCHETYPE_LAST_SET_KEY));
      const availableSets = archetypeQuestionSets.map((_, index) => index).filter((index) => index !== previousSet);
      const nextSet = availableSets[Math.floor(Math.random() * availableSets.length)] ?? 0;
      setArchetypeSetIndex(nextSet);
      localStorage.setItem(ARCHETYPE_LAST_SET_KEY, String(nextSet));
      localStorage.setItem(ARCHETYPE_LOGIN_SET_KEY, JSON.stringify({ index: nextSet }));
    } catch {
      setArchetypeSetIndex(Math.floor(Math.random() * archetypeQuestionSets.length));
    }
  }, []);

  function saveJournal() {
    const content = (journalNotes[journalDay] ?? "").trim();
    if (!content) return;
    setSaveState("saving");
    try {
      const next = { ...journalNotes, [journalDay]: content };
      localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(next));
      setJournalNotes(next);
      setSaveState("saved");
    } catch { setSaveState("error"); }
  }

  // Every way of starting over goes through here, so a new reading never inherits the
  // previous one's 已儲存 / 已複製 state (PR #10 review).
  function clearReading() {
    drawTimers.current.forEach((timer) => window.clearTimeout(timer));
    drawTimers.current = [];
    setFanReady(false);
    setShuffling(false);
    setSelected([]);
    setRevealed(false);
    setSpreadCards([]);
    setTarotSaveState("idle");
    setConsultCopy("idle");
  }

  // Draw v4 (ChatGPT spec, 2026-11-13): the deck is cut and merged (840ms), then the fan opens
  // from the middle outwards and only then accepts a pick. Reduced motion: no waiting.
  function shuffleDeck() {
    if (shuffling) return;
    clearReading();
    loadReadings();
    const still = prefersReducedMotion();
    setShuffling(true);
    setSeed((s) => s + 1);
    later(() => {
      setSpreadCards(shuffledDeck().slice(0, 13));
      setShuffling(false);
      later(() => setFanReady(true), still ? 0 : MOTION.openMs + MOTION.openStaggerMs * 6);
    }, still ? 80 : MOTION.shuffleMs + 60);
  }

  // The fan has already flown the card into its slot. The last one rests there for a moment
  // before the spread turns over.
  function commitPick(card: TarotCard) {
    if (!fanReady || selected.length >= activeSpread.positions.length) return;
    const next = [...selected, card];
    const still = prefersReducedMotion();
    const place = () => {
      setSelected(next);
      setSpreadCards((current) => current.filter((item) => item.id !== card.id));
    };
    if (next.length < activeSpread.positions.length) { place(); return; }
    later(() => {
      place();
      later(() => setRevealed(true), still ? 0 : 280);
    }, still ? 0 : MOTION.lastPickPauseMs);
  }

  function reset() {
    clearReading();
    document.getElementById("draw")?.scrollIntoView({ behavior: "smooth" });
  }

  function saveTarotReading() {
    if (!selected.length || tarotSaveState === "saved") return;
    try {
      const records = JSON.parse(localStorage.getItem(TAROT_STORAGE_KEY) ?? "[]") as unknown[];
      records.unshift(tarotRecord({
        question, topic, spread: activeSpread.name, spreadId,
        cards: selected.map((card, index) => ({ id: card.id, name: card.name, position: activeSpread.positions[index], keywords: card.keywords, truth: card.truth, action: card.action })),
      }, Date.now()));
      localStorage.setItem(TAROT_STORAGE_KEY, JSON.stringify(records.slice(0, 60)));
      setTarotSaveState("saved");
    } catch { setTarotSaveState("error"); }
  }

  const consultText = consultMessage({
    topic, spreadName: activeSpread.name, question,
    cards: selected.map((card, index) => ({ id: card.id, name: card.name, position: activeSpread.positions[index] })),
  });

  async function copyConsult() {
    setConsultCopy("copying");
    try {
      await navigator.clipboard.writeText(consultText);
      setConsultCopy("done");
    } catch {
      setConsultCopy("failed");
    }
  }

  function changeTopic(item: string) {
    setTopic(item); clearReading();
    setSpreadId((current) => spreadAfterTopicChange(item, current, spreadChosen));
  }

  function changeSpread(item: SpreadId) {
    setSpreadId(item); setSpreadChosen(true); clearReading();
  }

  function answerArchetype(answer: number) {
    const scores = archetypeScores.map((score, index) => score + (index === answer ? 1 : 0));
    setArchetypeScores(scores);
    if (archetypeStep === archetypeQuestions.length - 1) setArchetypeResult(scores.indexOf(Math.max(...scores)));
    else setArchetypeStep((step) => step + 1);
  }

  function resetArchetype() {
    setArchetypeStep(0); setArchetypeScores([0, 0, 0]); setArchetypeResult(null);
  }

  function drawIntuitionCard(nextStage = 1) {
    let nextIndex = Math.floor(Math.random() * tarotCards.length);
    if (tarotCards.length > 1 && nextIndex === intuitionCardIndex) nextIndex = (nextIndex + 1) % tarotCards.length;
    setIntuitionCardIndex(nextIndex);
    setIntuitionChoice("");
    setIntuitionFeedback(null);
    setIntuitionStage(nextStage);
  }

  return (
    <main className="home-pearl pearl-page">

      <section className="hero" id="top">
        <span className="pearl-corners" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow">A MESSAGE FOR YOUR PRESENT MOMENT</p>
          <h1><span>把問題放在心裡</span><em>抽一張屬於你的牌</em></h1>
          <p className="intro">答案不替你決定人生，而是陪你看清此刻真正需要留意的方向。</p>
          <div className="visitor-status member-status" role="status">
            <span aria-hidden="true" />
            <p>
              {memberBanner?.active ? <b>✨ 會員探索模式已開啟</b> : null}
              {memberBanner?.active && memberBanner.expires ? <small className="member-status-expiry">會員使用期限：{memberBanner.expires}</small> : null}
              <small>妳的抽牌紀錄目前保存在這台裝置，建議定期備份。</small>
            </p>
            <a href="/admin">我的占卜紀錄 →</a>
          </div>
          <div className="hero-actions">
            <a className="primary" href="#draw">開始免費抽牌 <span aria-hidden="true">↓</span></a>
            <a className="hero-secondary" href="#consult">預約一對一諮詢</a>
          </div>
          <p className="ritual">深呼吸三次，想著一個你最近最在意的問題</p>
        </div>
        <div className="hero-portrait" aria-label="Zolacoco Tarot 主理人形象照">
          <img src="/zolacoco-hero-v2.png" alt="Zolacoco Tarot 主理人 Zola" />
          <div className="portrait-caption">
            <span>THE READER</span>
            <strong>Zola</strong>
            <small>塔羅占卜師・關係與人生選擇的解讀者</small>
            <p>累積五年以上身心靈學習與個案陪伴經驗，擅長從感情關係、工作選擇與人生卡點中，整理出真正需要被看見的核心。比起替你決定答案，我更希望陪你釐清盲點，找到能落地的下一步。</p>
          </div>
        </div>
      </section>

      <section className="draw-section" id="draw">
        <div className="section-heading">
          <span>01</span><p>CHOOSE YOUR FOCUS</p>
          <h2>今天，妳想問什麼？</h2>
          <small className="deck-note">完整 78 張萊恩貓咪塔羅・蝦蝦驚喜客串</small>
        </div>
        <div className={`tarot-soundscape ${soundOpen ? "is-open" : "is-collapsed"}`} aria-label="塔羅抽牌背景音樂">
          <button type="button" className="tarot-soundscape-toggle" aria-expanded={soundOpen} aria-controls="tarot-soundscape-options" onClick={() => setSoundOpen((open) => !open)}>
            <span aria-hidden="true">♫</span>
            <b>背景音景</b>
            <small>{soundEnabled ? `播放中・${soundscapes[soundscape].label}` : "關閉"}</small>
            <i aria-hidden="true">{soundOpen ? "收起" : "選擇"}</i>
          </button>
          <div className="tarot-soundscape-options" id="tarot-soundscape-options" hidden={!soundOpen}>
            {(Object.keys(soundscapes) as Soundscape[]).map((item) => {
              const content = soundscapes[item];
              const active = soundEnabled && soundscape === item;
              return <button type="button" key={item} className={active ? "active" : ""} onClick={() => toggleSoundscape(item)} aria-pressed={active}>
                <i aria-hidden="true">{content.icon}</i><span><b>{active ? "停止播放" : content.label}</b><small>{content.en}</small></span><strong aria-hidden="true">{active ? "Ⅱ" : "▶"}</strong>
              </button>;
            })}
          </div>
          <p className="tarot-music-status" aria-live="polite" hidden={!soundOpen && !soundBlocked}>{soundBlocked ? "目前無法播放音景，妳仍可以繼續抽牌。" : soundEnabled ? `正在播放「${soundscapes[soundscape].label}」，抽牌時會持續播放；再點一次即可停止。` : "點選後才會載入並播放；也可以不播放，直接開始抽牌。"}</p>
          <div className="tarot-audio-only-player" aria-hidden="true">
            {mountedSoundscapes.map((item) => <iframe key={item} ref={(node) => {
              audioFrames.current[item] = node;
              // An unmounted player is gone: forget that it had loaded (A → B → A, PR #10 review).
              if (!node) loadedSoundscapes.current.delete(item);
            }} src={`https://www.youtube-nocookie.com/embed/${soundscapes[item].videoId}?enablejsapi=1&autoplay=1&playsinline=1&loop=1&playlist=${soundscapes[item].videoId}&controls=0&rel=0`} title={`${soundscapes[item].label}背景音樂`} allow="autoplay; encrypted-media" referrerPolicy="strict-origin-when-cross-origin" tabIndex={-1}
              onLoad={() => {
                loadedSoundscapes.current.add(item);
                setSoundBlocked(false);
                if (pendingSoundscape.current !== item) return;
                const play = () => {
                  sendPlayerCommand(item, "unMute");
                  sendPlayerCommand(item, "setVolume", [65]);
                  sendPlayerCommand(item, "playVideo");
                };
                play();
                window.setTimeout(play, 600);
                window.setTimeout(play, 1500);
              }} />)}
          </div>
        </div>
        <div className="topics" role="group" aria-label="選擇抽牌主題">
          {TAROT_TOPICS.map((item) => <button key={item} type="button" className={topic === item ? "active" : ""} aria-pressed={topic === item} onClick={() => changeTopic(item)}>{item}</button>)}
        </div>

        <div className="spread-options" role="group" aria-label="選擇塔羅牌陣">
          {offeredSpreads.map((item) => <button key={item.id} type="button" className={spreadId === item.id ? "active" : ""} aria-pressed={spreadId === item.id} onClick={() => changeSpread(item.id)}>
            <span className={`spread-motif motif-${item.id}`} aria-hidden="true">{item.positions.map((_, cardIndex) => <b key={cardIndex} />)}</span>
            <span className="spread-name">{item.name}{item.id === recommendedId ? <em className="spread-recommended">推薦</em> : null}</span>
            <small>{item.sub}</small>
          </button>)}
        </div>

        <label className="tarot-question">
          <span>寫下妳想問的問題（選填）</span>
          <textarea value={question} maxLength={QUESTION_LIMIT} rows={2} placeholder="例如：這段關係接下來會如何發展？"
            onChange={(event) => setQuestion(event.target.value.slice(0, QUESTION_LIMIT))} />
          <small aria-live="polite">{[...question].length} / {QUESTION_LIMIT}</small>
        </label>

        {selected.length < activeSpread.positions.length ? (
          <div className={`deck-stage ${shuffling ? "shuffling" : ""}`}>
            {spreadCards.length === 0 ? <>
              <div className="card-fan" aria-hidden="true">
                {positions.map((p, i) => <TarotCardBack key={`${seed}-${i}`} className="card-back" style={{ transform: `translateX(${p * 2}px) rotate(${p}deg)` }} />)}
              </div>
              <button className="draw-button" onClick={shuffleDeck} disabled={shuffling}>{shuffling ? "正在洗牌…" : "先洗牌，讓心慢下來"}</button>
              <p>深呼吸三次，把注意力輕輕帶回自己</p>
            </> : <>
              <div className="choose-heading"><span>02 · FOLLOW YOUR INTUITION</span><h3>牌已展開，請親手選牌</h3><p>{activeSpread.positions.length === 1 ? "不用分析哪張比較好，第一眼停留的地方，就是此刻的訊息。" : `請依直覺選出第 ${selected.length + 1} 張｜${activeSpread.positions[selected.length]}`}</p></div>
              <DrawFan key={seed} cards={spreadCards} positions={activeSpread.positions} pickedCount={selected.length} ready={fanReady} deal={seed} onPick={commitPick} />
              <button className="reshuffle" onClick={shuffleDeck}>重新洗牌</button>
            </>}
          </div>
        ) : (
          <div className="result" aria-live="polite">
            <article className="reading">
              <div className="result-intro">
                <p className="reading-label">「{topic}」・{activeSpread.name}</p>
                <h2>妳的塔羅指引</h2>
                {cleanQuestion(question) ? <p className="reading-question"><b>妳這次的提問：</b>{cleanQuestion(question)}</p> : null}
                {selected.length > 1 && synthesisCards ? <div className="synthesis core-message synthesis-v4">
                  <span>三張牌的整體解讀</span>
                  <p className="synthesis-opening">{synthesisOpening(topic, spreadId)}</p>
                  <ol className="synthesis-parts">{synthesisParts(synthesisCards, spreadId, topic, activeSpread.positions).map((part, i) => <li key={`${part.card}-${i}`}>
                    <b>{String(i + 1).padStart(2, "0")}・{part.label}｜{part.card}</b><p>{part.text}</p>
                  </li>)}</ol>
                </div> : selected.length > 0 ? <div className="synthesis core-message"><span>{selected.length > 1 ? "整體訊息" : "此刻的核心提醒"}</span><p>{synthesis(selected, spreadId, topic, activeSpread.positions)}</p></div> : null}
              </div>
              <div className={`spread-board spread-board--${spreadId}`} role="list" aria-label={`${activeSpread.name}的牌卡位置`}>
                {selected.map((card, i) => <figure className={`spread-slot spread-slot--${i + 1}`} role="listitem" key={`${card.id}-slot`} style={{ "--slot": i } as React.CSSProperties}>
                  <figcaption className="spread-slot__position"><b>{String(i + 1).padStart(2, "0")}</b>{activeSpread.positions[i]}</figcaption>
                  <div className={`tarot-card suit-${card.suit} ${revealed ? "revealed" : ""}`}><div className="tarot-inner"><TarotCardBack className="tarot-back" /><TarotCardFace card={card} className="tarot-front" /></div></div>
                </figure>)}
              </div>
              {/* Reading v4 (ChatGPT spec, 2026-11-13): each card's written reading for the topic stays
                  open; one card also shows its energy, blind spot and first step; the scene and the
                  position notes fold away. Until the readings load, the v3 lines stand in. */}
              <div className={`reading-sequence count-${selected.length}`}>
                {selected.map((card, i) => {
                  const reading = readings?.get(card.id);
                  const single = selected.length === 1;
                  const blind = <div className="reading-point blind"><b>需要留意</b><p>{card.blindSpot}</p></div>;
                  const energy = reading ? <div className="reading-point energy"><b>這張牌給妳的力量</b><p>{reading.energy}</p></div> : null;
                  return <section className="card-reading-unit" key={`${card.id}-reading`} aria-labelledby={`reading-${card.id}`} style={{ "--slot": i } as React.CSSProperties}>
                    <header className="reading-unit-head">
                      <span>{String(i + 1).padStart(2, "0")}・{activeSpread.positions[i]}</span>
                      <h3 id={`reading-${card.id}`}>{card.name}</h3>
                      <p>{card.keywords}</p>
                    </header>
                    <div className="position-reading">
                      {reading ? (speaksForOthers(spreadId, i)
                        ? <div className="reading-point lead"><b>這張牌呈現的狀態</b><p>{othersLine(reading, topic)}</p></div>
                        : <div className="reading-point lead"><b>放在「{topic}」裡看</b><p>{topicReading(reading, topic)}</p></div>)
                        : !single ? <div className="reading-point"><b>這張牌的重點</b><p>{card.truth}</p></div> : null}
                      {single ? energy : null}
                      {single ? blind : null}
                      {single ? <div className="reading-point next"><b>妳可以先這樣做</b><p>{card.action}</p></div> : null}
                      <details className="reading-more">
                        <summary>{single ? "查看牌面與位置解析" : reading ? "查看能量提醒與完整牌義" : "查看這張牌的完整解析"}</summary>
                        <div className="reading-more__body">
                          {!single ? energy : null}
                          {!single && reading ? <div className="reading-point"><b>這張牌的重點</b><p>{card.truth}</p></div> : null}
                          {!single ? blind : null}
                          <div className="reading-point"><b>這張牌畫了什麼</b><p>{card.scene}</p></div>
                          <div className="reading-point"><b>和「{topic}」的關聯</b><p>{topicLens[topic][card.suit]}</p></div>
                          <div className="reading-point"><b>這個位置怎麼理解</b><p>{spreadId === "relationship" ? relationshipLens(topic, i) : positionLens[spreadId][i]}</p></div>
                        </div>
                      </details>
                    </div>
                  </section>;
                })}
              </div>
              {selected.length > 1 ? <section className="reading-actions-list" aria-labelledby="reading-actions-title">
                <h3 id="reading-actions-title">接下來可以怎麼做</h3>
                <ol>{selected.map((card, i) => <li key={`${card.id}-action`}><b>{String(i + 1).padStart(2, "0")}・{activeSpread.positions[i]}｜{card.name}</b><p>{card.action}</p></li>)}</ol>
              </section> : null}
              <section className="tarot-consult" aria-labelledby="tarot-consult-title">
                <h3 id="tarot-consult-title">想把這次的牌看得更完整？</h3>
                <p>帶著這次的問題與牌卡，預約更完整的一對一解讀。</p>
                <ol className="tarot-consult-steps">
                  <li>
                    <button type="button" className={`flow-button ${consultCopy === "done" ? "secondary-flow" : "primary-flow"}`} disabled={consultCopy === "copying"} onClick={() => void copyConsult()}>
                      {consultCopy === "copying" ? "正在複製…" : consultCopy === "done" ? "已複製抽牌內容 ✓" : "讓 Zola 幫我深入解讀 ✨"}
                    </button>
                  </li>
                  {consultCopy === "done" || consultCopy === "failed" ? <li>
                    <a className="flow-button primary-flow" href={lineMessageUrl(consultText)} target="_blank" rel="noreferrer">開啟 Zola 的官方 LINE</a>
                  </li> : null}
                </ol>
                <p className="tarot-consult-note" aria-live="polite">{consultCopy === "failed"
                  ? "這個瀏覽器無法自動複製，請展開下方內容手動選取，再開啟 LINE 貼上。"
                  : consultCopy === "done"
                    ? <>抽牌內容已複製。接著開啟 LINE，若訊息沒有自動帶入，貼上後送出即可。電腦沒有 LINE 時，也可以到 <a href={ZOLA_LINE_URL} target="_blank" rel="noreferrer">官方 LINE</a> 貼上。</>
                    : "第一步會複製這次的抽牌內容，第二步開啟 Zola 的官方 LINE；內容會提供給 LINE 中的諮詢對象 Zola。"}</p>
                <details className="tarot-consult-preview" open={consultCopy === "failed" || undefined}><summary>查看抽牌內容</summary><pre>{consultText}</pre></details>
              </section>
              <div className="reading-actions">
                <button className="flow-button secondary-flow" onClick={reset}>重新抽牌</button>
                <button className="flow-button secondary-flow" onClick={saveTarotReading} disabled={tarotSaveState === "saved"}>{tarotSaveState === "saved" ? "已儲存" : tarotSaveState === "error" ? "存檔失敗，請再試一次" : "儲存這次抽牌"}</button>
                <a className="flow-button primary-flow" href="#explore">下一步・認識自己的解牌直覺 <b>→</b></a>
              </div>
              {tarotSaveState === "saved" ? <p className="tarot-saved-note" role="status">這次的塔羅指引已保存 ✨ <a href="/admin">查看我的占卜紀錄 →</a></p> : null}
            </article>
          </div>
        )}
      </section>

      <section className="cat-story" id="cat-story">
        <span className="pearl-corners" aria-hidden="true" />
        <div className="cat-story-heading">
          <p className="eyebrow">THE HEARTS BEHIND THE DECK</p>
          <h2>抽完牌，<span className="keep-line">再認識陪你讀牌的牠們</span></h2>
          <p>這套 78 張貓咪塔羅，以萊恩與蝦蝦為原型。牠們有不同的個性，也把不同的情緒與生命經驗帶進每一張牌裡。</p>
        </div>
        <div className="cat-profiles">
          <article className="cat-profile ryan-profile">
            <div className="cat-photo portrait-cat-photo"><img src="/ryan-portrait.jpeg" alt="萊恩正面藍眼布偶貓形象照" /></div>
            <div><span>RYAN · 萊恩</span><h3>有點傲氣，也有自己的溫柔</h3><p>萊恩是領養回家的布偶公貓。牠看起來從容、偶爾有點小傲氣，卻會用自己的方式默默陪伴。在牌組裡，牠常代表探索、勇氣、界線，以及慢慢相信自己的力量。</p></div>
          </article>
          <article className="cat-profile shrimp-profile">
            <div className="cat-photo portrait-cat-photo"><img src="/shrimp-portrait.jpeg" alt="蝦蝦正面橘貓形象照" /></div>
            <div><span>SHRIMP · 蝦蝦</span><h3>膽小敏感，卻一直努力相信愛</h3><p>蝦蝦也是領養回家的貓咪。牠年紀比較大、個性敏感膽小，需要更多耐心與安全感。在牌組裡，牠陪我們看見脆弱、依戀、療癒，以及被好好接住之後重新安心的可能。</p></div>
          </article>
        </div>
        <p className="cat-story-note">牠們不是裝飾，而是整副牌的靈魂：有時由萊恩帶你向前，有時由蝦蝦陪你停下來照顧自己。</p>
      </section>

      <section className="explore" id="explore">
        <span className="pearl-corners" aria-hidden="true" />
        <div className="explore-heading">
          <p className="eyebrow">TAROT AS A MIRROR</p>
          <h2>用塔羅，<span className="keep-line">更靠近內在的自己</span></h2>
          <p>塔羅不只是預測結果，也是一種整理感受、理解模式的語言。你不需要會背牌義，先從此刻最有感覺的練習開始。</p>
        </div>

        <div className="explore-layout ex-layout">
          <p className="ex-group-label">在這裡就能練習</p>
          <div className="ex-tabs" role="tablist" aria-label="選擇內在探索練習" onKeyDown={(event) => {
            const index = practiceTools.findIndex((tool) => tool.id === exploreTool);
            const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
            if (!step) return;
            event.preventDefault();
            const next = practiceTools[(Math.max(0, index) + step + practiceTools.length) % practiceTools.length];
            setExploreTool(next.id);
            document.getElementById(`ex-tab-${next.id}`)?.focus();
          }}>
            {practiceTools.map((tool) => <button key={tool.id} id={`ex-tab-${tool.id}`} type="button" role="tab" aria-selected={exploreTool === tool.id} aria-controls="ex-panel"
              tabIndex={exploreTool === tool.id ? 0 : -1} className={exploreTool === tool.id ? "ex-tab active" : "ex-tab"} onClick={() => setExploreTool(tool.id)}>
              <PracticeIcon id={tool.id} /><i>{tool.number}</i><b>{tool.short}</b>
            </button>)}
          </div>
          <p className="ex-desc"><b>{practiceTools.find((tool) => tool.id === exploreTool)?.title}</b>{practiceTools.find((tool) => tool.id === exploreTool)?.desc}</p>

          <div className="tool-stage" id="ex-panel" role="tabpanel" aria-labelledby={`ex-tab-${exploreTool}`}>
            {exploreTool === "archetype" && <div className="archetype-tool">
              {archetypeResult === null ? <>
                <div className="tool-progress"><span>INNER ARCHETYPE</span><b>{archetypeStep + 1} / {archetypeQuestions.length}</b></div>
                <h3>{archetypeQuestions[archetypeStep].q}</h3>
                <p className="tool-hint">不用想哪一個比較正確，選擇第一個讓你有感覺的答案。</p>
                <div className="answer-list">{archetypeQuestions[archetypeStep].a.map((answer, index) => <button key={answer} onClick={() => answerArchetype(index)}><span>{String.fromCharCode(65 + index)}</span>{answer}</button>)}</div>
              </> : <div className="archetype-result practice-reveal">
                <span>你此刻的內在原型</span>{archetypeCard && <PracticeCard card={archetypeCard} />}
                <p>{archetypeResults[archetypeResult].en}</p><h3>{archetypeResults[archetypeResult].name}</h3>
                <blockquote>{archetypeResults[archetypeResult].text}</blockquote>
                <div className="practice-lesson"><b>這一題沒有標準答案</b><p>原型測驗練習的是辨認自己的感受；真正進入解牌時，才需要把直覺和牌面證據分開。</p></div>
                <button onClick={resetArchetype}>重新感受一次</button>
              </div>}
            </div>}

            {exploreTool === "intuition" && <div className="intuition-tool">
              <div className="tool-progress"><span>INTUITIVE READING</span><b>觀察有依據，推論有界線</b></div>
              {intuitionStage === 0 ? <>
                <PracticeCard card={intuitionCard} hidden flipped={false} />
                <h3>先讓心慢下來，翻開一張練習牌</h3><p className="tool-hint">這次先不急著知道牌名，看看畫面最先把你的視線帶到哪裡。</p>
                <div className="flow-actions"><button className="flow-button primary-flow" onClick={() => drawIntuitionCard(1)}>下一步・隨機翻一張牌 <b>→</b></button></div>
              </> : <>
                <div className="practice-reveal"><PracticeCard card={intuitionCard} /></div>
                <h3>{intuitionStage === 1 ? "哪一個解讀最有依據？" : "把直覺變成有脈絡的解讀"}</h3>
                {intuitionStage === 1 ? <>
                  <p className="tool-hint">這次不一定每個答案都正確。留意哪些選項是在描述畫面，哪些已經把牌面過度推論成命運。</p>
                  <div className="feeling-list teaching-options">{intuitionOptions.map((option, index) => <button className={intuitionChoice === option.text ? "active" : ""} key={option.text} onClick={() => { setIntuitionChoice(option.text); setIntuitionFeedback(option); }}><span>{String.fromCharCode(65 + index)}</span>{option.text}</button>)}</div>
                  {intuitionFeedback && <div className={`answer-feedback ${intuitionFeedback.correct ? "correct" : "trap"}`}><b>{intuitionFeedback.correct ? "這個判斷有依據" : "這是一個常見解牌陷阱"}</b><p>{intuitionFeedback.note}</p></div>}
                  <div className="flow-actions"><button className="flow-button secondary-flow" onClick={() => { setIntuitionStage(0); setIntuitionChoice(""); setIntuitionFeedback(null); }}>上一步</button><button className="flow-button primary-flow" disabled={!intuitionFeedback?.correct} onClick={() => setIntuitionStage(2)}>{intuitionFeedback && !intuitionFeedback.correct ? "再選一個有依據的答案" : "下一步・揭曉牌義"} <b>→</b></button></div>
                </> : <><div className="reveal-copy"><span>{intuitionCard.name} · {intuitionCard.en}</span><p>{intuitionCard.truth}</p><p><b>容易掉進的盲點：</b>{intuitionCard.blindSpot}</p><p><b>可以嘗試的下一步：</b>{intuitionCard.action}</p><small>你剛才練習的，是先辨認客觀畫面，再把象徵、感受與生活情境連成一段有依據的解讀。</small></div><div className="flow-actions"><button className="flow-button secondary-flow" onClick={() => drawIntuitionCard(1)}>換一張牌繼續練習</button><button className="flow-button primary-flow" onClick={() => { setExploreTool("journal"); setIntuitionStage(0); setIntuitionChoice(""); setIntuitionFeedback(null); }}>下一步・開始內在筆記 <b>→</b></button></div></>}
              </>}
            </div>}

            {exploreTool === "journal" && <div className="journal-tool">
              <div className="tool-progress"><span>SEVEN-DAY JOURNAL</span><b>DAY {journalDay + 1}</b></div>
              <div className="journal-card-row"><PracticeCard card={journalCard} /><div className="journal-date"><i>{journalDay + 1}</i><span>今天的內在提問</span></div></div>
              <h3>{journalPrompts[journalDay]}</h3>
              <div className="journal-lenses"><span>先看見畫面</span><span>再辨認感受</span><span>最後連回生活</span></div>
              <textarea value={journalNotes[journalDay] ?? ""} onChange={(event) => { setJournalNotes((notes) => ({ ...notes, [journalDay]: event.target.value })); setSaveState("idle"); }} aria-label="寫下今天的內在筆記" placeholder="不用急著寫得完整，先記下第一個浮現的念頭……" />
              <div className="day-picker">{journalPrompts.map((_, index) => <button aria-label={`第 ${index + 1} 天`} className={journalDay === index ? "active" : ""} onClick={() => setJournalDay(index)} key={index}>{index + 1}</button>)}</div>
              <button className="tool-primary journal-save" disabled={saveState === "saving" || !(journalNotes[journalDay] ?? "").trim()} onClick={saveJournal}>{saveState === "saving" ? "儲存中…" : saveState === "saved" ? "已儲存 ✓" : saveState === "error" ? "存檔失敗，請再試一次" : "儲存今天的筆記"}</button>
              <p className="privacy-note">筆記會保存在目前使用的手機或電腦瀏覽器中，重新開啟網站仍可繼續查看，不會公開顯示。</p>
            </div>}
          </div>

          <div className="ex-more">
            <p className="ex-group-label">更多獨立工具</p>
            <div className="ex-more-grid">
              {pageTools.map((tool) => <a key={tool.href} className="ex-more-card" href={tool.href}>
                <span className="ex-more-art" aria-hidden="true"><img src={tool.room} alt="" loading="lazy" /><span className="ex-more-charm">{tool.charm.map((src) => <img key={src} src={src} alt="" loading="lazy" />)}</span></span>
                <span className="ex-more-copy"><i>{tool.number}</i><b>{tool.title}</b><em>{tool.desc}</em><strong>前往 <span aria-hidden="true">→</span></strong></span>
              </a>)}
            </div>
          </div>
        </div>

        <div className="learning-bridge">
          <span>FROM SELF-EXPLORATION TO TAROT READING</span>
          <h3>剛剛的你，其實已經開始在讀牌了</h3>
          <p>觀察畫面、辨認感受、找出象徵與生活的連結，正是學習塔羅最重要的起點。你不需要天生有靈感，也不必先背完 78 張牌；我會帶你建立能理解、能表達，也能實際運用的解牌邏輯。</p>
          <div><a href="https://www.instagram.com/zolacoco_tarot" target="_blank" rel="noreferrer">了解塔羅教學 <b>↗</b></a><a href="https://www.instagram.com/zolacoco_tarot" target="_blank" rel="noreferrer">我適合學塔羅嗎？</a></div>
        </div>
      </section>

      <section className="consult" id="consult">
        <span className="pearl-corners" aria-hidden="true" />
        <div className="consult-copy"><p className="eyebrow">ONE-ON-ONE TAROT READING</p><h2>一張牌可以安放此刻<br />完整諮詢陪你看清整段脈絡</h2><p>如果你正卡在反覆拉扯的感情、工作選擇或一個遲遲做不了的決定，我會從你的真實處境整理問題，陪你看見盲點、關係動態與下一步，而不是只告訴你一個結果。</p></div>
        <div className="consult-card"><span>適合現在的你，如果——</span><ul><li>同一個問題已經反覆困擾很久</li><li>知道要放下，情緒卻一直被拉回去</li><li>需要的不只是答案，而是具體方向</li></ul><a href={ZOLA_LINE_URL} target="_blank" rel="noreferrer">前往官方 LINE 預約 <b>↗</b></a><small>由 Zola 親自回覆，依你的實際狀況整理適合的諮詢方式</small></div>
      </section>

      <section className="about" id="about">
        <p className="eyebrow">A GENTLE REMINDER</p>
        <h2>塔羅不是命令<br />而是一面照見自己的鏡子</h2>
        <p>免費抽牌適合當作當下的提醒。無論是學習塔羅，或透過諮詢整理問題，真正重要的都不是把人生交給一張牌，而是更理解自己的選擇。</p>
      </section>

      <footer><div className="brand">ZOLACOCO <span>TAROT</span></div><p>願你不只得到答案，也更靠近自己。</p><small>僅供自我探索與娛樂參考</small></footer>
    </main>
  );
}
