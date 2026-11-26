"use client";

// After the reading: the hook, then 「私訊 Zola 聊聊妳的狀況」 to the quiz's official LINE (Zola 2026-11-22:
// 看完心測一樣引導私訊到 LINE). On Zola's own LINE the message, with the quiz code, is typed in for the visitor;
// she still presses send. Any other LINE link opens as it is, and the page asks her to copy the message in.
import { useState } from "react";
import { type QuizLineLink, siteWording } from "@/lib/quiz";
import { countOnce } from "./quiz-count";

export default function QuizLineCta({ hook, link, message, code, choice }: { hook: string; link: QuizLineLink; message: string; code: string; choice: string }) {
  const [copied, setCopied] = useState(false);
  const { prefilled } = link;
  // 心理測驗統計: 按私訊, by what she picked (once per phone per quiz)
  const counted = () => countOnce(code, "line", choice);

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
    {hook ? <p className="qz-cta-hook">{siteWording(hook)}</p> : null}
    <a className="qz-cta-btn" href={link.href} target="_blank" rel="noopener noreferrer" onClick={counted}>私訊 Zola 聊聊妳的狀況</a>
    <p className="qz-cta-small">{prefilled ? `會帶上題目、測驗代碼 ${code} 和妳選到的內容，按下送出就好` : "這個 LINE 不會自動帶入訊息：先複製下面這段，打開 LINE 後貼上傳給我"}</p>
    {prefilled ? null : <p className="qz-cta-message">{message}</p>}
    <div className="qz-cta-row">
      <button type="button" className="qz-cta-copy" onClick={() => void copy()}>{copied ? "已複製" : "複製這段訊息"}</button>
      {prefilled ? <a className="qz-cta-alt" href={link.open} target="_blank" rel="noopener noreferrer" onClick={counted}>LINE 打不開？</a> : null}
    </div>
    <p className="qz-cta-note" role="status">{copied ? "已複製，到 LINE 貼上就可以了。" : ""}</p>
  </aside>;
}
