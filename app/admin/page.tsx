"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type StoredValue = unknown[] | Record<string, string>;
type Archive = Record<string, StoredValue>;

const sources = [
  { key: "zolacoco-tarot-records-v1", title: "塔羅抽牌紀錄" },
  { key: "zolacoco-journal-notes-v1", title: "七日內在筆記" },
  { key: "zolacoco-pendulum-records-v1", title: "靈擺問答紀錄" },
  { key: "zolacoco-astro-dice-records-v1", title: "星骰探索紀錄" },
  { key: "zolacoco-healing-records-v1", title: "療癒小房間紀錄" },
  { key: "zolacoco-astrology-exploration-records-v1", title: "星盤內在探索紀錄" },
] as const;

function count(value: StoredValue | undefined) {
  return Array.isArray(value) ? value.length : value ? Object.values(value).filter(Boolean).length : 0;
}

function itemTitle(item: unknown) {
  if (!item || typeof item !== "object") return "已儲存紀錄";
  const row = item as Record<string, unknown>;
  return String(row.question ?? row.topic ?? row.type ?? row.theme ?? row.title ?? "已儲存紀錄");
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
      return <section className="admin-section archive-section" key={source.key}>
        <h2>{source.title}</h2><p className="admin-summary">{count(value)} 筆</p>
        {!ready ? <div className="admin-empty">正在讀取存檔…</div> : entries.length === 0 ? <div className="admin-empty">目前還沒有紀錄。</div> : <div className="archive-list">{entries.slice(0, 30).map((item, index) => <article key={String((item as Record<string, unknown>).id ?? index)}><div><b>{itemTitle(item)}</b><small>{itemDetail(item)}</small></div><p>{String((item as Record<string, unknown>).summary ?? (item as Record<string, unknown>).note ?? (item as Record<string, unknown>).sentence ?? "")}</p></article>)}</div>}
      </section>;
    })}
  </main>;
}
