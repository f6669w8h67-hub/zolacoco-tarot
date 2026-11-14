"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import "../styles/pearl-page.css";
import "./awareness.css";
import { loadMemberProfile } from "@/lib/member-client";
import {
  awarenessAccess,
  currentSession,
  readRecords,
  removeRecord,
  shareFileName,
  taipeiDate,
  upsertRecord,
  writeRecords,
  type AwarenessRecord,
  type AwarenessSession,
} from "@/lib/awareness-records";
import { useIdentityKey } from "../auth-identity";
import { AWARENESS_BACK, breakLines, cardArt, drawCard, phrases, themeLabel, type AwarenessCard } from "./awareness-data";
import { renderShareCard } from "./share-card";

// Zolacoco 覺察卡 (Zola, 2026-11-14): its own public page. Shuffle, then one card turns over.
// Everyone can draw, read, answer in their head and save the share image; members with access
// can also write an answer and keep it in 「我的覺察紀錄」 here and in 我的存檔 (/admin).

type Phase = "idle" | "shuffling" | "revealed";
type Draw = { id: string; card: AwarenessCard };

/** Shuffling is one breath with the glow behind the deck: 吸氣 for half, 吐氣 for half (awareness.css, 2.8s). */
const BREATH_MS = 2800;
/** The deck grows from its shuffling size to the full card as it turns (awareness.css, .55s). */
const GROW_MS = 600;

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function Phrases({ text }: { text: string }) {
  return <>{phrases(text).map((part, index) => <span className="aw-phrase" key={index}>{part}</span>)}</>;
}

function CardFace({ card }: { card: AwarenessCard }) {
  const lines = breakLines(card.line, 12);
  return <span className="aw-face">
    <img src={cardArt(card)} alt="" width={640} height={1024} />
    <span className={`aw-ribbon lines-${lines.length}`}>{lines.map((line, index) => <span className="aw-ribbon-line" key={index}>{line}</span>)}</span>
  </span>;
}

function dateText(iso: string) {
  return taipeiDate(new Date(iso)).replaceAll("-", ".");
}

export default function AwarenessPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [flipped, setFlipped] = useState(false);
  const [draw, setDraw] = useState<Draw | null>(null);
  const [announce, setAnnounce] = useState("");
  const [breath, setBreath] = useState<"in" | "out">("in");
  const timers = useRef<number[]>([]);
  const deckRef = useRef<HTMLDivElement>(null);

  // Member access and records belong to the person signed in now. When she signs out or another
  // member signs in on the same open page, the old session stops counting at once (currentSession),
  // her unsaved answer is cleared, and a late answer from the server for the old person is ignored.
  const identityKey = useIdentityKey();
  const [session, setSession] = useState<AwarenessSession | null>(null);
  const { access, memberId, records } = currentSession(identityKey, session);
  const [answer, setAnswer] = useState("");
  const [completed, setCompleted] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState(false);
  const [openRecord, setOpenRecord] = useState<string | null>(null);
  const [seenIdentity, setSeenIdentity] = useState(identityKey);
  if (seenIdentity !== identityKey) {
    setSeenIdentity(identityKey);
    setAnswer("");
    setCompleted(false);
    setSaveState("idle");
    setConfirmDelete(null);
    setDeleteError(false);
    setOpenRecord(null);
  }

  const [share, setShare] = useState<{ url: string; file: File } | null>(null);
  const [shareState, setShareState] = useState<"idle" | "making" | "error">("idle");

  useEffect(() => () => { timers.current.forEach((id) => window.clearTimeout(id)); }, []);
  useEffect(() => () => { if (share) URL.revokeObjectURL(share.url); }, [share]);

  // Who is visiting decides the part below the card. Runs again for every new person.
  useEffect(() => {
    if (identityKey === null || identityKey === "signed-out") return;
    let active = true;
    void loadMemberProfile().then((result) => {
      if (!active) return;
      if (!result.ok) {
        setSession({ key: identityKey, access: result.failure === "UNAUTHENTICATED" ? "guest" : "unavailable", memberId: null, records: [] });
        return;
      }
      const state = awarenessAccess(result.member);
      const id = result.member.id ? String(result.member.id) : null;
      setSession({ key: identityKey, access: state, memberId: id, records: state === "member" && id ? readRecords(localStorage, id) : [] });
    });
    return () => { active = false; };
  }, [identityKey]);

  const later = useCallback((fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); }, []);

  function startDraw() {
    if (phase === "shuffling") return;
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    const card = drawCard(draw?.card.id);
    setDraw({ id: makeId(), card });
    setAnswer("");
    setCompleted(false);
    setSaveState("idle");
    setShare(null);
    setShareState("idle");
    setFlipped(false);
    setBreath("in");
    setAnnounce("洗牌中，跟著牌後面的光慢慢吸氣、吐氣");
    // Keep the deck on screen: while it shuffles (the button sits below it, so on a short phone the
    // deck may be partly above the screen), and again once the turned card has grown to full size.
    const keepDeckInView = () => {
      const deck = deckRef.current;
      if (!deck) return;
      const box = deck.getBoundingClientRect();
      if (box.top < 64 || box.bottom > window.innerHeight) deck.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "center" });
    };
    const reveal = () => {
      setPhase("revealed");
      setFlipped(true);
      setAnnounce(`妳抽到了「${card.name}」：${card.line}`);
      if (reducedMotion()) keepDeckInView();
      else later(keepDeckInView, GROW_MS);
    };
    if (reducedMotion()) { setPhase("revealed"); reveal(); return; }
    setPhase("shuffling");
    keepDeckInView();
    later(() => setBreath("out"), BREATH_MS / 2);
    later(reveal, BREATH_MS);
  }

  /** Saves first; the list on screen changes only when the browser really kept it. */
  function persist(next: AwarenessRecord[]) {
    if (!memberId || !session || session.key !== identityKey) return false;
    if (!writeRecords(localStorage, memberId, next)) return false;
    setSession({ ...session, records: next });
    return true;
  }

  function saveRecord() {
    if (!draw || access !== "member" || !memberId) return;
    const text = answer.trim();
    if (!text && !completed) return;
    const { card } = draw;
    const record: AwarenessRecord = {
      id: draw.id,
      createdAt: records.find((item) => item.id === draw.id)?.createdAt ?? new Date().toISOString(),
      deck: "zolacoco-awareness",
      cardId: card.id,
      cardNumber: card.number,
      theme: card.theme,
      name: card.name,
      line: card.line,
      question: card.question,
      answer: text.slice(0, 1000),
      practice: card.practice,
      completed,
    };
    if (!persist(upsertRecord(records, record))) { setSaveState("error"); return; }
    setSaveState("saved");
  }

  async function makeShare() {
    if (!draw || shareState === "making") return;
    setShareState("making");
    try {
      const blob = await renderShareCard(draw.card, dateText(new Date().toISOString()));
      const file = new File([blob], shareFileName(draw.card.number), { type: "image/png" });
      setShare({ url: URL.createObjectURL(blob), file });
      setShareState("idle");
    } catch {
      setShareState("error");
    }
  }

  async function sendShare() {
    if (!share) return;
    const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
    if (nav.share && nav.canShare?.({ files: [share.file] })) {
      try { await nav.share({ files: [share.file], title: "Zolacoco 覺察卡" }); return; } catch { /* closed the sheet */ return; }
    }
    const link = document.createElement("a");
    link.href = share.url;
    link.download = share.file.name;
    link.click();
  }

  const card = draw?.card ?? null;
  const saved = Boolean(draw && records.some((item) => item.id === draw.id));
  const canSave = Boolean(answer.trim() || completed);

  return <main className="awareness-page pearl-page">
    <header className="aw-hero">
      <p className="aw-kicker">Zolacoco Awareness Cards</p>
      <h1>抽一張 Zolacoco 覺察卡</h1>
      <p className="aw-lead">洗牌後抽一張此刻的覺察卡。透過一句提醒、一段解析、一個提問和一個小練習，陪妳重新靠近自己的感受。</p>
    </header>

    <section className="aw-stage" aria-label="抽牌">
      <p className="aw-calm">{phase === "idle" ? "先慢慢呼吸一次，想想此刻的自己。沒有正確答案，也不需要急著改變什麼。" : phase === "shuffling" ? (breath === "in" ? "吸氣……" : "吐氣……") : "這是妳此刻抽到的覺察卡。"}</p>
      <div className={`aw-deck is-${phase}`} ref={deckRef}>
        <span className="aw-breath" aria-hidden="true" />
        <span className="aw-deck-back b1" aria-hidden="true"><img src={AWARENESS_BACK} alt="" /></span>
        <span className="aw-deck-back b2" aria-hidden="true"><img src={AWARENESS_BACK} alt="" /></span>
        <span className={`aw-flip${flipped ? " is-flipped" : ""}`}>
          <span className="aw-flip-back" aria-hidden="true"><img src={AWARENESS_BACK} alt="" /></span>
          <span className="aw-flip-front">{card ? <CardFace card={card} /> : null}</span>
        </span>
      </div>
      <p className="sr-only" aria-live="polite">{announce}</p>
      <button type="button" className="aw-primary" onClick={startDraw} disabled={phase === "shuffling"}>
        {phase === "idle" ? "洗牌，抽一張" : phase === "shuffling" ? "洗牌中…" : "再抽一張"}
      </button>
      <p className="aw-note">不限次數，想抽的時候都可以回來。</p>
    </section>

    {card && phase === "revealed" ? <section className="aw-result" aria-labelledby="aw-card-name">
      <p className="aw-theme">{themeLabel(card.theme)}</p>
      <h2 id="aw-card-name" tabIndex={-1}>{card.name}</h2>
      <p className="aw-line"><Phrases text={card.line} /></p>
      <div className="aw-panel">
        <h3>解析</h3>
        <p>{card.reading}</p>
      </div>
      <div className="aw-panel aw-question">
        <h3>給妳的提問</h3>
        <p>{card.question}</p>
      </div>
      <div className="aw-panel aw-practice">
        <h3>小練習</h3>
        <p>{card.practice}</p>
      </div>

      <div className="aw-write">
        {access === "loading" ? null : access === "member" ? <>
          <h3>寫下這次的覺察</h3>
          <label className="sr-only" htmlFor="aw-answer">我的回答</label>
          <textarea id="aw-answer" value={answer} maxLength={1000} placeholder="不用寫得完整，先記下第一個浮現的念頭……"
            onChange={(event) => { setAnswer(event.target.value); setSaveState("idle"); }} />
          <label className="aw-check"><input type="checkbox" checked={completed} onChange={(event) => { setCompleted(event.target.checked); setSaveState("idle"); }} />我完成了這個小練習</label>
          <button type="button" className="aw-primary" onClick={saveRecord} disabled={!canSave || (saved && saveState === "saved")}>
            {saved && saveState === "saved" ? "已儲存 ✓" : saved ? "更新這次覺察" : "儲存這次覺察"}
          </button>
          {saveState === "saved" ? <p className="aw-status" role="status">已存進「我的覺察紀錄」，也可以在<Link href="/admin">我的存檔</Link>看到。</p> : null}
          {saveState === "error" ? <p className="aw-status is-error" role="alert">這台裝置暫時無法儲存，請確認瀏覽器沒有開無痕模式後再試一次。</p> : null}
        </> : access === "unavailable" ? <div className="aw-member-note">
          <h3>暫時無法確認會員狀態</h3>
          <p>可能是網路不穩，請稍後重新整理頁面。抽牌、解析、提問和小練習現在都可以照常使用。</p>
        </div> : access === "pending" ? <div className="aw-member-note">
          <h3>會員尚待 Zola 開通</h3>
          <p>開通後就能在這裡寫下回答，並收藏每一次的覺察紀錄。抽牌、解析、提問和小練習現在都可以自由使用。</p>
          <Link className="aw-secondary" href="/account">查看會員狀態</Link>
        </div> : <div className="aw-member-note">
          <h3>想把這份覺察留下來嗎？</h3>
          <p>{access === "expired" ? "妳的會員使用期限已到。續約後就能繼續寫下回答、收藏覺察紀錄；抽牌、解析、提問和小練習仍然可以自由使用。" : "覺察卡的抽牌、解析、提問與小練習都可以自由使用。如果妳已經有 Zolacoco 會員使用權限，登入後就能寫下回答並收藏紀錄。"}</p>
          <div className="aw-actions">
            {access === "guest" ? <Link className="aw-primary" href="/sign-in?redirect_url=%2Fawareness">登入會員</Link> : null}
            <Link className="aw-secondary" href="/account">了解會員使用方式</Link>
          </div>
        </div>}
      </div>

      <div className="aw-share">
        <h3>存成 IG 限動圖</h3>
        {share ? <>
          <img className="aw-share-preview" src={share.url} alt={`${card.name} 覺察卡分享圖`} />
          <div className="aw-actions">
            <button type="button" className="aw-primary" onClick={() => void sendShare()}>儲存或分享圖片</button>
          </div>
          <p className="aw-note">iPhone 也可以長按上方圖片，選「加入照片」。</p>
        </> : <button type="button" className="aw-secondary" onClick={() => void makeShare()} disabled={shareState === "making"}>
          {shareState === "making" ? "製作中…" : "製作分享圖"}
        </button>}
        {shareState === "error" ? <p className="aw-status is-error" role="alert">分享圖沒有做成功，請再試一次。</p> : null}
      </div>
    </section> : null}

    {access === "member" ? <section className="aw-records" aria-labelledby="aw-records-title">
      <h2 id="aw-records-title">我的覺察紀錄</h2>
      <p className="aw-note">紀錄保存在這台裝置的瀏覽器，共 {records.length} 筆。換手機前，可以到<Link href="/admin">我的存檔</Link>下載備份。</p>
      {records.length === 0 ? <p className="aw-empty">還沒有紀錄。抽一張牌、寫下回答後按「儲存這次覺察」，就會出現在這裡。</p> : <ul>
        {records.map((item) => <li key={item.id} className={openRecord === item.id ? "is-open" : ""}>
          <button type="button" className="aw-record-head" aria-expanded={openRecord === item.id} onClick={() => setOpenRecord(openRecord === item.id ? null : item.id)}>
            <img src={cardArt({ number: item.cardNumber })} alt="" loading="lazy" />
            <span><small>{dateText(item.createdAt)}・{themeLabel(item.theme).split("・")[0]}</small><b>{item.name}</b><em>{item.line}</em></span>
          </button>
          {openRecord === item.id ? <div className="aw-record-body">
            <p><b>提問</b>{item.question}</p>
            {item.answer ? <p><b>我的回答</b>{item.answer}</p> : null}
            <p><b>小練習</b>{item.practice}{item.completed ? <span className="aw-done">已完成</span> : null}</p>
            {confirmDelete === item.id ? <div className="aw-actions">
              <button type="button" className="aw-danger" onClick={() => {
                if (!persist(removeRecord(records, item.id))) { setDeleteError(true); return; }
                setDeleteError(false); setConfirmDelete(null); setOpenRecord(null);
              }}>確定刪除</button>
              <button type="button" className="aw-secondary" onClick={() => { setConfirmDelete(null); setDeleteError(false); }}>取消</button>
            </div> : <button type="button" className="aw-text-button" onClick={() => setConfirmDelete(item.id)}>刪除這筆紀錄</button>}
            {confirmDelete === item.id && deleteError ? <p className="aw-status is-error" role="alert">這筆紀錄沒有刪除成功，請再試一次。</p> : null}
          </div> : null}
        </li>)}
      </ul>}
    </section> : null}

    <footer className="aw-foot">
      <p>Zolacoco 覺察卡是一套以接納與承諾療法（ACT）的核心理念為靈感所設計的自我覺察練習卡，透過提問與小行動陪妳整理當下感受，不屬於心理諮商、心理治療或醫療診斷。</p>
      <Link href="/#explore">回到內在探索</Link>
    </footer>
  </main>;
}
