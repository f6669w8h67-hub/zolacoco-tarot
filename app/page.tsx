"use client";

import { useEffect, useRef, useState } from "react";
import { tarotCards, topicLens, type TarotCard } from "./tarot-data";

const topics = ["感情", "工作", "人際", "金錢", "創業", "今日指引"];
const spreads = [
  { id: "healing", name: "單張療癒牌", sub: "此刻的內在訊息", positions: ["此刻的療癒訊息"] },
  { id: "timeline", name: "三張時間流", sub: "過去・現在・下一步", positions: ["過去留下的影響", "現在需要看見的事", "接下來可以走的一步"] },
  { id: "celtic", name: "凱爾特十字牌陣", sub: "現況・阻力・根源・走向", positions: ["目前的核心狀態", "眼前的阻力或助力", "內在真正的想法", "事件的深層根源", "正在離開的過去", "即將靠近的發展", "你目前的位置與態度", "環境與他人的影響", "內心的期待與擔憂", "依照現況延伸的結果"] },
];

type DrawnCard = TarotCard & { reversed: boolean };
const VISIBLE_DECK_SIZE = 13;

const exploreTools = [
  { id: "archetype", number: "01", title: "此刻的內在原型", en: "INNER ARCHETYPE", desc: "像寫三頁心情日記，看看現在的你最需要什麼。" },
  { id: "intuition", number: "02", title: "牌面直覺練習室", en: "INTUITIVE READING", desc: "先不看標準牌義，練習相信自己從畫面讀到的訊息。" },
  { id: "journal", number: "03", title: "七日塔羅內在筆記", en: "SEVEN-DAY JOURNAL", desc: "每天一個提問，慢慢整理情緒、關係與真正的需要。" },
  { id: "pendulum", number: "04", title: "靈擺直覺問答", en: "PENDULUM GUIDANCE", desc: "把問題整理成是非題，透過擺動停下來聽見此刻的直覺。" },
];

const pendulumMeanings = {
  yes: { label: "是", en: "YES", message: "目前的能量比較靠近肯定。先別急著把它當成保證，想想看：如果答案真的是『是』，你願意踏出的第一小步是什麼？" },
  no: { label: "否", en: "NO", message: "目前的能量比較靠近否定或暫緩。這不一定是永遠不行，也可能是在提醒你重新檢查時機、界線與真正的需要。" },
  unclear: { label: "目前不明確", en: "UNCLEAR", message: "現在的訊息還不夠清楚。可能是問題太複雜、心裡已有強烈期待，或需要更多現實資訊；先把問題縮小，再回來詢問。" },
} as const;
type PendulumResult = keyof typeof pendulumMeanings;

const archetypeQuestionSets = [
  [
    { q: "最近的你，更接近哪一種狀態？", a: ["想安靜整理自己", "想突破停滯往前走", "想被理解與好好照顧"] },
    { q: "面對不確定時，你最常怎麼做？", a: ["先觀察，不急著表態", "逼自己趕快做決定", "反覆確認別人的心意"] },
    { q: "此刻你最需要找回的是？", a: ["內在的答案", "行動的力量", "接住自己的溫柔"] },
    { q: "最近哪一件事最容易牽動你的心？", a: ["還沒有想清楚的選擇", "一直沒有開始的改變", "一段忽近忽遠的關係"] },
    { q: "如果今晚只照顧一個需要，你會選擇？", a: ["留一段安靜給自己", "完成一個可以掌握的小行動", "允許自己被陪伴與理解"] },
  ],
  [
    { q: "當心裡有很多聲音時，你最想先做什麼？", a: ["暫時離開喧鬧，聽聽自己", "抓住一個方向開始行動", "找一個安心的人說說心情"] },
    { q: "最近哪一種感受最貼近你？", a: ["有些答案還在慢慢沉澱", "知道自己不能再停在原地", "總在照顧別人，卻忘了自己"] },
    { q: "如果今天能收到一份力量，你最想要的是？", a: ["清楚的內在直覺", "做出選擇的勇氣", "被溫柔接住的感覺"] },
    { q: "當你想到接下來的生活，最先浮現的是？", a: ["想知道自己真正要什麼", "想重新掌握前進的節奏", "想先把疲憊的心安頓好"] },
    { q: "哪一句話最像你此刻需要的提醒？", a: ["答案不需要今天全部出現", "先走一步，方向會更清楚", "我的感受也值得被放在心上"] },
  ],
  [
    { q: "面對一段反覆拉扯，你的第一個反應是？", a: ["退一步觀察真正發生的事", "想立刻打破僵局往前走", "想確認自己是不是被重視"] },
    { q: "最近你最常對自己說哪一句話？", a: ["我需要再聽聽自己的心", "我不能一直停在這裡", "我也值得被好好對待"] },
    { q: "哪一個畫面最像此刻的你？", a: ["獨自坐在安靜的月光下", "握緊方向盤準備出發", "在柔軟的花園裡慢慢休息"] },
    { q: "你最想從反覆的狀態中帶走什麼？", a: ["更相信自己的觀察", "停止等待並做出選擇", "不再用委屈交換靠近"] },
    { q: "如果內在的你能開口，現在會說？", a: ["再給我一點時間聽清楚", "我準備好做些不一樣的事", "請先好好抱住我的害怕"] },
  ],
  [
    { q: "當事情沒有照預期發展時，你通常會？", a: ["先整理線索，等待感受清楚", "調整策略，重新推進一次", "先照顧自己的失望與疲憊"] },
    { q: "最近最消耗你的是什麼？", a: ["太多外界意見蓋過自己的聲音", "想前進，卻還沒有明確方向", "一直付出，卻沒有得到回應"] },
    { q: "你希望接下來的自己更靠近哪種狀態？", a: ["相信自己的內在判斷", "有力量做出真正的選擇", "穩定地照顧自己的需要"] },
    { q: "面對卡住的地方，你願意先嘗試？", a: ["把真正的擔心寫下來", "選一件最小的事開始做", "停止責怪已經很努力的自己"] },
    { q: "現在的生活最需要增加的是？", a: ["獨處與思考的空間", "清楚可完成的節奏", "休息與被支持的感覺"] },
  ],
  [
    { q: "在關係裡，你現在最想釐清的是？", a: ["我心裡真正相信的是什麼", "我是否願意採取新的行動", "我的需要有沒有被好好看見"] },
    { q: "當對方的回應不如預期，你更容易？", a: ["沉默下來觀察彼此的變化", "想趕快做些什麼扭轉現況", "懷疑自己是不是不夠重要"] },
    { q: "此刻的關係最需要補回哪一種能量？", a: ["誠實與清楚", "方向與決心", "溫柔與安全感"] },
    { q: "如果不再猜測對方，你最想先確認？", a: ["我真正能接受的界線", "我還願意投入多少行動", "這段關係有沒有照顧我的感受"] },
    { q: "關係中的你最需要練習的是？", a: ["相信自己看到的事實", "在需要時做出選擇", "不因害怕失去而忽略自己"] },
  ],
  [
    { q: "如果今天可以替自己留一點空間，你會？", a: ["安靜獨處，讓答案浮現", "完成一件一直拖延的事", "好好吃飯休息，不再勉強"] },
    { q: "最近你最想鬆開哪一種壓力？", a: ["一定要立刻想清楚的壓力", "害怕做錯而不敢前進的壓力", "必須一直照顧別人的壓力"] },
    { q: "今天的你，最值得被提醒的是？", a: ["你其實知道自己在意什麼", "方向可以邊走邊調整", "你的感受也需要被放在心上"] },
    { q: "最近身體最常用什麼方式提醒你？", a: ["腦中停不下來、需要安靜", "坐立不安、想開始改變", "疲累緊繃、需要被照顧"] },
    { q: "明天醒來，你想替自己保留什麼？", a: ["不被打擾的片刻", "一件真正想完成的事", "更柔軟的生活節奏"] },
  ],
];

const ARCHETYPE_LOGIN_SET_KEY = "zolacoco-archetype-login-set";
const ARCHETYPE_LAST_SET_KEY = "zolacoco-archetype-last-set";

const archetypeThemes = ["傾聽內在", "找回方向", "溫柔接住自己"];

const archetypePageNotes = ["先記下最近的自己", "看看你如何面對不確定", "辨認此刻真正的需要", "聽見反覆牽動你的地方", "替今天留下一個溫柔選擇"];

const journalPrompts = ["我現在真正的情緒是什麼？", "我正在逃避或延後面對什麼？", "我內在最需要哪一種支持？", "我在人際關係中反覆出現什麼習慣？", "金錢與安全感對我代表什麼？", "如果不必迎合任何人，我想成為怎樣的人？", "這一週，我最想帶走的核心提醒是什麼？"];

type Soundscape = "forest" | "cafe" | "meditation";

const soundscapes: Record<Soundscape, { icon: string; label: string; en: string; videoId: string }> = {
  forest: { icon: "♧", label: "森林鋼琴", en: "PIANO · FOREST WHITE NOISE", videoId: "_u95mLIAxvg" },
  cafe: { icon: "♫", label: "咖啡爵士", en: "SOFT JAZZ · BOSSA NOVA", videoId: "Uxz1ts_dRrQ" },
  meditation: { icon: "◇", label: "冥想淨化", en: "HEALING FREQUENCY · MEDITATION", videoId: "kqo9Z5Br63c" },
};
const journalGuides = [
  ["牌面中，第一個吸引你的是什麼？", "它讓你想到最近哪一個情緒或事件？", "今天你願意怎麼照顧這份感受？"],
  ["畫面中有什麼像是停住或被困住？", "你遲遲沒有面對的真正原因是什麼？", "若只做一小步，今天可以從哪裡開始？"],
  ["牌中的人物正在得到或缺少什麼？", "最近什麼時刻讓你特別需要被接住？", "你可以向自己或誰提出什麼具體需要？"],
  ["你在牌面裡看見靠近、退讓或防衛嗎？", "這和你最近的一段關係有何相似？", "下一次重複發生時，你想換一種什麼回應？"],
  ["牌面裡哪些元素讓你感到穩定或緊縮？", "你最害怕失去的究竟是金錢，還是安全感？", "今天能做哪件讓自己更踏實的小事？"],
  ["如果牌中的人物不必證明自己，他會去哪裡？", "拿掉別人的期待後，你真正想保留什麼？", "你可以允許自己做出哪個更像你的選擇？"],
  ["回看七張牌，哪個畫面仍留在心裡？", "這七天你對自己有了什麼新的理解？", "請留下一句想帶往下一週的提醒。"],
];

type IntuitionOption = { text: string; correct: boolean; note: string };

function PracticeCard({ card, hidden = false, flipped = true }: { card: TarotCard; hidden?: boolean; flipped?: boolean }) {
  return <div className={`practice-tarot-card ${flipped ? "is-flipped" : ""}`} aria-label={hidden ? "尚未翻開的塔羅練習牌" : `${card.name}塔羅牌`}>
    <div className="practice-tarot-inner">
      <div className="practice-tarot-back"><div className="back-frame" /></div>
      <div className="practice-tarot-front">
        <img src={card.art} alt={card.scene} onError={(event) => { event.currentTarget.src = "/cat-tarot-master.png"; }} />
        <div className="practice-card-title"><small>{card.numeral} · {card.en}</small><strong>{card.name}</strong><span>ZOLACOCO CAT TAROT</span></div>
      </div>
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

const archetypeCardPools = [
  ["major-02", "major-09", "major-11", "major-12", "major-14", "major-18", "major-20"],
  ["major-00", "major-01", "major-04", "major-07", "major-10", "major-13", "major-19"],
  ["major-03", "major-06", "major-08", "major-15", "major-16", "major-17", "major-21"],
];
const ARCHETYPE_LAST_CARD_KEY = "zolacoco-archetype-last-card";
const journalCardIds = ["cups-13", "swords-08", "major-08", "cups-06", "pentacles-04", "major-17", "major-21"];

const positionLens: Record<string,string[]> = {
  healing:["這是你現在值得溫柔看見的訊息。"],
  timeline:["這個模式可能來自過去，也仍在輕輕影響你現在的判斷。","這是現況中值得先照顧的核心，看見它之後，事情才有機會慢慢鬆動。","這不是固定的預言，而是此刻可以陪你往前走的方向。"],
  celtic:[
    "這張牌是整個牌陣的中心，先描述你此刻真正身處的情境。",
    "它橫在核心之上，可能是需要跨越的阻力，也可能是尚未善用的資源。",
    "這是你已經意識到、正在努力理解或追求的方向。",
    "這裡指向較深的情緒、信念與事件根源，往往比表面問題更值得處理。",
    "這股影響正在淡去，但它留下的經驗仍會影響你現在的判斷。",
    "這不是固定預言，而是照目前節奏最可能先出現的下一段發展。",
    "這張牌映照你在局面中的姿態，以及你仍可主動調整的部分。",
    "它描述現實環境與他人可觀察的影響，不替任何人斷言未說出口的心意。",
    "期待與擔憂常是一體兩面；這裡提醒你分清直覺、渴望與恐懼。",
    "這是依現況延伸出的結果傾向；若前面的行動與選擇改變，走向也會跟著改變。",
  ],
};

function shuffledDeck() {
  const deck = [...tarotCards];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function synthesis(cards: DrawnCard[], spreadId: string) {
  if (cards.length < 3) return cards[0]?.truth ?? "";
  const [first, second, third] = cards;
  const firstKey = first.keywords.split("・")[0];
  const secondKey = second.keywords.split("・")[0];
  const thirdKey = third.keywords.split("・")[0];
  if (spreadId === "celtic" && cards.length === 10) {
    const key = (index:number) => cards[index].keywords.split("・")[0];
    return `整個牌陣以「${key(0)}」為核心，眼前需要處理的是「${key(1)}」。深層根源落在「${key(3)}」，而過去的「${key(4)}」正逐漸轉向近期的「${key(5)}」。你目前以「${key(6)}」面對局面，環境則帶來「${key(7)}」的影響。最後的「${key(9)}」是依現況延伸的結果傾向；真正的轉折點，是你能否辨認「${key(8)}」背後的期待與擔憂，並做出更清楚的選擇。`;
  }
  return `過去的「${firstKey}」可能仍在影響你，現況邀請你看見「${secondKey}」。接下來不必急著得到所有答案，可以先從 ${third.name} 的「${thirdKey}」踏出一小步。`;
}

export default function Home() {
  const [topic, setTopic] = useState("今日指引");
  const [selected, setSelected] = useState<DrawnCard[]>([]);
  const [spreadId, setSpreadId] = useState("healing");
  const [revealed, setRevealed] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [seed, setSeed] = useState(0);
  const [spreadCards, setSpreadCards] = useState<TarotCard[]>([]);
  const [exitingCardId, setExitingCardId] = useState<string | null>(null);
  const [exploreTool, setExploreTool] = useState("archetype");
  const [archetypeStep, setArchetypeStep] = useState(0);
  const [archetypeScores, setArchetypeScores] = useState([0, 0, 0]);
  const [archetypeResult, setArchetypeResult] = useState<number | null>(null);
  const [archetypeCardId, setArchetypeCardId] = useState<string | null>(null);
  const [archetypeSetIndex, setArchetypeSetIndex] = useState(0);
  const [intuitionStage, setIntuitionStage] = useState(0);
  const [intuitionCardIndex, setIntuitionCardIndex] = useState(9);
  const [intuitionChoice, setIntuitionChoice] = useState("");
  const [intuitionFeedback, setIntuitionFeedback] = useState<IntuitionOption | null>(null);
  const [journalDay, setJournalDay] = useState(0);
  const [journalNotes, setJournalNotes] = useState<Record<number, string>>({});
  const [journalView, setJournalView] = useState<"overview" | "entry" | "complete">("overview");
  const [viewer, setViewer] = useState<{ displayName: string; email: string; isAdmin: boolean } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pendulumQuestion, setPendulumQuestion] = useState("");
  const [pendulumResult, setPendulumResult] = useState<PendulumResult | null>(null);
  const [pendulumMoving, setPendulumMoving] = useState(false);
  const [pendulumSaveState, setPendulumSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [menuOpen, setMenuOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [welcomeStage, setWelcomeStage] = useState<"door" | "paths">("door");
  const [guideOpen, setGuideOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [soundscape, setSoundscape] = useState<Soundscape>("forest");
  const audioFrames = useRef<Partial<Record<Soundscape, HTMLIFrameElement | null>>>({});

  const positions = [-12, -6, 0, 6, 12];
  const activeSpread = spreads.find((item) => item.id === spreadId) ?? spreads[0];
  const intuitionCard = tarotCards[intuitionCardIndex] ?? tarotCards[0];
  const intuitionOptions = intuitionOptionsFor(intuitionCard, intuitionCardIndex);
  const archetypeQuestions = archetypeQuestionSets[archetypeSetIndex] ?? archetypeQuestionSets[0];
  const archetypeCard = archetypeCardId === null ? null : tarotCards.find((card) => card.id === archetypeCardId);
  const journalCard = tarotCards.find((card) => card.id === journalCardIds[journalDay]) ?? tarotCards[journalDay];
  const completedJournalDays = Object.values(journalNotes).filter((note) => note.trim()).length;

  function logActivity(type: string, title: string, summary: string, details: unknown) {
    if (!viewer) return;
    void fetch("/api/activity", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, title, summary, details }) });
  }

  useEffect(() => {
    if (!revealed || !selected.length || !viewer) return;
    logActivity("tarot", "塔羅抽牌", `${topic}・${activeSpread.name}・${selected.map(card => card.name).join("、")}`, {
      topic, spread: activeSpread.name, cards: selected.map((card, index) => ({ position: activeSpread.positions[index], name: card.name, orientation: card.reversed ? "逆位" : "正位", keywords: card.keywords, message: card.truth }))
    });
  }, [revealed]);

  useEffect(() => {
    if (!intuitionFeedback || !viewer) return;
    logActivity("intuition", "牌面直覺練習", `${intuitionCard.name}・選擇：${intuitionChoice}`, { card: intuitionCard.name, choice: intuitionChoice, feedback: intuitionFeedback });
  }, [intuitionFeedback]);

  useEffect(() => {
    fetch("/api/me").then((response) => response.json()).then((data) => {
      setViewer(data.user ?? null);
      setAuthChecked(true);
      if (data.user) {
        try {
          const savedLoginSet = JSON.parse(localStorage.getItem(ARCHETYPE_LOGIN_SET_KEY) ?? "null") as { email?: string; index?: number } | null;
          let nextSet = savedLoginSet?.email === data.user.email && Number.isInteger(savedLoginSet?.index)
            ? Number(savedLoginSet?.index)
            : -1;
          if (nextSet < 0 || nextSet >= archetypeQuestionSets.length) {
            const previousSet = Number(localStorage.getItem(ARCHETYPE_LAST_SET_KEY));
            const availableSets = archetypeQuestionSets.map((_, index) => index).filter((index) => index !== previousSet);
            nextSet = availableSets[Math.floor(Math.random() * availableSets.length)] ?? 0;
            localStorage.setItem(ARCHETYPE_LOGIN_SET_KEY, JSON.stringify({ email: data.user.email, index: nextSet }));
            localStorage.setItem(ARCHETYPE_LAST_SET_KEY, String(nextSet));
          }
          setArchetypeSetIndex(nextSet);
        } catch {
          setArchetypeSetIndex(Math.floor(Math.random() * archetypeQuestionSets.length));
        }
        fetch("/api/journal").then((response) => response.ok ? response.json() : { entries: [] }).then((saved) => {
          const notes: Record<number, string> = {};
          for (const entry of saved.entries ?? []) notes[Number(entry.day) - 1] = entry.content;
          setJournalNotes(notes);
        });
      } else {
        try { localStorage.removeItem(ARCHETYPE_LOGIN_SET_KEY); } catch { /* Browser storage may be unavailable. */ }
      }
    }).catch(() => setAuthChecked(true));
  }, []);

  function closeWelcome() {
    setWelcomeOpen(false);
  }

  function enterJourney(target: "draw" | "explore" | "pendulum") {
    closeWelcome();
    if (target === "pendulum") {
      window.location.assign("/pendulum");
      return;
    }
    window.setTimeout(() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth" }), 120);
  }

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
      stopAllSoundscapes();
      setSoundEnabled(false);
      return;
    }
    startSoundscape(nextSoundscape);
  }

  async function saveJournal() {
    if (!viewer) {
      window.location.href = `/signin-with-chatgpt?return_to=${encodeURIComponent("/#explore")}`;
      return;
    }
    const content = (journalNotes[journalDay] ?? "").trim();
    if (!content) return;
    setSaveState("saving");
    const response = await fetch("/api/journal", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ day: journalDay + 1, prompt: journalPrompts[journalDay], cardId: journalCard.id, cardName: journalCard.name, content }),
    });
    setSaveState(response.ok ? "saved" : "error");
    if (response.ok) setJournalView("complete");
  }

  function openJournalDay(day: number) {
    setJournalDay(day);
    setSaveState("idle");
    setJournalView("entry");
  }

  async function askPendulum() {
    const question = pendulumQuestion.trim();
    if (!question || pendulumMoving) return;
    setPendulumResult(null);
    setPendulumSaveState("idle");
    setPendulumMoving(true);
    const choices: PendulumResult[] = ["yes", "no", "unclear"];
    const result = choices[Math.floor(Math.random() * choices.length)];
    window.setTimeout(async () => {
      setPendulumResult(result);
      setPendulumMoving(false);
      if (!viewer) return;
      try {
        const response = await fetch("/api/pendulum", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ question, result, resultLabel: pendulumMeanings[result].label }),
        });
        setPendulumSaveState(response.ok ? "saved" : "error");
      } catch {
        setPendulumSaveState("error");
      }
    }, 2600);
  }

  function shuffleDeck() {
    if (shuffling) return;
    setRevealed(false);
    setSelected([]);
    setSpreadCards([]);
    setShuffling(true);
    setSeed((s) => s + 1);
    window.setTimeout(() => {
      setSpreadCards(shuffledDeck().slice(0, VISIBLE_DECK_SIZE));
      setShuffling(false);
    }, 900);
  }

  function chooseCard(card: TarotCard) {
    if (exitingCardId) return;
    if (selected.some((item) => item.id === card.id)) return;
    const next = [...selected, { ...card, reversed: Math.random() < 0.35 }];
    setExitingCardId(card.id);
    window.setTimeout(() => {
      setSelected(next);
      setSpreadCards((current) => {
        const remaining = current.filter((item) => item.id !== card.id);
        if (next.length >= activeSpread.positions.length || remaining.length >= VISIBLE_DECK_SIZE) return remaining;

        const unavailableIds = new Set([
          ...remaining.map((item) => item.id),
          ...next.map((item) => item.id),
        ]);
        const replacement = shuffledDeck().find((item) => !unavailableIds.has(item.id));
        return replacement ? [...remaining, replacement] : remaining;
      });
      setExitingCardId(null);
      if (next.length === activeSpread.positions.length) window.setTimeout(() => setRevealed(true), 460);
    }, 300);
  }

  function reset() {
    setSelected([]);
    setRevealed(false);
    setSpreadCards([]);
    document.getElementById("draw")?.scrollIntoView({ behavior: "smooth" });
  }

  function changeTopic(item: string) {
    setTopic(item); setSelected([]); setSpreadCards([]); setRevealed(false);
  }

  function changeSpread(item: string) {
    setSpreadId(item); setSelected([]); setSpreadCards([]); setRevealed(false);
  }

  function answerArchetype(answer: number) {
    const scores = archetypeScores.map((score, index) => score + (index === answer ? 1 : 0));
    setArchetypeScores(scores);
    if (archetypeStep === archetypeQuestions.length - 1) {
      const highest = Math.max(...scores);
      const matchingThemes = scores.map((score, index) => score === highest ? index : -1).filter((index) => index >= 0);
      const themeIndex = matchingThemes[Math.floor(Math.random() * matchingThemes.length)] ?? 0;
      const pool = archetypeCardPools[themeIndex];
      let available = pool;
      try {
        const lastCard = localStorage.getItem(ARCHETYPE_LAST_CARD_KEY);
        available = pool.filter((id) => id !== lastCard);
      } catch { /* Browser storage may be unavailable. */ }
      const nextCardId = available[Math.floor(Math.random() * available.length)] ?? pool[0];
      try { localStorage.setItem(ARCHETYPE_LAST_CARD_KEY, nextCardId); } catch { /* Browser storage may be unavailable. */ }
      setArchetypeCardId(nextCardId);
      setArchetypeResult(themeIndex);
      const resultCard = tarotCards.find((item) => item.id === nextCardId);
      logActivity("archetype", "內在原型探索", `${archetypeThemes[themeIndex] ?? "內在原型"}・${resultCard?.name ?? ""}`, { theme: archetypeThemes[themeIndex], card: resultCard?.name, scores });
    }
    else setArchetypeStep((step) => step + 1);
  }

  function resetArchetype() {
    setArchetypeStep(0); setArchetypeScores([0, 0, 0]); setArchetypeResult(null); setArchetypeCardId(null);
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
    <main>
      <style>{`
        .primary,.draw-button,.reshuffle,.flow-button,.learning-bridge a,.consult-card a,
        .topics button,.spread-options button,.tool-tabs button,.answer-list button,
        .feeling-list button,.day-picker button,.archetype-result button,.tool-primary {
          position:relative; overflow:hidden; border:1px solid rgba(200,165,104,.9)!important;
          color:#70484b!important; background:linear-gradient(145deg,rgba(255,241,240,.98),rgba(243,212,215,.95))!important;
          text-shadow:none!important; box-shadow:inset 0 2px 1px rgba(255,255,255,.98),inset 0 -10px 20px rgba(189,120,133,.09),0 10px 24px rgba(114,70,75,.12)!important;
          backdrop-filter:blur(12px);
        }
        .primary:before,.draw-button:before,.reshuffle:before,.flow-button:before,
        .learning-bridge a:before,.consult-card a:before,.topics button:before,
        .spread-options button:before,.tool-tabs button:before,.answer-list button:before,
        .feeling-list button:before,.archetype-result button:before,.tool-primary:before {
          content:""; position:absolute; left:9%; right:9%; top:2px; height:40%; border-radius:999px;
          background:linear-gradient(180deg,rgba(255,255,255,.82),rgba(255,255,255,0)); pointer-events:none;
        }
        .topics button.active,.topics button:hover,.spread-options button.active,
        .tool-tabs button.active,.tool-tabs button:hover,.answer-list button:hover,
        .feeling-list button:hover,.feeling-list button.active,.day-picker button.active {
          border-color:#b99150!important; color:#684046!important;
          background:linear-gradient(145deg,rgba(255,236,235,.99),rgba(233,191,197,.97))!important;
          box-shadow:inset 0 2px 1px rgba(255,255,255,.98),inset 0 -12px 24px rgba(177,106,119,.12),0 13px 28px rgba(108,66,72,.16)!important;
        }
        .tool-tabs small,.tool-tabs i,.answer-list span,.teaching-options button>span,
        .spread-options button>i,.spread-options button>small { color:#9a6b48!important; }
        .tool-tabs em { color:#816164!important; }
        .spread-options button.active>small,.spread-options button.active>i { color:#875936!important; }
      `}</style>
      <header className={`nav site-nav ${menuOpen ? "menu-open" : ""}`}>
        <a className="brand" href="#top" aria-label="回到首頁" onClick={() => setMenuOpen(false)}>ZOLACOCO <span>TAROT</span></a>
        <button className="menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="primary-menu" aria-label={menuOpen ? "關閉選單" : "開啟選單"} onClick={() => setMenuOpen((open) => !open)}><i /><i /><i /></button>
        <nav className="primary-menu" id="primary-menu" aria-label="主要功能選單">
          <a href="#draw" onClick={() => setMenuOpen(false)}>塔羅抽牌</a><a href="/pendulum">靈擺占卜</a><a href="/astro-dice">星骰指引</a><a href="/healing-room">療癒小房間</a><a href="/healing-room/yuanchen">元辰宮</a><a href="#explore" onClick={() => setMenuOpen(false)}>學習塔羅</a><button className="nav-guide" onClick={() => { setGuideOpen(true); setMenuOpen(false); }}>使用教學</button><a href="#about" onClick={() => setMenuOpen(false)}>關於 Zola</a>
        </nav>
        <div className="account-nav">{authChecked && (viewer ? <><span className="account-name">{viewer.displayName}</span>{viewer.isAdmin && <a className="account-link" href="/admin">查看後台</a>}<a className="account-link" href="/signout-with-chatgpt?return_to=/" onClick={() => { try { localStorage.removeItem(ARCHETYPE_LOGIN_SET_KEY); } catch { /* Browser storage may be unavailable. */ } }}>登出</a></> : <a className="account-link login-link" href="/signin-with-chatgpt?return_to=/#explore">登入／註冊</a>)}</div>
      </header>

      {welcomeOpen && <div className={`welcome-layer welcome-cover-layer welcome-${welcomeStage}`} role="dialog" aria-modal="true" aria-label="歡迎進入 Zolacoco Tarot">
        <div className="welcome-backdrop" onClick={closeWelcome} />
        <section className="welcome-cover">
          <div className="welcome-cover-picture">
            <img src="/zolacoco-astrolabe-home.png" alt="深藍古典星盤與十二星座圖，象徵進入 Zolacoco Tarot 的占星探索空間" />
          </div>
          <div className="welcome-cover-copy">
            <small>WELCOME TO ZOLACOCO TAROT</small>
            <h2>{welcomeStage === "door" ? <>今晚，替心裡的事<br className="welcome-title-break" />留個位置</> : "今晚，你想從哪裡開始？"}</h2>
            <p>{welcomeStage === "door" ? "不急著找到答案，先陪你看見真正放不下的是什麼。" : "一次只選一條路，讓這段占卜慢慢展開。"}</p>
            {welcomeStage === "door" && <div className="welcome-zola-signature"><b>Zola</b><em>陪你一起整理情緒，看見下一步</em></div>}
            {welcomeStage === "door" ? <button className="welcome-door-button" onClick={() => setWelcomeStage("paths")}>推開門，開始今晚的占卜 <b>→</b></button> : <button className="welcome-path-back" onClick={() => setWelcomeStage("door")}>← 回到門前</button>}
          </div>
          <div className="welcome-cover-actions" aria-label="選擇今天需要的入口">
            <button className="cover-action-tarot" onClick={() => enterJourney("draw")}><small>01 · TAROT</small><b>今晚想抽一張牌</b><span>整理此刻的感受與方向</span><strong aria-hidden="true">→</strong></button>
            <button className="cover-action-pendulum" onClick={() => enterJourney("pendulum")}><small>02 · PENDULUM</small><b>讓靈擺陪我確認</b><span>進入安靜的直覺確認室</span><strong aria-hidden="true">→</strong></button>
            <button className="cover-action-astro" onClick={() => window.location.assign("/astro-dice")}><small>03 · ASTRO DICE</small><b>擲出此刻的星骰</b><span>行星 × 星座 × 宮位的方向指引</span><strong aria-hidden="true">→</strong></button>
            <button className="cover-action-learn" onClick={() => enterJourney("explore")}><small>04 · PRACTICE</small><b>進入塔羅練習室</b><span>從觀察畫面與直覺開始</span><strong aria-hidden="true">→</strong></button>
            <button className="cover-action-healing" onClick={() => window.location.assign("/healing-room")}><small>05 · HEALING ROOM</small><b>今晚，先把心安放下來</b><span>進入療癒小房間</span><strong aria-hidden="true">→</strong></button>
          </div>
        </section>
      </div>}

      {guideOpen && <div className="guide-layer" role="dialog" aria-modal="true" aria-labelledby="guide-title">
        <div className="welcome-backdrop" onClick={() => setGuideOpen(false)} />
        <section className="guide-card">
          <button className="welcome-close" onClick={() => setGuideOpen(false)} aria-label="關閉使用教學">×</button>
          <p className="eyebrow">A GENTLE GUIDE</p><h2 id="guide-title">第一次使用，可以這樣開始</h2>
          <div className="guide-steps">
            <article><i>01</i><div><b>先整理問題</b><p>一次只放一件事，問「我現在需要留意什麼」會比追問確定結果更適合。</p></div></article>
            <article><i>02</i><div><b>選擇適合的工具</b><p>想理解情緒與脈絡，用塔羅；想處理簡單的是非，用靈擺；想拆解能量、表現方式與生活領域，用星骰。</p></div></article>
            <article><i>03</i><div><b>把訊息帶回現實</b><p>結果是自我整理的起點。最後問自己：我今天能做的最小一步是什麼？</p></div></article>
          </div>
          <div className="guide-actions"><button onClick={() => { setGuideOpen(false); document.getElementById("draw")?.scrollIntoView({ behavior: "smooth" }); }}>跟著教學抽牌</button><a href="/pendulum">查看靈擺教學</a></div>
        </section>
      </div>}

      <section className="hero" id="top">
        <div className="orb orb-one" /><div className="orb orb-two" />
        <div className="hero-copy">
          <p className="eyebrow">A MESSAGE FOR YOUR PRESENT MOMENT</p>
          <h1><span>把問題放在心裡</span><em>抽一張屬於你的牌</em></h1>
          <p className="intro">答案不替你決定人生，而是陪你看清此刻真正需要留意的方向。</p>
          <a className="primary" href="#draw">開始抽牌 <span>↓</span></a>
          <p className="ritual">深呼吸三次，想著一個你最近最在意的問題</p>
          <div className="hero-paths" aria-label="選擇體驗方式">
            <a href="#draw"><i>01</i><span><b>抽牌指引</b><small>整理此刻的問題</small></span><em>→</em></a>
            <a href="/pendulum"><i>02</i><span><b>靈擺問答</b><small>日常選擇與直覺</small></span><em>→</em></a>
            <a href="#explore"><i>03</i><span><b>新手練習</b><small>學會怎麼讀牌</small></span><em>→</em></a>
            <a href="/healing-room"><i>04</i><span><b>療癒小房間</b><small>今晚，先把心安放下來</small></span><em>→</em></a>
            <a className="yuanchen-home-path" href="/healing-room/yuanchen"><i>05</i><span><b>元辰宮・內在心境探索</b><small>走進心中的房子，看見等待整理的地方</small></span><em>→</em></a>
            <a className="astro-dice-home-path" href="/astro-dice"><i>06</i><span><b>星骰・此刻方向指引</b><small>行星 × 星座 × 宮位的三層訊息</small></span><em>→</em></a>
          </div>
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
          <h2>今天，你想問什麼？</h2>
          <small className="deck-note">完整 78 張萊恩 × 蝦蝦貓咪塔羅 · 22 張大牌＋56 張小牌</small>
        </div>
        <div className="tarot-soundscape" aria-label="塔羅抽牌背景音樂">
          <div className="tarot-soundscape-heading"><span aria-hidden="true">♫</span><div><small>CHOOSE YOUR SOUNDSCAPE</small><h3>先選一段音樂，讓心慢下來</h3><p>點選後會直接播放；再次點擊同一首即可停止。</p></div></div>
          <div className="tarot-soundscape-options">
            {(Object.keys(soundscapes) as Soundscape[]).map((item) => {
              const content = soundscapes[item];
              const active = soundEnabled && soundscape === item;
              return <button type="button" key={item} className={active ? "active" : ""} onClick={() => toggleSoundscape(item)} aria-pressed={active}>
                <i aria-hidden="true">{content.icon}</i><span><b>{active ? "停止播放" : content.label}</b><small>{content.en}</small></span><strong aria-hidden="true">{active ? "Ⅱ" : "▶"}</strong>
              </button>;
            })}
          </div>
          <p className="tarot-music-status" aria-live="polite">{soundEnabled ? `正在播放「${soundscapes[soundscape].label}」，抽牌時會持續播放。` : "也可以不播放音樂，直接開始抽牌。"}</p>
          <div className="tarot-audio-only-player" aria-hidden="true">
            {(Object.keys(soundscapes) as Soundscape[]).map((item) => <iframe key={item} ref={(node) => { audioFrames.current[item] = node; }} src={`https://www.youtube-nocookie.com/embed/${soundscapes[item].videoId}?enablejsapi=1&playsinline=1&loop=1&playlist=${soundscapes[item].videoId}&controls=0&rel=0`} title={`${soundscapes[item].label}背景音樂`} allow="autoplay; encrypted-media" referrerPolicy="strict-origin-when-cross-origin" tabIndex={-1} />)}
          </div>
        </div>
        <div className="draw-guide" aria-label="塔羅抽牌三步驟">
          <div className="draw-guide-title"><span>NEW HERE?</span><b>第一次抽牌，跟著三步驟就可以</b><button onClick={() => setGuideOpen(true)}>閱讀完整教學</button></div>
          <ol>
            <li className="current"><i>1</i><span><b>選主題與牌陣</b><small>不知道怎麼選，就從「今日指引＋單張牌」開始</small></span></li>
            <li><i>2</i><span><b>洗牌後憑直覺選牌</b><small>不需要猜哪張最好，選第一眼停留的牌</small></span></li>
            <li><i>3</i><span><b>讀完訊息，留下一個行動</b><small>不要急著問結果，先帶走今天能做到的一步</small></span></li>
          </ol>
        </div>
        <div className="topics" role="group" aria-label="選擇抽牌主題">
          {topics.map((item) => <button key={item} className={topic === item ? "active" : ""} onClick={() => changeTopic(item)}>{item}</button>)}
        </div>

        <div className="spread-options" role="group" aria-label="選擇塔羅牌陣">
          {spreads.map((item, index) => <button key={item.id} className={spreadId === item.id ? "active" : ""} onClick={() => changeSpread(item.id)}>
            <i>{String(index + 1).padStart(2, "0")}</i>
            <span className={`spread-motif motif-${item.positions.length}`} aria-hidden="true">{item.positions.map((_, cardIndex) => <b key={cardIndex} />)}</span>
            <span>{item.name}</span><small>{item.sub}</small>
          </button>)}
        </div>

        {selected.length < activeSpread.positions.length ? (
          <div className={`deck-stage ${shuffling ? "shuffling" : ""}`}>
            {spreadCards.length === 0 ? <>
              <div className="card-fan" aria-hidden="true">
                {positions.map((p, i) => <div key={`${seed}-${i}`} className="card-back" style={{ transform: `translateX(${p * 2}px) rotate(${p}deg)` }}><div className="back-frame" /></div>)}
              </div>
              <button className="draw-button" onClick={shuffleDeck} disabled={shuffling}>{shuffling ? "正在洗牌…" : "先洗牌，讓心慢下來"}</button>
              <p>深呼吸三次，把注意力輕輕帶回自己</p>
            </> : <>
              <div className="choose-heading"><span>02 · FOLLOW YOUR INTUITION</span><h3>牌已展開，請親手選牌</h3><p>{activeSpread.positions.length === 1 ? "不用分析哪張比較好，第一眼停留的地方，就是此刻的訊息。" : `請依直覺選出第 ${selected.length + 1} 張｜${activeSpread.positions[selected.length]}`}</p></div>
              {activeSpread.positions.length > 1 && <div className="selection-progress" aria-label="抽牌進度">
                {activeSpread.positions.map((position, index) => {
                  const isComplete = index < selected.length;
                  const isCurrent = index === selected.length;
                  return <div className={`choice-slot ${isComplete ? "filled" : ""} ${isCurrent ? "current" : ""}`} key={position} aria-current={isCurrent ? "step" : undefined}>
                    <div>{isComplete ? <><span>✓</span><small>已選取</small></> : <b>{index + 1}</b>}</div><p>{position}</p>
                  </div>;
                })}
              </div>}
              <div className="spread-deck" role="group" aria-label="從展開的牌組中選擇一張牌">
                {spreadCards.map((card, i) => <button key={card.id} className={`pick-card ${exitingCardId === card.id ? "is-selected" : ""}`} disabled={Boolean(exitingCardId)} onClick={() => chooseCard(card)} aria-label={`選擇第 ${i + 1} 張牌，選取後牌會移出牌組`} style={{ "--i": i, "--offset": i - (spreadCards.length - 1) / 2 } as React.CSSProperties}><div className="back-frame" /></button>)}
              </div>
              {activeSpread.positions.length > 3 && <p className="deck-replenish-note" aria-live="polite">每抽走一張，牌桌會自動補上新牌 · 已選 {selected.length}／{activeSpread.positions.length}</p>}
              <button className="reshuffle" onClick={shuffleDeck}>重新洗牌</button>
            </>}
          </div>
        ) : (
          <div className="result" aria-live="polite">
            <article className="reading">
              <div className="result-intro">
                <p className="reading-label">你的「{topic}」指引 · {activeSpread.name}</p>
                <h2>{selected.length === 1 ? "這張牌想告訴你" : spreadId === "celtic" ? "你的凱爾特十字全貌" : "屬於你的三張牌"}</h2>
                {selected.length > 1 && <div className="synthesis"><span>整體訊息</span><p>{synthesis(selected, spreadId)}</p></div>}
              </div>
              <div className={`spread-result-layout spread-${spreadId}`} aria-label={`${activeSpread.name}牌面配置`}>
                {selected.map((card, i) => <div className={`spread-position position-${i + 1}`} key={`${card.id}-position`}>
                  <span className="spread-position-label" aria-label={`${i + 1}．${activeSpread.positions[i]}`}>{spreadId === "celtic" ? i + 1 : `${i + 1}．${activeSpread.positions[i]}`}</span>
                  <div className={`tarot-card suit-${card.suit} ${card.reversed ? "is-reversed" : ""} ${revealed ? "revealed" : ""}`}><div className="tarot-inner"><div className="tarot-back"><div className="back-frame" /></div><div className="tarot-front"><div className="cat-art"><img src={card.art} alt={card.scene} onError={(event) => { event.currentTarget.src = "/cat-tarot-master.png"; }} /></div><p>{card.numeral} · {card.en}</p><h3>{card.name}</h3><small>ZOLACOCO CAT TAROT</small></div></div></div>
                </div>)}
              </div>
              <section className="drawn-card-summary" aria-labelledby="drawn-card-summary-title">
                <h3 id="drawn-card-summary-title">這次抽到的牌</h3>
                <ol>{selected.map((card, i) => <li key={`${card.id}-summary`}><b>{i + 1}．{activeSpread.positions[i]}</b><span>{card.name}</span><em className={card.reversed ? "reversed" : "upright"}>{card.reversed ? "逆位" : "正位"}</em></li>)}</ol>
              </section>
              <section className="spread-interpretations" aria-label="牌陣解析">
                <h3>牌陣解析</h3>
                {selected.map((card, i) => <article className="position-reading" key={`${card.id}-reading`}>
                  <header><span>{String(i + 1).padStart(2, "0")}</span><div><h4>{activeSpread.positions[i]}</h4><p>{card.name}・{card.reversed ? "逆位" : "正位"}</p></div></header>
                  <p className="scene-note">牌面｜{card.scene}</p><div className="reading-point"><b>{card.reversed ? "逆位核心提醒" : "此刻的核心提醒"}</b><p>{topicLens[topic][card.suit]} {positionLens[spreadId][i]} {card.reversed ? `這張牌的能量目前較像卡住、延遲或轉向內在；${card.blindSpot}` : card.truth}</p></div><div className="reading-point blind"><b>你也可以留意</b><p>{card.reversed ? `逆位不是單純的壞結果，而是提醒你：${card.truth}` : card.blindSpot}</p></div><div className="reading-point next"><b>可以先這樣做</b><p>{card.action}</p></div>
                </article>)}
              </section>
              <aside className="zola-line-bridge" aria-label="向 Zola 詢問這次的抽牌結果">
                <small>想把牌面放回你的真實處境裡嗎？</small>
                <h3>問問 Zola，陪你把這次的訊息聊清楚</h3>
                <p>如果你還是不確定牌面在說什麼，或想知道下一步可以怎麼做，歡迎直接到官方 LINE 跟我聊聊。</p>
                <a href="https://lin.ee/XIi2Nam" target="_blank" rel="noreferrer">到官方 LINE 跟 Zola 聊聊</a>
              </aside>
              <div className="reading-actions"><button className="flow-button secondary-flow" onClick={reset}>重新抽牌</button><a className="flow-button primary-flow" href="#explore" onClick={() => setExploreTool("journal")}>把此刻寫進日記 <b>→</b></a></div>
            </article>
          </div>
        )}
      </section>

      <section className="cat-story" id="cat-story">
        <div className="cat-story-heading">
          <p className="eyebrow">THE HEARTS BEHIND THE DECK</p>
          <h2>抽完牌，再認識陪你讀牌的牠們</h2>
          <p>這套 78 張貓咪塔羅，以萊恩與蝦蝦為原型。牠們有不同的個性，也把不同的情緒與生命經驗帶進每一張牌裡。</p>
        </div>
        <div className="cat-profiles">
          <article className="cat-profile ryan-profile">
            <div className="cat-photo portrait-cat-photo"><img src="/ryan-portrait.jpeg" alt="萊恩正面藍眼布偶貓形象照" /><span className="shell-mark" aria-hidden="true">🐚</span></div>
            <div><span>RYAN · 萊恩</span><h3>有點傲氣，也有自己的溫柔</h3><p>萊恩是領養回家的布偶公貓。牠看起來從容、偶爾有點小傲氣，卻會用自己的方式默默陪伴。在牌組裡，牠常代表探索、勇氣、界線，以及慢慢相信自己的力量。</p></div>
          </article>
          <article className="cat-profile shrimp-profile">
            <div className="cat-photo portrait-cat-photo"><img src="/shrimp-portrait.jpeg" alt="蝦蝦正面橘貓形象照" /><span className="shell-mark" aria-hidden="true">🐚</span></div>
            <div><span>SHRIMP · 蝦蝦</span><h3>膽小敏感，卻一直努力相信愛</h3><p>蝦蝦也是領養回家的貓咪。牠年紀比較大、個性敏感膽小，需要更多耐心與安全感。在牌組裡，牠陪我們看見脆弱、依戀、療癒，以及被好好接住之後重新安心的可能。</p></div>
          </article>
        </div>
        <p className="cat-story-note">牠們不是裝飾，而是整副牌的靈魂：有時由萊恩帶你向前，有時由蝦蝦陪你停下來照顧自己。</p>
      </section>

      <section className="explore" id="explore">
        <div className="explore-heading">
          <p className="eyebrow">TAROT AS A MIRROR</p>
          <h2>用塔羅，更靠近內在的自己</h2>
          <p>塔羅不只是預測結果，也是一種整理感受、理解模式的語言。你不需要會背牌義，先從此刻最有感覺的練習開始。</p>
        </div>

        <div className="explore-layout">
          <nav className="tool-tabs" aria-label="選擇內在探索工具">
            {exploreTools.map((tool) => <button key={tool.id} className={exploreTool === tool.id ? "active" : ""} onClick={() => tool.id === "pendulum" ? window.location.assign("/pendulum") : setExploreTool(tool.id)}>
              <i>{tool.number}</i><span><small>{tool.en}</small><b>{tool.title}</b><em>{tool.desc}</em></span>
            </button>)}
          </nav>

          <div className="tool-stage">
            {exploreTool === "archetype" && <div className="archetype-tool">
              {archetypeResult === null ? <>
                <div className="inner-diary-page">
                  <div className="diary-topline"><span>此刻的心情日記</span><time suppressHydrationWarning>{new Intl.DateTimeFormat("zh-TW", { month: "long", day: "numeric" }).format(new Date())}</time></div>
                  <div className="diary-progress" aria-label={`第 ${archetypeStep + 1} 頁，共 ${archetypeQuestions.length} 頁`}>
                    {archetypeQuestions.map((_, index) => <i key={index} className={index <= archetypeStep ? "active" : ""} />)}
                  </div>
                  <small className="diary-page-label">PAGE {archetypeStep + 1} · {archetypePageNotes[archetypeStep]}</small>
                  <h3>{archetypeQuestions[archetypeStep].q}</h3>
                  <p className="tool-hint">沒有標準答案，選最像你最近狀態的那一句就好。</p>
                  <div className="answer-list diary-answers">{archetypeQuestions[archetypeStep].a.map((answer, index) => <button key={answer} onClick={() => answerArchetype(index)}><span>{index + 1}</span>{answer}<b aria-hidden="true">→</b></button>)}</div>
                  <p className="diary-whisper">慢慢選，誠實比正確更重要。</p>
                </div>
              </> : <div className="archetype-result practice-reveal">
                <div className="diary-result-heading"><span>今天的內在日記</span><time suppressHydrationWarning>{new Intl.DateTimeFormat("zh-TW", { month: "long", day: "numeric" }).format(new Date())}</time></div>
                <small className="diary-page-label">寫給此刻的你</small>{archetypeCard && <PracticeCard card={archetypeCard} />}
                {archetypeCard && <><p>{archetypeCard.en} · {archetypeThemes[archetypeResult]}</p><h3>{archetypeCard.name}</h3>
                <blockquote>{archetypeCard.truth}</blockquote>
                <div className="diary-reflection"><b>留給今天的一句話</b><p>{archetypeCard.action}</p></div></>}
                <div className="archetype-consult-bridge">
                  <small>想把這張牌放回你最近的真實狀態裡嗎？</small>
                  <p>如果你想更深入理解這個結果，歡迎直接到官方 LINE 問問 Zola，我會陪你一起整理。</p>
                  <a className="line-consult-button" href="https://lin.ee/XIi2Nam" target="_blank" rel="noreferrer">到官方 LINE 跟 Zola 聊聊</a>
                </div>
                <div className="archetype-next-actions"><button className="diary-restart" onClick={resetArchetype}>重新感受一次</button><button className="diary-next" onClick={() => setExploreTool("journal")}>下一步・寫下今天的內在筆記 <b>→</b></button></div>
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
              <div className="tool-progress"><span>SEVEN-DAY JOURNAL</span><b>{completedJournalDays} / 7 已完成</b></div>
              {journalView === "overview" ? <div className="journal-overview">
                <span className="journal-kicker">給自己七天，慢慢聽見內在</span>
                <h3>每天一張牌，一個真正值得停下來的問題</h3>
                <p className="tool-hint">不需要會解牌，也不用一次寫得完整。每天留 5–10 分鐘，依序看見畫面、辨認感受，再把答案帶回生活。</p>
                <div className="journal-route" aria-label="七日筆記進度">{journalPrompts.map((prompt, index) => {
                  const done = Boolean(journalNotes[index]?.trim());
                  return <button key={prompt} className={done ? "done" : ""} onClick={() => openJournalDay(index)}><i>{done ? "✓" : index + 1}</i><span><b>DAY {index + 1}</b><small>{prompt}</small></span><em>›</em></button>;
                })}</div>
                <button className="flow-button primary-flow journal-start" onClick={() => openJournalDay(Math.min(completedJournalDays, 6))}>{completedJournalDays ? "繼續我的七日筆記" : "開始第一天"} <b>→</b></button>
              </div> : journalView === "complete" ? <div className="journal-complete" aria-live="polite">
                <div className="complete-mark">✓</div><span>DAY {journalDay + 1} 已收好</span>
                <h3>{completedJournalDays === 7 ? "你完成了這趟七日內在旅程" : "今天的答案，不需要立刻變成結論"}</h3>
                <p>{completedJournalDays === 7 ? "回頭看看七天留下的文字，你已經替自己整理出一條更清楚的內在線索。" : "先讓這段文字陪你沉澱。下一次回來時，再從新的感受繼續。"}</p>
                <div className="flow-actions"><button className="flow-button secondary-flow" onClick={() => setJournalView("overview")}>查看七日進度</button>{journalDay < 6 && <button className="flow-button primary-flow" onClick={() => openJournalDay(journalDay + 1)}>前往 DAY {journalDay + 2} <b>→</b></button>}</div>
              </div> : <>
                <button className="journal-back" onClick={() => setJournalView("overview")}>← 返回七日進度</button>
                <div className="journal-card-row"><PracticeCard card={journalCard} /><div className="journal-date"><i>{journalDay + 1}</i><span>今天的內在提問</span></div></div>
                <h3>{journalPrompts[journalDay]}</h3>
                <div className="journal-lenses"><span>01 看見畫面</span><span>02 辨認感受</span><span>03 連回生活</span></div>
                <div className="journal-guide">{journalGuides[journalDay].map((guide, index) => <p key={guide}><i>{index + 1}</i>{guide}</p>)}</div>
                <label className="journal-write-label" htmlFor="journal-entry">寫下此刻浮現的答案 <small>{(journalNotes[journalDay] ?? "").length} 字</small></label>
                <textarea id="journal-entry" maxLength={8000} value={journalNotes[journalDay] ?? ""} onChange={(event) => { setJournalNotes((notes) => ({ ...notes, [journalDay]: event.target.value })); setSaveState("idle"); }} aria-label="寫下今天的內在筆記" placeholder="不必追求完整，先從最有感覺的一句開始……" />
                {saveState === "error" && <p className="journal-error">沒有儲存成功，請確認網路後再試一次。</p>}
                <button className="tool-primary journal-save" disabled={saveState === "saving" || !(journalNotes[journalDay] ?? "").trim()} onClick={saveJournal}>{!viewer ? "登入並保存這篇筆記" : saveState === "saving" ? "正在保存…" : "完成今天的筆記"}</button>
                <p className="privacy-note">你的筆記不會公開；登入後會安全保存在帳號中，方便下次接著寫。</p>
              </>}
            </div>}

            {exploreTool === "pendulum" && <div className="pendulum-tool">
              <div className="tool-progress"><span>PENDULUM GUIDANCE</span><b>只問一個能用是／否回答的問題</b></div>
              <div className={`pendulum-stage ${pendulumMoving ? "is-moving" : ""} ${pendulumResult ? `result-${pendulumResult}` : ""}`} aria-live="polite">
                <div className="pendulum-arch" aria-hidden="true"><span>YES</span><i>✦</i><span>NO</span></div>
                <div className="pendulum-chain" aria-hidden="true"><span /><b>✦</b></div>
                <div className="pendulum-shadow" aria-hidden="true" />
              </div>
              <h3>{pendulumMoving ? "讓靈擺慢慢回應……" : pendulumResult ? pendulumMeanings[pendulumResult].label : "把問題放在心裡，再寫下來"}</h3>
              {!pendulumResult && <>
                <p className="tool-hint">適合：「我現在適合主動聯絡嗎？」不適合：「他到底在想什麼？」一次只放一個核心問題。</p>
                <textarea className="pendulum-question" maxLength={180} value={pendulumQuestion} disabled={pendulumMoving} onChange={(event) => setPendulumQuestion(event.target.value)} placeholder="例如：我現在適合先把注意力放回自己嗎？" aria-label="輸入要詢問靈擺的是非題" />
                <button className="tool-primary pendulum-button" disabled={!pendulumQuestion.trim() || pendulumMoving} onClick={askPendulum}>{pendulumMoving ? "靈擺回應中…" : "開始靈擺問答"}</button>
              </>}
              {pendulumResult && <div className="pendulum-answer practice-reveal">
                <span>{pendulumMeanings[pendulumResult].en}</span>
                <blockquote>{pendulumMeanings[pendulumResult].message}</blockquote>
                <p className="pendulum-asked">你的問題：{pendulumQuestion.trim()}</p>
                {viewer ? <small>{pendulumSaveState === "saved" ? "這次問答已儲存，Zola 可於後台查看。" : pendulumSaveState === "error" ? "這次結果未能儲存，仍可重新詢問。" : "正在儲存這次問答…"}</small> : <small>目前為訪客體驗；登入後，提問與結果才會儲存並由 Zola 於後台查看。</small>}
                <div className="flow-actions"><button className="flow-button secondary-flow" onClick={() => { setPendulumQuestion(""); setPendulumResult(null); setPendulumSaveState("idle"); }}>再問一題</button>{!viewer && <a className="flow-button primary-flow" href="/signin-with-chatgpt?return_to=/#explore">登入後保存紀錄 <b>→</b></a>}</div>
              </div>}
              <p className="privacy-note">線上靈擺以隨機擺動提供直覺與自我探索提示，不是科學測量或絕對預言；健康、法律、投資與安全決策請以專業資訊為準。</p>
            </div>}
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
        <div className="consult-copy"><p className="eyebrow">ONE-ON-ONE TAROT READING</p><h2>一張牌可以安放此刻<br />完整諮詢陪你看清整段脈絡</h2><p>如果你正卡在反覆拉扯的感情、工作選擇或一個遲遲做不了的決定，我會從你的真實處境整理問題，陪你看見盲點、關係動態與下一步，而不是只告訴你一個結果。</p></div>
        <div className="consult-card"><span>適合現在的你，如果——</span><ul><li>同一個問題已經反覆困擾很久</li><li>知道要放下，情緒卻一直被拉回去</li><li>需要的不只是答案，而是具體方向</li></ul><a href="https://www.instagram.com/zolacoco_tarot" target="_blank" rel="noreferrer">預約一對一塔羅諮詢 <b>↗</b></a><small>由 Zola 親自回覆，依你的實際狀況整理適合的諮詢方式</small></div>
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
