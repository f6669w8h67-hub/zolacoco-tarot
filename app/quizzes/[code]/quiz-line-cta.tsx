"use client";

// After the reading: the hook, then 「私訊 Zola 聊聊妳的狀況」 to the quiz's official LINE (Zola 2026-11-22:
// 看完心測一樣引導私訊到 LINE). On Zola's own LINE the message is typed in for her; she still presses send.
import { useState } from "react";

export default function QuizLineCta({ hook, href, fallback, message, code }: { hook: string; href: string; fallback: string; message: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const prefilled = href !== fallback;

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      setCopied(false);
    }
  }

  return <aside className="qz-cta" aria-labelledby="qz-cta-title">
    <h3 id="qz-cta-title">想知道更多嗎？</h3>
    {hook ? <p className="qz-cta-hook">{hook}</p> : null}
    <a className="qz-cta-btn" href={href} target="_blank" rel="noopener noreferrer">私訊 Zola 聊聊妳的狀況</a>
    <p className="qz-cta-small">{prefilled ? `會帶上測驗代碼 ${code}，按下送出就好` : "打開官方 LINE 後，把下面這句傳給我"}</p>
    {prefilled ? null : <p className="qz-cta-message">{message}</p>}
    <div className="qz-cta-row">
      <button type="button" className="qz-cta-copy" onClick={() => void copy()}>{copied ? "已複製" : "複製這句話"}</button>
      {prefilled ? <a className="qz-cta-alt" href={fallback} target="_blank" rel="noopener noreferrer">LINE 打不開？</a> : null}
    </div>
    <p className="qz-cta-note" role="status">{copied ? "已複製，到 LINE 貼上就可以了。" : ""}</p>
  </aside>;
}
