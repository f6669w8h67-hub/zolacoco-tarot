"use client";

// 心理測驗 (Zola only): drop in a quiz and it goes up on the site at its IG time. A 第一眼測驗 HTML file carries
// everything (painting, the four things, readings, hook). A 三選一 quiz needs its five downloaded cards
// (_p1～_p5) and the A～D text, which the generator HTML also carries. Pictures are turned into WebP here,
// in her browser, before they are sent; data from /api/quizzes/admin (requireAdmin).
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CHOICES, FIRST_SIGHT_THEMES, QUIZ_COLORS, RAINBOW, type Choice, type FirstSightTheme, type Quiz, type QuizColor,
  ZOLA_LINE_URL, abcCodeInfo, firstSightCode, firstSightFromState, isPublished, isZolaLine, parseAbcCaption, readGeneratorHtml, toneColor,
} from "@/lib/quiz";
import "./quiz-admin.css";

type FirstSightDraft = {
  kind: "first-sight"; code: string; title: string; tone: FirstSightTheme; publishAt: string;
  painting: string; blur: string | null; paper: string | null; state: ReturnType<typeof firstSightFromState>;
};
type AbcDraft = {
  kind: "abc"; code: string; title: string; tone: QuizColor; publishAt: string;
  cards: (File | null)[]; choices: (File | null)[]; caption: string;
  analysis: Record<Choice, string>; hook: string;
};
type Draft = FirstSightDraft | AbcDraft;

const STATUS_TEXT = { draft: "草稿", scheduled: "排程中", live: "已公開" };

function taipeiInput(iso: string | null) {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour") === "24" ? "00" : get("hour")}:${get("minute")}`;
}
function fromTaipeiInput(value: string) {
  const at = Date.parse(`${value}:00+08:00`);
  return Number.isFinite(at) ? new Date(at).toISOString() : "";
}
function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

/** A picture (File or data: URL) as WebP (JPEG where the browser cannot write WebP), at most `width` wide. */
async function toWebp(source: File | string, width: number): Promise<Blob> {
  const blob = typeof source === "string" ? await (await fetch(source)).blob() : source;
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, width / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const encode = (type: string, quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  const webp = await encode("image/webp", 0.86);
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await encode("image/jpeg", 0.88);
  if (!jpeg) throw new Error("圖片轉檔失敗");
  return jpeg;
}

async function upload(code: string, slot: string, image: Blob) {
  const form = new FormData();
  form.set("code", code);
  form.set("slot", slot);
  form.set("file", new File([image], `${slot}.${image.type === "image/webp" ? "webp" : "jpg"}`, { type: image.type }));
  const response = await fetch("/api/quizzes/admin/image", { method: "POST", body: form });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.url !== "string") throw new Error(data.error ?? "圖片上傳失敗");
  return data.url as string;
}

/** The colour after the newest quiz's, for a new day (三篇一組，照彩虹順序輪). */
function nextColor(quizzes: Quiz[], code: string): QuizColor {
  const day = code.slice(0, 8);
  const sameDay = quizzes.find((quiz) => quiz.kind === "abc" && quiz.code.slice(0, 8) === day);
  if (sameDay) return sameDay.tone as QuizColor;
  const latest = quizzes.find((quiz) => quiz.kind === "abc" && quiz.code < code);
  if (!latest) return "red";
  return RAINBOW[(RAINBOW.indexOf(latest.tone as QuizColor) + 1) % RAINBOW.length];
}

export default function QuizAdminPage() {
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState("");

  async function refresh() {
    try {
      const response = await fetch("/api/quizzes/admin", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error === "FORBIDDEN" ? "只有 Zola 可以使用這一頁。" : "測驗清單讀不到，請重新整理。");
      setQuizzes(data.quizzes);
      setLoadError("");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "測驗清單讀不到，請重新整理。");
    }
  }

  useEffect(() => {
    const frame = requestAnimationFrame(() => void refresh());
    return () => cancelAnimationFrame(frame);
  }, []);

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setNotice(null);
    const files = [...list];
    const html = files.find((file) => /\.html?$/i.test(file.name));
    const images = files.filter((file) => file.type.startsWith("image/"));
    if (html) {
      const read = readGeneratorHtml(await html.text());
      if (!read) { setNotice({ tone: "error", text: "這個 HTML 看起來不是心理測驗的產生器檔。" }); return; }
      if (read.kind === "first-sight") {
        const state = firstSightFromState(read.state, read.embed.ratio);
        const made = firstSightCode(state.date, state.serial);
        if (!state.ok || !made || !read.embed.main) { setNotice({ tone: "error", text: "第一眼測驗少了主畫、日期或四樣東西的內容，請在產生器裡補齊後再存一次。" }); return; }
        setDraft({ kind: "first-sight", code: made.code, title: state.title, tone: state.theme, publishAt: made.publishAt ?? new Date().toISOString(),
          painting: read.embed.main, blur: read.embed.blur ?? null, paper: read.paper, state });
        return;
      }
      const code = read.code ?? "";
      const info = abcCodeInfo(code);
      const parsed = parseAbcCaption(read.caption ?? "");
      setDraft({ kind: "abc", code, title: parsed.title, tone: read.color ?? nextColor(quizzes ?? [], code), publishAt: info?.publishAt ?? new Date().toISOString(),
        cards: placeCards(images, [null, null, null, null, null]), choices: [null, null, null], caption: parsed.post, analysis: parsed.analysis, hook: parsed.hook });
      return;
    }
    if (images.length) {
      const code = /(\d{10})_p[1-5]/.exec(images.map((file) => file.name).join(" "))?.[1] ?? "";
      const info = abcCodeInfo(code);
      setDraft((current) => current?.kind === "abc"
        ? { ...current, cards: placeCards(images, current.cards) }
        : { kind: "abc", code, title: "", tone: nextColor(quizzes ?? [], code), publishAt: info?.publishAt ?? new Date().toISOString(),
            cards: placeCards(images, [null, null, null, null, null]), choices: [null, null, null], caption: "", analysis: { A: "", B: "", C: "" }, hook: "" });
    }
  }

  function placeCards(images: File[], cards: (File | null)[]) {
    const next = [...cards];
    images.forEach((file, i) => {
      const n = /_p([1-5])\b/.exec(file.name)?.[1];
      const slot = n ? Number(n) - 1 : next.findIndex((card, k) => !card && k >= i % 5);
      if (slot >= 0 && slot < 5) next[slot] = file;
    });
    return next;
  }

  async function save(status: "draft" | "scheduled") {
    if (!draft || busy) return;
    setNotice(null);
    try {
      if (!/^F?\d{10}$/.test(draft.code)) throw new Error("代碼要是 10 碼數字（第一眼測驗是 F 加 10 碼）。");
      if (!draft.publishAt) throw new Error("請設定公開時間。");
      let body: unknown;
      if (draft.kind === "first-sight") {
        setBusy("正在處理主畫…");
        const painting = await upload(draft.code, "painting", await toWebp(draft.painting, 1080));
        setBusy("正在處理背景…");
        const blur = draft.blur ? await upload(draft.code, "blur", await toWebp(draft.blur, 540)) : null;
        const paper = draft.paper && draft.tone === "letter" ? await upload(draft.code, "paper", await toWebp(draft.paper, 900)) : null;
        const s = draft.state;
        body = { kind: "first-sight", code: draft.code, title: draft.title, tone: draft.tone, publishAt: draft.publishAt, status,
          data: { painting, blur, paper, ratio: s.ratio, subtitle: s.subtitle, objects: s.objects, hook: s.hook, caption: s.caption, lineUrl: s.lineUrl } };
      } else {
        if (draft.cards.some((card) => !card)) throw new Error("五張卡片圖還沒放齊（檔名 _p1～_p5）。");
        if (status === "scheduled" && CHOICES.some((c) => !draft.analysis[c].trim())) throw new Error("A、B、C 三段解析都要有內容才能排程。");
        const cards: string[] = [];
        for (const [i, card] of draft.cards.entries()) {
          setBusy(`正在上傳第 ${i + 1}／5 張卡…`);
          cards.push(await upload(draft.code, `card${i + 1}`, await toWebp(card as File, 1080)));
        }
        const choices: (string | null)[] = [];
        for (const [i, file] of draft.choices.entries()) {
          if (file) setBusy(`正在上傳選項 ${CHOICES[i]}…`);
          choices.push(file ? await upload(draft.code, `choice${CHOICES[i]}`, await toWebp(file, 540)) : null);
        }
        body = { kind: "abc", code: draft.code, title: draft.title, tone: draft.tone, publishAt: draft.publishAt, status,
          data: { cards, choices, analysis: draft.analysis, hook: draft.hook, caption: draft.caption } };
      }
      setBusy("正在儲存…");
      const response = await fetch("/api/quizzes/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "沒有存成功，請再試一次。");
      setDraft(null);
      setNotice({ tone: "ok", text: status === "scheduled" ? `已排程：${formatWhen(draft.publishAt)} 會出現在網站上。` : "已存成草稿，不會出現在網站上。" });
      await refresh();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "沒有存成功，請再試一次。" });
    } finally {
      setBusy("");
    }
  }

  async function setStatus(quiz: Quiz, status: "draft" | "scheduled") {
    setBusy("正在更新…");
    try {
      const response = await fetch("/api/quizzes/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...quiz, status }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "沒有更新成功。");
      await refresh();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "沒有更新成功。" });
    } finally {
      setBusy("");
    }
  }

  async function remove(quiz: Quiz) {
    if (!window.confirm(`確定要刪除「${quiz.title}」（${quiz.code}）嗎？圖片也會一起刪除，不能復原。`)) return;
    setBusy("正在刪除…");
    try {
      const response = await fetch(`/api/quizzes/admin?code=${encodeURIComponent(quiz.code)}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "沒有刪除成功。");
      await refresh();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "沒有刪除成功。" });
    } finally {
      setBusy("");
    }
  }

  const cardPreviews = useMemo(() => draft?.kind === "abc" ? draft.cards.map((file) => (file ? URL.createObjectURL(file) : null)) : [], [draft]);
  useEffect(() => () => cardPreviews.forEach((url) => url && URL.revokeObjectURL(url)), [cardPreviews]);

  return <main className="quiz-admin">
    <header className="qa-head">
      <div><p className="qa-eyebrow">Zolacoco Private Admin</p><h1>心理測驗上傳</h1><p>放進產生器的 HTML 或五張卡片圖，設定好時間，就會跟 IG 同時出現在網站的心理測驗區。</p></div>
      <nav><Link href="/zola-admin">← 會員後台</Link><Link href="/quizzes">看心理測驗區</Link></nav>
    </header>

    <label className="qa-drop" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void onFiles(event.dataTransfer.files); }}>
      <input type="file" multiple accept=".html,.htm,image/png,image/jpeg,image/webp" onChange={(event) => { void onFiles(event.target.files); event.target.value = ""; }} />
      <b>把檔案拖進來，或點這裡選擇</b>
      <span>第一眼測驗：產生器 HTML 一個檔就好。三選一：產生器 HTML＋五張卡片圖（_p1～_p5），或只放五張圖再貼上文案。</span>
    </label>

    {notice ? <p className={`qa-notice ${notice.tone}`} role="status">{notice.text}</p> : null}
    {busy ? <p className="qa-notice" role="status">{busy}</p> : null}

    {draft ? <section className="qa-draft" aria-label="準備上傳的測驗">
      <header><h2>{draft.kind === "first-sight" ? "第一眼測驗" : "三選一心理測驗"}</h2><button type="button" className="qa-link" onClick={() => setDraft(null)}>取消</button></header>
      <div className="qa-fields">
        <label>代碼<input value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value.trim() } as Draft)} /></label>
        <label>公開時間（台灣）<input type="datetime-local" value={taipeiInput(draft.publishAt)} onChange={(event) => setDraft({ ...draft, publishAt: fromTaipeiInput(event.target.value) } as Draft)} /></label>
        <label className="wide">標題<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value } as Draft)} /></label>
        {draft.kind === "abc" ? <fieldset className="wide qa-colors"><legend>這組的彩虹色</legend>{RAINBOW.map((color) => <button type="button" key={color} aria-pressed={draft.tone === color} style={{ "--c": QUIZ_COLORS[color].ink } as React.CSSProperties} onClick={() => setDraft({ ...draft, tone: color })}>{QUIZ_COLORS[color].label}</button>)}</fieldset>
          : <div className="wide qa-meta">
            <p>色系：{FIRST_SIGHT_THEMES[draft.tone].label}</p>
            {isZolaLine(draft.state.lineUrl)
              ? <p>LINE：官方帳號，客人按下去會自動帶入測驗代碼和她選的東西。</p>
              : <p className="qa-warn">LINE：{draft.state.lineUrl}　這不是官方帳號已知的連結，客人要自己複製訊息貼上。
                <button type="button" className="qa-link" onClick={() => setDraft({ ...draft, state: { ...draft.state, lineUrl: ZOLA_LINE_URL } })}>改用官方帳號</button></p>}
          </div>}
      </div>

      {draft.kind === "first-sight" ? <div className="qa-fs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={draft.painting} alt="主畫" />
        <ol>{draft.state.objects.map((object) => <li key={object.name}><b>{object.name}</b>　{object.hint}<small>{object.line}</small></li>)}</ol>
        <p className="qa-meta">鉤子：{draft.state.hook || "（沒有）"}</p>
      </div> : <div className="qa-abc">
        <div className="qa-cards">{cardPreviews.map((url, i) => <figure key={i} className={url ? "" : "missing"}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {url ? <img src={url} alt={`第 ${i + 1} 張`} /> : <span>第 {i + 1} 張</span>}<figcaption>_p{i + 1}</figcaption>
        </figure>)}</div>
        <div className="qa-choice-files">{CHOICES.map((letter, i) => <label key={letter}>選項 {letter} 小卡（可不放）<input type="file" accept="image/*" onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          setDraft({ ...draft, choices: draft.choices.map((current, k) => (k === i ? file : current)) });
        }} /></label>)}</div>
        <label className="qa-caption">貼上 A～D 文案（會自動分出標題、三段解析和鉤子）<textarea value={draft.caption} onChange={(event) => {
          const parsed = parseAbcCaption(event.target.value);
          setDraft({ ...draft, caption: event.target.value, title: draft.title || parsed.title, analysis: parsed.analysis.A ? parsed.analysis : draft.analysis, hook: parsed.hook || draft.hook });
        }} /></label>
        {CHOICES.map((letter) => <label key={letter} className="qa-caption">{letter} 的解析<textarea value={draft.analysis[letter]} onChange={(event) => setDraft({ ...draft, analysis: { ...draft.analysis, [letter]: event.target.value } })} /></label>)}
        <label className="qa-caption">最後的鉤子<textarea value={draft.hook} onChange={(event) => setDraft({ ...draft, hook: event.target.value })} /></label>
      </div>}

      <div className="qa-actions">
        <button type="button" className="qa-primary" disabled={Boolean(busy)} onClick={() => void save("scheduled")}>上傳並排程公開</button>
        <button type="button" className="qa-secondary" disabled={Boolean(busy)} onClick={() => void save("draft")}>先存草稿</button>
      </div>
    </section> : null}

    <section className="qa-list" aria-labelledby="qa-list-title">
      <h2 id="qa-list-title">已上傳的測驗</h2>
      {loadError ? <p className="qa-notice error">{loadError}</p> : !quizzes ? <p className="qa-meta">讀取中…</p> : quizzes.length === 0 ? <p className="qa-meta">還沒有測驗。</p> : <ul>
        {quizzes.map((quiz) => {
          const live = isPublished(quiz);
          const cover = quiz.kind === "abc" ? quiz.data.cards[0] : quiz.data.painting;
          return <li key={quiz.code} style={{ "--c": toneColor(quiz.kind, quiz.tone) } as React.CSSProperties}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" loading="lazy" />
            <div><b>{quiz.title}</b><small>{quiz.code}・{quiz.kind === "abc" ? "三選一" : "第一眼"}・{formatWhen(quiz.publishAt)}</small></div>
            <span className={`qa-status ${live ? "live" : quiz.status}`}>{STATUS_TEXT[live ? "live" : quiz.status]}</span>
            <div className="qa-row-actions">
              {live ? <Link href={`/quizzes/${quiz.code}`}>查看</Link> : null}
              {quiz.status === "draft" ? <button type="button" onClick={() => void setStatus(quiz, "scheduled")} disabled={Boolean(busy)}>排程</button>
                : <button type="button" onClick={() => void setStatus(quiz, "draft")} disabled={Boolean(busy)}>{live ? "撤下" : "取消排程"}</button>}
              <button type="button" className="danger" onClick={() => void remove(quiz)} disabled={Boolean(busy)}>刪除</button>
            </div>
          </li>;
        })}
      </ul>}
    </section>
  </main>;
}
