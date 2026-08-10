"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type FontTier = "small" | "medium" | "large";

const menuGroups = [
  {
    label: "占卜工具",
    items: [
      { href: "/#draw", title: "塔羅抽牌", note: "單張與三張牌陣" },
      { href: "/pendulum", title: "靈擺占卜", note: "直覺問答與生活指引" },
      { href: "/astro-dice", title: "星骰指引", note: "行星 × 星座 × 宮位" },
    ],
  },
  {
    label: "內在探索",
    items: [
      { href: "/?tool=archetype#explore", title: "內在原型", note: "看見此刻靠近你的能量" },
      { href: "/?tool=intuition#explore", title: "直覺練習", note: "從牌面練習解讀" },
      { href: "/?tool=journal#explore", title: "七日塔羅筆記", note: "每天整理一個內在提問" },
    ],
  },
  {
    label: "療癒空間",
    items: [
      { href: "/healing-room", title: "療癒小房間", note: "情緒、關係與睡前練習" },
      { href: "/astrology-exploration", title: "探索你的星盤", note: "理解內在需求與人生課題" },
      { href: "/#consult", title: "問問 Zola", note: "一對一整理完整脈絡" },
    ],
  },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [fontTier, setFontTier] = useState<FontTier>("medium");
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = localStorage.getItem("zolacoco-font-tier") as FontTier | null;
      setFontTier(saved === "small" || saved === "large" ? saved : "medium");
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-font-tier", fontTier);
    localStorage.setItem("zolacoco-font-tier", fontTier);
  }, [fontTier]);

  useEffect(() => {
    function closeOnOutside(event: PointerEvent) {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function chooseFont(next: FontTier) {
    setFontTier(next);
  }

  return <header className={`global-site-header ${open ? "menu-is-open" : ""}`} ref={headerRef}>
    <Link className="global-brand" href="/" aria-label="回到 Zolacoco Tarot 首頁">ZOLACOCO <span>TAROT</span></Link>
    <div className="global-header-actions">
      <button className="global-menu-trigger" type="button" aria-expanded={open} aria-controls="global-function-menu" onClick={() => setOpen((value) => !value)}>
        <span>全部功能</span><i aria-hidden="true">⌄</i>
      </button>
      <Link className="global-account-link" href="/admin">我的存檔</Link>
    </div>
    <div className="global-function-menu" id="global-function-menu" hidden={!open}>
      <div className="global-menu-heading"><div><small>ZOLACOCO GUIDE</small><h2>今天，想走進哪一個空間？</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="關閉功能選單">×</button></div>
      <div className="global-menu-groups">
        {menuGroups.map((group) => <section key={group.label}><h3>{group.label}</h3>{group.items.map((item) => <Link href={item.href} key={item.title} onClick={() => setOpen(false)}><span><b>{item.title}</b><small>{item.note}</small></span><i aria-hidden="true">→</i></Link>)}</section>)}
      </div>
      <div className="font-tier-row" role="group" aria-label="調整網站字級">
        <span><b>閱讀字級</b><small>會記住你的選擇</small></span>
        {(["small", "medium", "large"] as FontTier[]).map((tier, index) => <button type="button" key={tier} className={fontTier === tier ? "active" : ""} aria-pressed={fontTier === tier} onClick={() => chooseFont(tier)}>{["小", "中", "大"][index]}</button>)}
      </div>
      <Link className="global-admin-link" href="/admin" onClick={() => setOpen(false)}>查看此裝置的完整存檔 →</Link>
    </div>
  </header>;
}
