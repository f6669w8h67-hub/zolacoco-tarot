"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { tarotCards } from "../tarot-data";
import { loadMemberProfile } from "@/lib/member-client";
import { AWARENESS_RECORDS_PREFIX, awarenessAccess, currentSession, readRecords, type AwarenessSession } from "@/lib/awareness-records";
import { useIdentityKey } from "../auth-identity";
import "../styles/pearl-page.css";
import "./archive-pearl.css";

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
  // Zolacoco 覺察卡 keeps one list per member (lib/awareness-records); read with the signed-in member's id.
  { key: AWARENESS_RECORDS_PREFIX, title: "Zolacoco 覺察卡紀錄", href: "/awareness", start: "抽一張覺察卡" },
] as const;

function count(value: StoredValue | undefined) {
  return Array.isArray(value) ? value.length : value ? Object.values(value).filter(Boolean).length : 0;
}

function itemTitle(item: unknown) {
  if (!item || typeof item !== "object") return "已儲存紀錄";
  const row = item as Record<string, unknown>;
  if (row.deck === "zolacoco-awareness") return String(row.name ?? "覺察卡");
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
  if (row.deck === "zolacoco-awareness") return String(row.line ?? "");
  if (Array.isArray(row.cards)) return row.cards.map((card) => String((card as Record<string, unknown>).name ?? "")).filter(Boolean).join("・");
  // 七日內在筆記: the day is the title and the note is shown once, below it.
  if (typeof row.question === "string" && /^DAY \d+$/.test(row.question)) return "";
  return String(row.result_label ?? row.card ?? row.planet_name ?? row.summary ?? row.date ?? "");
}

export default function ArchivePage() {
  const [deviceArchive, setDeviceArchive] = useState<Archive>({});
  const [ready, setReady] = useState(false);
  // 覺察卡 records are private to one member. They follow whoever is signed in now: after a
  // sign-out or account switch the previous member's list is gone at once (currentSession), and a
  // late reply for the previous member is ignored.
  const identityKey = useIdentityKey();
  const [awarenessSession, setAwarenessSession] = useState<AwarenessSession | null>(null);
  const awareness = currentSession(identityKey, awarenessSession);
  const awarenessReady = awareness.access !== "loading";

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const next: Archive = {};
      for (const source of sources) {
        if (source.key === AWARENESS_RECORDS_PREFIX) continue;
        try { next[source.key] = JSON.parse(localStorage.getItem(source.key) ?? (source.key.includes("journal") ? "{}" : "[]")); }
        catch { next[source.key] = source.key.includes("journal") ? {} : []; }
      }
      setDeviceArchive(next);
      setReady(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (identityKey === null || identityKey === "signed-out") return;
    let active = true;
    void loadMemberProfile().then((result) => {
      if (!active) return;
      const memberId = result.ok && result.member.id ? String(result.member.id) : null;
      const access = result.ok ? awarenessAccess(result.member) : "unavailable";
      setAwarenessSession({ key: identityKey, access, memberId, records: memberId ? readRecords(localStorage, memberId) : [] });
    });
    return () => { active = false; };
  }, [identityKey]);

  const archive: Archive = useMemo(() => ({ ...deviceArchive, [AWARENESS_RECORDS_PREFIX]: awareness.records }), [deviceArchive, awareness.records]);

  const total = useMemo(() => sources.reduce((sum, source) => sum + count(archive[source.key]), 0), [archive]);
  // The full backup and the total wait for the member's 覺察卡 records too, so a backup made right
  // after opening the page never leaves them out.
  const archiveReady = ready && awarenessReady;

  function exportBackup() {
    if (!archiveReady) return;
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), archive }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `zolacoco-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return <main className="admin-page pearl-page">
    <div className="admin-top"><div><p className="eyebrow">Zolacoco · My Archive</p><h1>我的存檔</h1></div><div><Link href="/">返回網站</Link></div></div>
    <section className="access-card"><b>紀錄存在這台裝置</b><br />占卜、筆記和覺察卡的紀錄保存在妳目前使用的瀏覽器，同一台裝置重新打開網站都看得到。換手機、換電腦或清除瀏覽器資料前，請先下載備份。</section>
    <div className="archive-toolbar"><span>目前共 {archiveReady ? total : "—"} 筆存檔</span><button type="button" onClick={exportBackup} disabled={!archiveReady}>{archiveReady ? "下載全部備份" : "正在讀取存檔…"}</button></div>
    {sources.map((source) => {
      const value = archive[source.key];
      const entries = Array.isArray(value) ? value : Object.entries(value ?? {}).map(([day, content]) => ({ question: `DAY ${Number(day) + 1}`, summary: content }));
      return <section className="admin-section archive-section" key={source.key} aria-labelledby={`archive-${source.key}`}>
        <header className="archive-section-head"><h2 id={`archive-${source.key}`}>{source.title}</h2><p className="admin-summary">{ready ? count(value) : "—"} 筆</p></header>
        {!ready || (source.key === AWARENESS_RECORDS_PREFIX && !awarenessReady) ? <div className="admin-empty">正在讀取存檔…</div> : entries.length === 0 ? <div className="admin-empty"><p>目前還沒有紀錄。</p><Link href={source.href}>{source.start} →</Link></div> : <div className="archive-list">{entries.slice(0, 30).map((item, index) => <article key={String((item as Record<string, unknown>).id ?? index)}><div><b>{itemTitle(item)}</b><small>{itemDetail(item)}</small></div>{source.key === "zolacoco-tarot-records-v1" ? <CardThumbs item={item} /> : null}<p>{String((item as Record<string, unknown>).summary ?? (item as Record<string, unknown>).note ?? (item as Record<string, unknown>).sentence ?? (item as Record<string, unknown>).answer ?? "")}</p></article>)}</div>}
      </section>;
    })}
  </main>;
}
