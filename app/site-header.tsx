import Link from "next/link";

// The features moved to the bottom dock (app/site-dock.tsx, 2026-11-22); the header keeps the brand and 會員中心.
export default function SiteHeader() {
  return <header className="global-site-header">
    <Link className="global-brand" href="/" aria-label="回到 Zolacoco Tarot 首頁">ZOLACOCO <span>TAROT</span></Link>
    <div className="global-header-actions">
      <Link className="global-account-link" href="/account" aria-label="會員中心">
        <svg className="global-account-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="3.6" /><path d="M5 20c.9-3.9 3.6-6 7-6s6.1 2.1 7 6" /></svg>
        <span className="global-account-full">會員中心</span><span className="global-account-short">會員</span>
      </Link>
    </div>
  </header>;
}
