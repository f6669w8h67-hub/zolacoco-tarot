"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { tarotCards } from "../tarot-data";

type StoredValue = unknown[] | Record<string, string>;
type Archive = Record<string, StoredValue>;

// `href` is where an empty section sends the visitor to make her first record.
const sources = [
  { key: "zolacoco-tarot-records-v1", title: "塔羅抽牌紀錄", href: "/#draw", start: "去抽一次牌" },
  { key: "zolacoco-journal-notes-v1", title: "七日內在筆記", href: "/#explore", start: "寫第一天的筆記" },
  { key: "zolacoco-pendulum-records-v1", title: "靈擺問答紀錄", href: "/pendulum", start: "問靈擺一個問題" },
  { key: "zolacoco-astro-dice-records-v1", title: "星骰探索紀錄", href: "/astro-dice", start: "擲一次星骰" },
  { key: "zolacoco-healing-records-v1", title: "療癒小房間紀錄", href: "/healing-room", start: "走進療癒小房間" },
  { key: "zolacoco-astrology-exploration-records-v1", title: "星盤內在探索紀錄", href: "/astrology-exploration", start: "開始星盤探索" },
] as const;

function count(value: StoredValue | undefined) {
  return Array.isArray(value) ? value.length : value ? Object.values(value).filter(Boolean).length : 0;
}

function itemTitle(item: unknown) {
  if (!item || typeof item !== "object") return "已儲存紀錄";
  const row = item as Record<string, unknown>;
  // An empty question (optional since Issue #9) falls back to the topic.
  return String((row.question || undefined) ?? row.topic ?? row.type ?? row.theme ?? row.title ?? "已儲存紀錄");
}

// Tarot records saved since Issue #9 carry card ids; older ones only have names and still render as text.
function CardThumbs({ item }: { item: unknown }) {
  const cards = item && typeof item === "object" && Array.isArray((item as Record<string, unknown>).cards)
    ? ((item as Record<string, unknown>).cards as Record<string, unknown>[])
    : [];
  const withArt = cards.map((card) => ({ card, art: tarotCards.find((entry) => entry.id === card.id)?.art })).filter((entry) => entry.art);
  if (!withArt.length) return null;
  return <div className="archive-card-thumbs">
    {withArt.map(({ card, art }, index) => <figure key={`${String(card.id)}-${index}`}>
      <img src={art} alt={String(card.name ?? "")} loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} />
      <figcaption>{String(card.position ?? "")}<b>{String(card.name ?? "")}</b></figcaption>
    </figure>)}
  </div>;
}

function itemDetail(item: unknown) {
  if (!item || typeof item !== "object") return "";
  const row = item as Record<string, unknown>;
  if (Array.isArray(row.cards)) return row.cards.map((card) => String((card as Record<string, unknown>).name ?? "")).filter(Boolean).join("・");
  return String(row.result_label ?? row.card ?? row.planet_name ?? row.summary ?? row.date ?? "");
}

export default function ArchivePage() {
  const [archive, setArchive] = useState<Archive>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const next: Archive = {};
      for (const source of sources) {
        try { next[source.key] = JSON.parse(localStorage.getItem(source.key) ?? (source.key.includes("journal") ? "{}" : "[]")); }
        catch { next[source.key] = source.key.includes("journal") ? {} : []; }
      }
      setArchive(next);
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const total = useMemo(() => sources.reduce((sum, source) => sum + count(archive[source.key]), 0), [archive]);

  function exportBackup() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), archive }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `zolacoco-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return <main className="admin-page">
    <div className="admin-top"><div><p className="eyebrow">ZOLACOCO TAROT · MY ARCHIVE</p><h1>我的存檔</h1></div><div><Link href="/">返回網站</Link></div></div>
    <section className="access-card"><b>手機版與電腦版都能存檔</b><br />紀錄會保存在你目前使用的瀏覽器；同一台裝置重新開啟網站仍可查看。換手機、換電腦或清除瀏覽器資料前，請先下載備份。</section>
    <div className="archive-toolbar"><span>目前共 {ready ? total : "—"} 筆存檔</span><button type="button" onClick={exportBackup} disabled={!ready}>下載全部備份</button></div>
    {sources.map((source) => {
      const value = archive[source.key];
      const entries = Array.isArray(value) ? value : Object.entries(value ?? {}).map(([day, content]) => ({ question: `DAY ${Number(day) + 1}`, summary: content }));
      return <section className="admin-section archive-section" key={source.key} aria-labelledby={`archive-${source.key}`}>
        <header className="archive-section-head"><h2 id={`archive-${source.key}`}>{source.title}</h2><p className="admin-summary">{ready ? count(value) : "—"} 筆</p></header>
        {!ready ? <div className="admin-empty">正在讀取存檔…</div> : entries.length === 0 ? <div className="admin-empty"><p>目前還沒有紀錄。</p><Link href={source.href}>{source.start} →</Link></div> : <div className="archive-list">{entries.slice(0, 30).map((item, index) => <article key={String((item as Record<string, unknown>).id ?? index)}><div><b>{itemTitle(item)}</b><small>{itemDetail(item)}</small></div>{source.key === "zolacoco-tarot-records-v1" ? <CardThumbs item={item} /> : null}<p>{String((item as Record<string, unknown>).summary ?? (item as Record<string, unknown>).note ?? (item as Record<string, unknown>).sentence ?? "")}</p></article>)}</div>}
      </section>;
    })}
  </main>;
}
