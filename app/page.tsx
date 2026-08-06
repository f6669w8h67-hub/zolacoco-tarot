"use client";

import { useState } from "react";

const services = [
  { mark: "I", title: "塔羅占卜", text: "釐清感情、工作與當下選擇，從混亂中看見真正需要處理的核心。", action: "開始探索" },
  { mark: "II", title: "靈擺指引", text: "用簡單的日常提問整理直覺，適合此刻需要快速安定思緒的你。", action: "進入靈擺" },
  { mark: "III", title: "星骰解讀", text: "從行星、星座與宮位，看見事件背後的能量、方式與發生領域。", action: "擲出星骰" },
  { mark: "IV", title: "元辰宮探索", text: "以東方意象走入內在居所，透過引導式問題覺察近期生命狀態。", action: "推門入境" },
];

const nav = [
  ["首頁", "#top"],
  ["探索工具", "#explore"],
  ["療癒練習", "#healing"],
  ["服務預約", "#booking"],
];

export default function Home() {
  const [open, setOpen] = useState(false);

  return (
    <main id="top">
      <header className="nav-shell">
        <a className="brand" href="#top" aria-label="Zolacoco Tarot 首頁">
          <span className="brand-gem" aria-hidden="true">Z</span>
          <span><strong>ZOLACOCO</strong><small>TAROT & INNER GUIDANCE</small></span>
        </a>
        <button className="menu-button" aria-label="開啟導覽選單" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span /><span />
        </button>
        <nav className={open ? "nav-links is-open" : "nav-links"} aria-label="主要導覽">
          {nav.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
          <a className="nav-cta" href="#booking" onClick={() => setOpen(false)}>預約諮詢</a>
        </nav>
      </header>

      <section className="hero">
        <div className="halo halo-one" /><div className="halo halo-two" />
        <div className="hero-copy">
          <p className="eyebrow"><span /> A QUIET PLACE FOR YOUR INNER WORLD</p>
          <h1>在迷霧裡，<br />陪你看見<span>方向</span></h1>
          <p className="hero-lead">答案不只是預測未來。<br />它也可以是一次整理思緒、理解自己，重新做出選擇的開始。</p>
          <div className="hero-actions">
            <a className="button primary" href="#explore">進入占卜世界 <b aria-hidden="true">→</b></a>
            <a className="button secondary" href="#healing">先認識這裡</a>
          </div>
          <p className="gentle-note">請把占卜當作整理自己的輔助，而不是替你決定人生。</p>
        </div>
        <div className="hero-scene" aria-label="古典塔羅意象裝飾">
          <div className="arch">
            <div className="moon"><span>✦</span></div>
            <div className="card card-back"><i>☾</i></div>
            <div className="card card-front"><small>THE STAR</small><i>✧</i><b>XVII</b></div>
            <div className="table-line" />
          </div>
          <p>TURN INWARD · FIND YOUR LIGHT</p>
        </div>
      </section>

      <section className="intro" id="healing">
        <p className="section-kicker">CHOOSE YOUR PATH</p>
        <h2>此刻的你，想從哪裡開始？</h2>
        <p>不需要先懂任何占卜知識。只要帶著現在最想釐清的事情，選一扇最吸引你的門。</p>
      </section>

      <section className="service-grid" id="explore">
        {services.map((service) => (
          <article className="service-card" key={service.title}>
            <div className="service-top"><span>{service.mark}</span><i aria-hidden="true">✦</i></div>
            <h3>{service.title}</h3>
            <p>{service.text}</p>
            <button type="button" onClick={() => document.getElementById("phase-note")?.scrollIntoView({ behavior: "smooth" })}>{service.action} <span>→</span></button>
          </article>
        ))}
      </section>

      <section className="booking" id="booking">
        <div>
          <p className="section-kicker">PERSONAL READING</p>
          <h2>需要更完整的陪伴與解析？</h2>
          <p>如果你的問題牽涉較多背景，或正在感情、工作與人生選擇中反覆拉扯，可以預約一對一諮詢。</p>
        </div>
        <a className="button primary" href="https://www.instagram.com/zolacoco_tarot/" target="_blank" rel="noreferrer">前往預約 <b>→</b></a>
      </section>

      <aside id="phase-note" className="phase-note">第一階段已建立入口；塔羅抽牌、靈擺、星骰與元辰宮互動將依序在下一階段開放。</aside>

      <footer><span>ZOLACOCO TAROT</span><p>願你每次向內觀看，都更靠近真正的自己。</p></footer>
    </main>
  );
}
