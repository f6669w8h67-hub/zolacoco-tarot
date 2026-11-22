"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DOCK_FEATURES, FEATURE_GROUPS, FEATURE_ICONS, dockSizes, findFeature, groupIndexFor, isCurrentFeature } from "@/lib/site-features";

type FontTier = "small" | "medium" | "large";
const STEP = 60;
// immersive pages and Zola's back office keep the whole screen
const HIDDEN_ON = [/^\/healing-room\/yuanchen(\/|$)/, /^\/zola-admin(\/|$)/];

function Icon({ path, size }: { path: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={path} /></svg>;
}

export default function SiteDock() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [toRight, setToRight] = useState(true);
  const [pointer, setPointer] = useState<number | null>(null);
  const [fontTier, setFontTier] = useState<FontTier>("medium");
  const plusRef = useRef<HTMLButtonElement>(null);
  const trayRef = useRef<HTMLElement>(null);

  // reading size (小／中／大) lives in the tray now; same key as before, so a saved choice carries over
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
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      plusRef.current?.focus();
    }
    document.addEventListener("keydown", closeOnEscape);
    const frame = requestAnimationFrame(() => trayRef.current?.querySelector<HTMLElement>(".dock-tab.on")?.focus());
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      cancelAnimationFrame(frame);
    };
  }, [open]);

  if (HIDDEN_ON.some((rule) => rule.test(pathname))) return null;

  const dockItems = DOCK_FEATURES.map(findFeature);
  const sizes = dockSizes(dockItems.length + 1, pointer, { step: STEP });
  const center = dockItems.length / 2;
  const nearest = pointer === null ? -1 : sizes.reduce((best, _, i) => (Math.abs(pointer - (i - center) * STEP) < Math.abs(pointer - (best - center) * STEP) ? i : best), 0);
  const showTip = (i: number) => pointer !== null && i === nearest && Math.abs(pointer - (i - center) * STEP) < 40;

  function toggleTray() {
    setPointer(null);
    if (open) { setOpen(false); return; }
    setTab(groupIndexFor(pathname));
    setOpen(true);
  }

  function chooseTab(next: number) {
    if (next === tab) return;
    setToRight(next > tab);
    setTab(next);
  }

  function moveOnTabs(event: React.KeyboardEvent) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (tab + step + FEATURE_GROUPS.length) % FEATURE_GROUPS.length;
    chooseTab(next);
    trayRef.current?.querySelectorAll<HTMLElement>(".dock-tab")[next]?.focus();
  }

  function track(event: React.PointerEvent<HTMLElement>) {
    if (open) return;
    const box = event.currentTarget.getBoundingClientRect();
    setPointer(event.clientX - (box.left + box.width / 2));
  }

  const third = 1 / FEATURE_GROUPS.length;
  const pill = {
    left: `calc(5px + (100% - 10px) * ${(tab * third).toFixed(4)})`,
    right: `calc(5px + (100% - 10px) * ${((FEATURE_GROUPS.length - 1 - tab) * third).toFixed(4)})`,
  };

  return <>
    <div className="site-dock-space" aria-hidden="true" />
    <button className={`dock-veil${open ? " open" : ""}`} type="button" tabIndex={-1} aria-hidden={!open} onClick={() => setOpen(false)} />
    <section className={`dock-tray${open ? " open" : ""}`} id="dock-tray" ref={trayRef} aria-label="全部功能" inert={!open}>
      <div className="dock-tabs" role="tablist" aria-label="功能分類" onKeyDown={moveOnTabs}>
        <span className={`dock-pill ${toRight ? "to-right" : "to-left"}`} style={pill} aria-hidden="true" />
        {FEATURE_GROUPS.map((group, i) => <button key={group.key} type="button" role="tab" id={`dock-tab-${group.key}`} aria-selected={i === tab} aria-controls={`dock-set-${group.key}`} tabIndex={i === tab ? 0 : -1} className={`dock-tab${i === tab ? " on" : ""}`} onClick={() => chooseTab(i)}>
          <Icon path={group.icon} size={17} />{group.label}
        </button>)}
      </div>
      <div className="dock-sets">
        {FEATURE_GROUPS.map((group, i) => <div key={group.key} role="tabpanel" id={`dock-set-${group.key}`} aria-labelledby={`dock-tab-${group.key}`} inert={i !== tab} className={`dock-set g-${group.key}${i === tab ? " show" : i < tab ? " before" : ""}`}>
          {group.items.map((item) => <Link key={item.id} href={item.href} className={`dock-card${isCurrentFeature(item, pathname) ? " here" : ""}`} aria-current={isCurrentFeature(item, pathname) ? "page" : undefined} onClick={() => setOpen(false)}>
            <span className="dock-swatch"><Icon path={item.icon} size={30} /></span>
            <b>{item.title}</b>
            <small>{item.note}</small>
          </Link>)}
        </div>)}
      </div>
      <div className="dock-foot">
        <div className="dock-font" role="group" aria-label="調整網站字級">
          <span>閱讀字級</span>
          {(["small", "medium", "large"] as FontTier[]).map((tier, index) => <button type="button" key={tier} className={fontTier === tier ? "on" : ""} aria-pressed={fontTier === tier} onClick={() => setFontTier(tier)}>{["小", "中", "大"][index]}</button>)}
        </div>
        <Link className="dock-account" href="/account" onClick={() => setOpen(false)}>會員中心<Icon path="M5 12h14 M13 6l6 6-6 6" size={14} /></Link>
      </div>
    </section>
    <nav className="site-dock" aria-label="常用功能" onPointerMove={track} onPointerDown={track} onPointerLeave={() => setPointer(null)} onPointerUp={(event) => { if (event.pointerType !== "mouse") setPointer(null); }} onPointerCancel={() => setPointer(null)}>
      {dockItems.map((item, i) => {
        const here = isCurrentFeature(item, pathname);
        return <Link key={item.id} href={item.href} className={`dock-item${here ? " here" : ""}${pointer === null ? " calm" : ""}`} style={{ width: sizes[i], height: sizes[i] }} aria-label={item.title} aria-current={here ? "page" : undefined} onClick={() => setOpen(false)}>
          <Icon path={item.icon} />
          <span className="dock-dot" aria-hidden="true" />
          <span className={`dock-tip${showTip(i) ? " show" : ""}`} aria-hidden="true">{item.title}</span>
        </Link>;
      })}
      <button ref={plusRef} type="button" className={`dock-item dock-all${open ? " open" : ""}${pointer === null ? " calm" : ""}`} style={{ width: sizes[dockItems.length], height: sizes[dockItems.length] }} aria-label={open ? "收起全部功能" : "全部功能"} aria-expanded={open} aria-controls="dock-tray" onClick={toggleTray}>
        <Icon path={FEATURE_ICONS.plus} />
        <span className={`dock-tip${showTip(dockItems.length) ? " show" : ""}`} aria-hidden="true">{open ? "收起" : "全部功能"}</span>
      </button>
    </nav>
  </>;
}
