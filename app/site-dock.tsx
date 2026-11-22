"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { browserStore, readFontTier, writeFontTier, type FontTier } from "@/lib/font-tier";
import { DOCK_FEATURES, FEATURE_GROUPS, FEATURE_ICONS, dockSizes, findFeature, groupIndexFor, isCurrentFeature } from "@/lib/site-features";

const STEP = 60;
// below this width a mouse gets the touch treatment too: the dock never grows wider than the screen
const MAGNIFY_MIN_WIDTH = 480;
// immersive pages and Zola's back office keep the whole screen
const HIDDEN_ON = [/^\/healing-room\/yuanchen(\/|$)/, /^\/zola-admin(\/|$)/];

function Icon({ path, size }: { path: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={path} /></svg>;
}

/** Index of the dock button under (or nearest to) a finger at clientX. */
function itemAt(nav: HTMLElement, clientX: number) {
  const items = [...nav.querySelectorAll<HTMLElement>(".dock-item")];
  let best = -1, bestD = Infinity;
  items.forEach((item, index) => {
    const box = item.getBoundingClientRect();
    const d = Math.abs(clientX - (box.left + box.width / 2));
    if (d < bestD) { bestD = d; best = index; }
  });
  return best;
}

export default function SiteDock() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [toRight, setToRight] = useState(true);
  // mouse: the pointer's x from the dock's centre (the dock grows like a desk dock)
  // touch: the button under the finger (only its icon grows; the buttons never move under a finger)
  const [pointer, setPointer] = useState<number | null>(null);
  const [touchAt, setTouchAt] = useState<number | null>(null);
  const [fontTier, setFontTier] = useState<FontTier | null>(null);
  const plusRef = useRef<HTMLButtonElement>(null);
  const trayRef = useRef<HTMLElement>(null);

  // the saved reading size is read first; nothing is written until she picks one
  useEffect(() => {
    const frame = requestAnimationFrame(() => setFontTier(readFontTier(browserStore())));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (fontTier) document.documentElement.setAttribute("data-font-tier", fontTier);
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
  const count = dockItems.length + 1;
  const center = (count - 1) / 2;
  const sizes = dockSizes(count, pointer, { step: STEP });
  const mouseNearest = pointer === null ? -1 : Math.max(0, Math.min(count - 1, Math.round(pointer / STEP + center)));
  const showTip = (i: number) => touchAt === i || (pointer !== null && i === mouseNearest && Math.abs(pointer - (i - center) * STEP) < 40);
  const sizeStyle = (i: number) => (pointer === null ? undefined : { width: sizes[i], height: sizes[i] });
  const itemClass = (i: number, extra: string) => `dock-item${extra}${pointer === null ? " calm" : ""}${touchAt === i ? " touched" : ""}`;

  function chooseFont(next: FontTier) {
    setFontTier(next);
    writeFontTier(browserStore(), next);
  }

  function toggleTray() {
    setPointer(null); setTouchAt(null);
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
    if (event.pointerType === "mouse" && window.innerWidth >= MAGNIFY_MIN_WIDTH) {
      const box = event.currentTarget.getBoundingClientRect();
      setPointer(event.clientX - (box.left + box.width / 2));
    } else {
      setTouchAt(itemAt(event.currentTarget, event.clientX));
    }
  }

  function release() { setPointer(null); setTouchAt(null); }

  const third = 1 / FEATURE_GROUPS.length;
  const pill = {
    left: `calc(5px + (100% - 10px) * ${(tab * third).toFixed(4)})`,
    right: `calc(5px + (100% - 10px) * ${((FEATURE_GROUPS.length - 1 - tab) * third).toFixed(4)})`,
  };

  return <>
    <div className="site-dock-space" aria-hidden="true" />
    <button className={`dock-veil${open ? " open" : ""}`} type="button" tabIndex={-1} aria-hidden="true" onClick={() => setOpen(false)} />
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
          {(["small", "medium", "large"] as FontTier[]).map((tier, index) => <button type="button" key={tier} className={fontTier === tier ? "on" : ""} aria-pressed={fontTier === tier} onClick={() => chooseFont(tier)}>{["小", "中", "大"][index]}</button>)}
        </div>
        <Link className="dock-account" href="/account" onClick={() => setOpen(false)}>會員中心<Icon path="M5 12h14 M13 6l6 6-6 6" size={14} /></Link>
      </div>
    </section>
    <nav className="site-dock" aria-label="常用功能" onPointerMove={track} onPointerDown={track} onPointerLeave={release} onPointerUp={(event) => { if (event.pointerType !== "mouse") release(); }} onPointerCancel={release}>
      {dockItems.map((item, i) => {
        const here = isCurrentFeature(item, pathname);
        return <Link key={item.id} href={item.href} className={itemClass(i, here ? " here" : "")} style={sizeStyle(i)} aria-label={item.title} aria-current={here ? "page" : undefined} onClick={() => setOpen(false)}>
          <Icon path={item.icon} />
          <span className="dock-dot" aria-hidden="true" />
          <span className={`dock-tip${showTip(i) ? " show" : ""}`} aria-hidden="true">{item.title}</span>
        </Link>;
      })}
      <button ref={plusRef} type="button" className={itemClass(dockItems.length, ` dock-all${open ? " open" : ""}`)} style={sizeStyle(dockItems.length)} aria-label={open ? "收起全部功能" : "全部功能"} aria-expanded={open} aria-controls="dock-tray" onClick={toggleTray}>
        <Icon path={FEATURE_ICONS.plus} />
        <span className={`dock-tip${showTip(dockItems.length) ? " show" : ""}`} aria-hidden="true">{open ? "收起" : "全部功能"}</span>
      </button>
    </nav>
  </>;
}
