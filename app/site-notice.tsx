"use client";

// Site-wide maintenance notice (owner request 2026-11-13): the redesign is in progress, so some
// features may be missing for a while. Dismissible; the dismissal lasts for the browser session.
import { useEffect, useState } from "react";

export const SITE_NOTICE_KEY = "zolacoco-notice-maintenance-2026-11";

export default function SiteNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      let dismissed = false;
      try { dismissed = sessionStorage.getItem(SITE_NOTICE_KEY) === "1"; } catch { dismissed = false; }
      setVisible(!dismissed);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!visible) return null;

  function dismiss() {
    try { sessionStorage.setItem(SITE_NOTICE_KEY, "1"); } catch { /* storage unavailable: hide for this view only */ }
    setVisible(false);
  }

  return <aside className="site-notice" role="status" aria-label="網站公告">
    <p><b>網站維護中</b><span>網站正在重新設計，如有缺少的功能，請耐心稍等，謝謝妳。</span></p>
    <button type="button" onClick={dismiss} aria-label="關閉網站維護公告">×</button>
  </aside>;
}
