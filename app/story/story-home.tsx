"use client";

import { useEffect, useRef } from "react";
import { STORY_CSS, STORY_HTML } from "./story-content";
import { mountStory } from "./story-engine";
import { useTrial } from "../visitor-trial";

/** The storybook at the top of the home page (Zola, 2026-11-20: 「取代首頁，舊內容接在後面」). It lives in a
 * shadow root so its stylesheet and the rest of the home page cannot restyle each other. Its little plays
 * (one pendulum question, one die, one card) are a free taste and do not count toward the 3 free uses. */
export default function StoryHome() {
  const hostRef = useRef<HTMLDivElement>(null);
  const trial = useTrial();
  const mode = trial.visitor ? trial.mode : "member";

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${STORY_CSS}</style>${STORY_HTML}`;
    const stop = mountStory(root, host);
    host.dataset.ready = "true";
    return () => { stop(); root.innerHTML = ""; delete host.dataset.ready; };
  }, []);

  // the second prologue button: sign-up for visitors who are not signed in, the full draw for everyone else
  useEffect(() => {
    const join = hostRef.current?.shadowRoot?.querySelector<HTMLAnchorElement>('[data-cta="join"]');
    if (!join) return;
    if (mode === "signed-out") { join.textContent = "免費註冊，體驗 3 次"; join.href = "/sign-up"; }
    else { join.textContent = "完整牌陣與工具 ↓"; join.href = mode === "member" ? "#draw" : "#trial"; }
  }, [mode]);

  return <div ref={hostRef} className="story-host" />;
}
