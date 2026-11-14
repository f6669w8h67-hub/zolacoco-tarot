"use client";

// 七日塔羅筆記. Everyone can keep notes on this device (localStorage, as before). A member Zola marked
// 陪跑中 can also tick 「同步給 Zola」 for a round: that round's notes are then saved to Neon, where Zola
// reads them and replies day by day (/zola-admin/coaching). Nothing on this device is ever uploaded by
// itself: a day's local note goes into a synced round only when the member taps 帶入 and then saves.
// Used on the home page (inside 內在探索) and on /journal (陪跑 members need no VIP months).
import Link from "next/link";
import { useEffect, useState } from "react";

import { useIdentityKey } from "@/app/auth-identity";
import { PracticeCard } from "@/app/practice-card";
import { tarotCards } from "@/app/tarot-data";
import type { PublicCycle, PublicEntry } from "@/lib/coaching-input";
import { JOURNAL_DAYS, JOURNAL_PROMPT_VERSION, journalCardIds, journalPromptFor } from "@/lib/journal-prompts";
import "./journal-sync.css";

export const JOURNAL_STORAGE_KEY = "zolacoco-journal-notes-v1";

type Place = "home" | "page";
type Mode = "local" | "synced";
type Journal = { canWrite: boolean; cycles: PublicCycle[]; entries: PublicEntry[] };
type Remote = { state: "loading" } | { state: "signed-out" } | { state: "closed" } | { state: "error" } | ({ state: "ready" } & Journal);
type Notice = { tone: "ok" | "error"; text: string } | null;

function readLocalNotes(): Record<number, string> {
  if (typeof window === "undefined") return {};
  try {
    const value = JSON.parse(localStorage.getItem(JOURNAL_STORAGE_KEY) ?? "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<number, string> : {};
  } catch {
    return {};
  }
}

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  let data: Record<string, unknown> | null = null;
  try { data = await response.json(); } catch { data = null; }
  return { status: response.status, ok: response.ok, data };
}

function message(data: Record<string, unknown> | null, fallback: string) {
  return typeof data?.error === "string" && /[^\x00-\x7f]/.test(data.error) ? data.error : fallback;
}

function roundState(cycle: PublicCycle, written: number) {
  if (!cycle.shared) return "已停止同步，Zola 看不到這一輪";
  return cycle.completedAt ? "七天都寫完了" : `已寫 ${written}／${JOURNAL_DAYS} 天`;
}

export function JournalTool({ place }: { place: Place }) {
  // A different account gets a fresh journal: nothing synced from the previous person stays on screen.
  const identityKey = useIdentityKey();
  return <JournalBody key={identityKey ?? "loading"} place={place} waiting={identityKey === null} />;
}

function JournalBody({ place, waiting }: { place: Place; waiting: boolean }) {
  const [remote, setRemote] = useState<Remote>({ state: "loading" });
  // Replies that were new when the journal opened keep their 新回覆 mark while she reads them.
  const [freshReplies, setFreshReplies] = useState<ReadonlySet<string>>(() => new Set());
  const [chosenMode, setChosenMode] = useState<Mode | null>(null);
  const [day, setDay] = useState(0);
  const [localNotes, setLocalNotes] = useState(readLocalNotes);
  const [localSave, setLocalSave] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [roundId, setRoundId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [conflicts, setConflicts] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState<"" | "start" | "save" | "stop">("");
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmStop, setConfirmStop] = useState(false);

  useEffect(() => {
    if (waiting) return;
    let active = true;
    fetch("/api/coaching/journal", { cache: "no-store" })
      .then(async (response) => {
        if (!active) return;
        if (response.status === 401) { setRemote({ state: "signed-out" }); return; }
        // Suspended, or membership not set up (local preview): only this device's notes.
        if (response.status === 403 || response.status === 503) { setRemote({ state: "closed" }); return; }
        if (!response.ok) { setRemote({ state: "error" }); return; }
        const data = await response.json() as Journal;
        if (!active) return;
        setFreshReplies(new Set(data.entries.filter((item) => item.feedback && item.feedbackUnread).map((item) => item.id)));
        setRemote({ state: "ready", canWrite: data.canWrite === true, cycles: data.cycles, entries: data.entries });
      })
      .catch(() => { if (active) setRemote({ state: "error" }); });
    return () => { active = false; };
  }, [waiting]);

  const ready = remote.state === "ready" ? remote : null;
  const cycles = ready?.cycles ?? [];
  const syncAvailable = Boolean(ready && (ready.canWrite || cycles.length > 0));
  const mode: Mode = place === "page" ? "synced" : !syncAvailable ? "local" : chosenMode ?? (ready?.canWrite ? "synced" : "local");
  const openRound = cycles.find((cycle) => cycle.shared && !cycle.completedAt) ?? null;
  const round = (roundId ? cycles.find((cycle) => cycle.id === roundId) : undefined) ?? openRound ?? cycles[0] ?? null;
  const roundEntries = round && ready ? ready.entries.filter((item) => item.cycleId === round.id) : [];
  const entry = roundEntries.find((item) => item.day === day + 1) ?? null;
  const key = round ? `${round.id}:${day + 1}` : "";
  const editable = Boolean(ready?.canWrite && round?.shared);
  const syncedText = drafts[key] ?? entry?.content ?? "";
  const showConsent = mode === "synced" && Boolean(ready?.canWrite) && !openRound;
  const card = tarotCards.find((item) => item.id === journalCardIds[day]) ?? tarotCards[day];
  const prompt = journalPromptFor(mode === "synced" && entry ? entry.promptVersion : JOURNAL_PROMPT_VERSION, day + 1);

  // Reading a reply marks it read (only the owner can; the server checks). The mark stays for now.
  const unreadId = mode === "synced" && entry?.feedback && entry.feedbackUnread ? entry.id : null;
  useEffect(() => {
    if (!unreadId) return;
    postJson("/api/coaching/journal/seen", { entryId: unreadId })
      .then(({ ok }) => {
        if (!ok) return;
        setRemote((current) => current.state !== "ready" ? current : { ...current, entries: current.entries.map((item) => item.id === unreadId ? { ...item, feedbackUnread: false } : item) });
      })
      .catch(() => { /* stays unread; tried again next time */ });
  }, [unreadId]);

  function updateJournal(change: (journal: Journal) => Partial<Journal>) {
    setRemote((current) => current.state !== "ready" ? current : { ...current, ...change(current) });
  }

  function putCycle(cycle: PublicCycle) {
    updateJournal((journal) => ({ cycles: [cycle, ...journal.cycles.filter((item) => item.id !== cycle.id)].sort((a, b) => b.number - a.number) }));
  }

  function putEntry(next: PublicEntry) {
    updateJournal((journal) => ({ entries: [...journal.entries.filter((item) => item.id !== next.id && !(item.cycleId === next.cycleId && item.day === next.day)), next] }));
  }

  function pickDay(index: number) {
    setDay(index);
    setNotice(null);
    setLocalSave("idle");
    setConfirmStop(false);
  }

  function saveLocal() {
    const content = (localNotes[day] ?? "").trim();
    if (!content) return;
    setLocalSave("saving");
    try {
      const next = { ...localNotes, [day]: content };
      localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(next));
      setLocalNotes(next);
      setLocalSave("saved");
    } catch { setLocalSave("error"); }
  }

  async function startRound() {
    if (!consent || busy) return;
    setBusy("start"); setNotice(null);
    try {
      const { ok, data } = await postJson("/api/coaching/journal", { action: "start", consent: true });
      const cycle = data?.cycle as PublicCycle | undefined;
      if (!ok || !cycle) { setNotice({ tone: "error", text: message(data, "還沒有開始同步，請再試一次。") }); return; }
      putCycle(cycle);
      setRoundId(cycle.id);
      setConsent(false);
      setDay(0);
      setNotice({ tone: "ok", text: `已開始第 ${cycle.number} 輪。之後在這裡儲存的筆記會同步給 Zola。` });
    } catch {
      setNotice({ tone: "error", text: "網路不穩，還沒有確認開始同步，請重新整理後再看看。" });
    } finally {
      setBusy("");
    }
  }

  async function saveSynced() {
    if (!round || !editable || busy) return;
    const content = syncedText.trim();
    if (!content) return;
    const draftKey = key;
    setBusy("save"); setNotice(null);
    try {
      const { status, ok, data } = await postJson("/api/coaching/journal", { action: "save", cycleId: round.id, day: day + 1, content, expectedRevision: entry?.revision ?? null });
      const saved = data?.entry as PublicEntry | undefined;
      if (status === 409 && saved) {
        // Another tab saved this day first. Keep what she is writing; show the other version beside it.
        putEntry(saved);
        setDrafts((current) => ({ ...current, [draftKey]: syncedText }));
        setConflicts((current) => ({ ...current, [draftKey]: saved.content }));
        setNotice({ tone: "error", text: "這一天在另一個視窗已經更新過。下方是另一個視窗存的版本；妳正在寫的內容還在，確認後再按儲存。" });
        return;
      }
      if (status === 409) {
        putCycle({ ...round, shared: false });
        setNotice({ tone: "error", text: message(data, "這一輪已經停止同步，沒有再傳給 Zola。") });
        return;
      }
      if (!ok || !saved) { setNotice({ tone: "error", text: message(data, "筆記還沒有存好，請再試一次。") }); return; }
      putEntry(saved);
      if (data?.cycle) putCycle(data.cycle as PublicCycle);
      setDrafts((current) => { const next = { ...current }; delete next[draftKey]; return next; });
      setConflicts((current) => { const next = { ...current }; delete next[draftKey]; return next; });
      setNotice({ tone: "ok", text: "已儲存並同步給 Zola。" });
    } catch {
      setNotice({ tone: "error", text: "網路不穩，筆記還沒有確認存好。內容還在框裡，請稍後再按一次儲存。" });
    } finally {
      setBusy("");
    }
  }

  async function stopRound() {
    if (!round || busy) return;
    setBusy("stop"); setNotice(null);
    try {
      const { ok, data } = await postJson("/api/coaching/journal", { action: "stop", cycleId: round.id });
      const cycle = data?.cycle as PublicCycle | undefined;
      if (!ok || !cycle) { setNotice({ tone: "error", text: message(data, "還沒有停止同步，請再試一次。") }); return; }
      putCycle(cycle);
      setConfirmStop(false);
      setNotice({ tone: "ok", text: `已停止同步第 ${cycle.number} 輪，Zola 不會再看到這一輪。` });
    } catch {
      setNotice({ tone: "error", text: "網路不穩，還沒有確認停止同步，請重新整理後再看看。" });
    } finally {
      setBusy("");
    }
  }

  if (place === "page" && (remote.state !== "ready" || !syncAvailable)) {
    const copy = {
      loading: ["正在打開七日陪跑筆記…", "請稍候。"],
      "signed-out": ["這裡是七日陪跑筆記", "由 Zola 開通陪跑後才能使用。已經在陪跑中的話，請先登入。"],
      closed: ["這裡是七日陪跑筆記", "由 Zola 開通陪跑後才能使用。"],
      error: ["暫時打不開陪跑筆記", "可能是網路不穩，請稍後重新整理。"],
      ready: ["這裡是七日陪跑筆記", "由 Zola 開通陪跑後才能使用。一般的七日塔羅筆記在首頁的內在探索，會存在妳自己的裝置上。"],
    }[remote.state];
    return <div className="journal-tool js-state" aria-busy={remote.state === "loading" || undefined}>
      <h3>{copy[0]}</h3>
      <p>{copy[1]}</p>
      {remote.state === "signed-out" ? <Link className="tool-primary" href="/sign-in?redirect_url=%2Fjournal">登入</Link> : null}
      {remote.state === "closed" || remote.state === "error" || remote.state === "ready" ? <Link className="js-link" href="/account">回到會員中心</Link> : null}
    </div>;
  }

  const synced = mode === "synced";
  const written = roundEntries.length;

  return <div className="journal-tool">
    {place === "home" && syncAvailable ? <div className="js-mode" role="group" aria-label="筆記要存在哪裡">
      <button type="button" className={synced ? "active" : ""} aria-pressed={synced} onClick={() => { setChosenMode("synced"); setNotice(null); }}>同步給 Zola</button>
      <button type="button" className={synced ? "" : "active"} aria-pressed={!synced} onClick={() => { setChosenMode("local"); setNotice(null); }}>只存在這台裝置</button>
    </div> : null}
    <div className="tool-progress"><span>SEVEN-DAY JOURNAL</span><b>DAY {day + 1}</b></div>

    {synced && round ? <div className="js-round">
      {cycles.length > 1
        ? <label><span className="js-visually-hidden">選擇要看的一輪</span><select value={round.id} onChange={(event) => { setRoundId(event.target.value); setNotice(null); setConfirmStop(false); }}>
            {cycles.map((cycle) => <option key={cycle.id} value={cycle.id}>第 {cycle.number} 輪{cycle.shared ? cycle.completedAt ? "（已完成）" : "（進行中）" : "（已停止同步）"}</option>)}
          </select></label>
        : <b>第 {round.number} 輪</b>}
      <span>{roundState(round, written)}</span>
    </div> : null}

    {showConsent ? <div className="js-consent">
      <b>{cycles.length === 0 ? "和 Zola 一起寫這七天" : "開始新的一輪"}</b>
      <p>勾選同意後，這一輪在這裡儲存的筆記會同步給 Zola，她會逐天閱讀並回覆妳。只有妳和 Zola 看得到。</p>
      <p className="js-small">這台裝置上原本的筆記不會自動上傳；想放進這一輪的那一天，可以自己按「帶入」再儲存。</p>
      <label className="js-check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>我同意把這一輪的七日筆記同步給 Zola</span></label>
      <button type="button" className="tool-primary" disabled={!consent || Boolean(busy)} onClick={() => void startRound()}>{busy === "start" ? "開始中…" : "開始同步這一輪"}</button>
    </div> : null}

    {!synced || round ? <>
      <div className="journal-card-row"><PracticeCard card={card} /><div className="journal-date"><i>{day + 1}</i><span>今天的內在提問</span></div></div>
      <h3>{prompt}</h3>
      <div className="journal-lenses"><span>先看見畫面</span><span>再辨認感受</span><span>最後連回生活</span></div>
    </> : null}

    {!synced ? <>
      <textarea value={localNotes[day] ?? ""} onChange={(event) => { setLocalNotes((notes) => ({ ...notes, [day]: event.target.value })); setLocalSave("idle"); }} aria-label="寫下今天的內在筆記" placeholder="不用急著寫得完整，先記下第一個浮現的念頭……" />
      <div className="day-picker">{Array.from({ length: JOURNAL_DAYS }, (_, index) => <button aria-label={`第 ${index + 1} 天`} className={day === index ? "active" : ""} onClick={() => pickDay(index)} key={index}>{index + 1}</button>)}</div>
      <button className="tool-primary journal-save" disabled={localSave === "saving" || !(localNotes[day] ?? "").trim()} onClick={saveLocal}>{localSave === "saving" ? "儲存中…" : localSave === "saved" ? "已儲存 ✓" : localSave === "error" ? "存檔失敗，請再試一次" : "儲存今天的筆記"}</button>
      <p className="privacy-note">筆記會保存在目前使用的手機或電腦瀏覽器中，重新開啟網站仍可繼續查看，不會公開顯示。</p>
    </> : round ? <>
      <textarea value={syncedText} readOnly={!editable} onChange={(event) => { const value = event.target.value; setDrafts((current) => ({ ...current, [key]: value })); setNotice(null); }} aria-label={editable ? "寫下今天的陪跑筆記" : "這一天的陪跑筆記（唯讀）"} placeholder={editable ? "不用急著寫得完整，先記下第一個浮現的念頭……" : "這一天沒有寫下筆記。"} />
      {entry?.feedback ? <div className="js-reply">
        <b>Zola 的回覆{freshReplies.has(entry.id) ? <i className="js-new">新回覆</i> : null}</b>
        <p>{entry.feedback}</p>
        {entry.feedbackOutdated ? <small>這則回覆寫於妳修改這一天的筆記之前。</small> : null}
      </div> : entry && round.shared ? <p className="js-waiting">已同步給 Zola，她回覆後會出現在這裡。</p> : null}
      {editable && !entry && drafts[key] === undefined && (localNotes[day] ?? "").trim()
        ? <button type="button" className="js-link" onClick={() => setDrafts((current) => ({ ...current, [key]: (localNotes[day] ?? "").trim() }))}>帶入這台裝置上的第 {day + 1} 天筆記</button>
        : null}
      {conflicts[key] !== undefined ? <div className="js-conflict">
        <b>另一個視窗存的版本</b>
        <p>{conflicts[key]}</p>
        <button type="button" className="js-link" onClick={() => {
          setDrafts((current) => { const next = { ...current }; delete next[key]; return next; });
          setConflicts((current) => { const next = { ...current }; delete next[key]; return next; });
          setNotice(null);
        }}>改用這個版本</button>
      </div> : null}
      <div className="day-picker">{Array.from({ length: JOURNAL_DAYS }, (_, index) => {
        const item = roundEntries.find((value) => value.day === index + 1);
        const unread = Boolean(item?.feedback && item.feedbackUnread);
        return <button aria-label={`第 ${index + 1} 天${item ? "，已寫" : ""}${unread ? "，有新回覆" : ""}`} className={[day === index ? "active" : "", item ? "js-written" : "", unread ? "js-unread" : ""].filter(Boolean).join(" ")} onClick={() => pickDay(index)} key={index}>{index + 1}</button>;
      })}</div>
      {editable ? <button className="tool-primary journal-save" disabled={Boolean(busy) || !syncedText.trim() || syncedText.trim() === (entry?.content ?? "")} onClick={() => void saveSynced()}>{busy === "save" ? "同步中…" : "儲存並同步給 Zola"}</button> : null}
    </> : null}

    {notice ? <p className={`js-notice is-${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p> : null}

    {synced && round?.shared ? confirmStop ? <div className="js-stop">
      <p>停止同步後，Zola 就看不到這一輪的筆記，也不能再回覆；她先前已經讀過的內容無法收回。妳自己仍看得到這一輪。確定停止嗎？</p>
      <div><button type="button" className="js-danger" disabled={Boolean(busy)} onClick={() => void stopRound()}>{busy === "stop" ? "停止中…" : "停止同步"}</button><button type="button" className="js-link" onClick={() => setConfirmStop(false)}>先不要</button></div>
    </div> : <button type="button" className="js-link js-stop-link" onClick={() => setConfirmStop(true)}>停止同步這一輪</button> : null}

    {synced ? <p className="privacy-note">同步的筆記存在 Zolacoco 的會員資料庫，只有妳和 Zola 看得到；這台裝置上的筆記不會自動上傳。</p> : null}
  </div>;
}
