"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import type { TarotCard } from "./tarot-data";
import { DESK, MOTION, PHONE, clamp, easeOutCubic, flingTarget, openRank, placeCard, rubberBand, type Mode } from "@/lib/draw-fan-math";

/**
 * Draw interaction v4 (ChatGPT spec, 2026-11-13).
 * Phone: one row of cards she swipes through; it carries on a little after a fling and settles
 * on a card. Tapping a side card brings it to the middle; tapping the middle card picks it.
 * Desktop: every card on an arc; the card under the mouse lifts and tilts; a click picks it.
 * The picked card flies into its place in the spread above the fan before the next pick.
 * Keyboard: ←/→, Home, End move between cards; Enter or Space picks.
 */
export type DrawFanProps = {
  cards: TarotCard[];
  positions: string[];
  pickedCount: number;
  ready: boolean;
  deal: number;
  onPick: (card: TarotCard) => void;
};

type Flight = { id: string; left: number; top: number; width: number; height: number; rotate: number; dx: number; dy: number; scale: number };

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const phoneQuery = "(max-width: 600px)";

export default function DrawFan({ cards, positions, pickedCount, ready, deal, onPick }: DrawFanProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardEls = useRef(new Map<string, HTMLButtonElement>());
  const slotEls = useRef<Array<HTMLLIElement | null>>([]);
  const [mode, setMode] = useState<Mode>(() => (typeof window !== "undefined" && window.matchMedia(phoneQuery).matches ? "phone" : "desk"));
  const stageWidth = useRef(0);
  const centre = useRef((cards.length - 1) / 2);
  const [active, setActive] = useState(Math.round((cards.length - 1) / 2));
  const [flight, setFlight] = useState<Flight | null>(null);
  const [landed, setLanded] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const busy = useRef(false);
  const frame = useRef(0);
  const drag = useRef<{ id: number; x0: number; from: number; moving: boolean; samples: Array<{ t: number; x: number }> } | null>(null);
  const swallowClick = useRef(false);
  const keepFocus = useRef(false);
  const filled = Math.max(pickedCount, landed);
  const count = cards.length;
  // after a pick the card that slides into the picked one's place becomes the current card
  const activeIndex = clamp(active, 0, Math.max(0, count - 1));

  function layout() {
    const width = stageWidth.current || stageRef.current?.clientWidth || 390;
    cards.forEach((card, index) => {
      const el = cardEls.current.get(card.id);
      if (!el) return;
      const p = placeCard(index, count, centre.current, mode, width);
      el.style.transform = `translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, 0) rotate(${p.rotate.toFixed(2)}deg) scale(${p.scale.toFixed(3)})`;
      el.style.zIndex = String(p.z);
    });
  }

  function setMotion(name: "" | "stacked" | "opening" | "settling") {
    if (stageRef.current) stageRef.current.dataset.motion = name;
  }
  const relayout = useRef(layout);
  useLayoutEffect(() => { relayout.current = layout; });

  // phone or desktop, and how wide the table is (a resize never interrupts the fan opening)
  useEffect(() => {
    const query = window.matchMedia(phoneQuery);
    const update = () => setMode(query.matches ? "phone" : "desk");
    query.addEventListener("change", update);
    const stage = stageRef.current;
    const observer = new ResizeObserver(([entry]) => {
      if (Math.abs(entry.contentRect.width - stageWidth.current) < 1) return;
      stageWidth.current = entry.contentRect.width;
      const motion = stageRef.current?.dataset.motion;
      if (motion !== "stacked" && motion !== "opening") relayout.current();
    });
    if (stage) observer.observe(stage);
    return () => { query.removeEventListener("change", update); observer.disconnect(); };
  }, []);

  // A new deal (the fan is keyed by it): cards start stacked in the middle and open outwards,
  // nearest the middle first.
  useLayoutEffect(() => {
    stageWidth.current = stageRef.current?.clientWidth ?? 0;
    if (reducedMotion()) { setMotion(""); layout(); return; }
    setMotion("stacked");
    cards.forEach((card) => {
      const el = cardEls.current.get(card.id);
      if (el) { el.style.transform = "translate3d(0, 18px, 0) scale(.94)"; el.style.zIndex = "1"; }
    });
    void stageRef.current?.offsetWidth;
    const open = requestAnimationFrame(() => { setMotion("opening"); layout(); });
    const done = window.setTimeout(() => setMotion(""), MOTION.openMs + MOTION.openStaggerMs * 7 + 60);
    return () => { cancelAnimationFrame(open); window.clearTimeout(done); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal]);

  // After a pick the others close the gap; switching between phone and desktop re-lays the fan.
  const ids = cards.map((card) => card.id).join(",");
  const laidOut = useRef(ids);
  const firstLayout = useRef(true);
  useLayoutEffect(() => {
    if (firstLayout.current) { firstLayout.current = false; return; }
    const removed = laidOut.current !== ids;
    laidOut.current = ids;
    centre.current = clamp(Math.round(centre.current), 0, Math.max(0, count - 1));
    const nextActive = mode === "phone" ? Math.round(centre.current) : activeIndex;
    // a keyboard pick keeps the focus in the fan, on the card that took the picked one's place
    if (keepFocus.current && cards[nextActive]) {
      keepFocus.current = false;
      cardEls.current.get(cards[nextActive].id)?.focus({ preventScroll: true });
    }
    if (removed && !reducedMotion()) {
      // the next pick waits until the others have closed the gap (PR #25 review)
      setMotion("settling");
      const done = window.setTimeout(() => { setMotion(""); busy.current = false; }, MOTION.settleMs);
      layout();
      return () => window.clearTimeout(done);
    }
    busy.current = false;
    layout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, mode]);

  function glideTo(target: number, ms: number = MOTION.snapMs) {
    cancelAnimationFrame(frame.current);
    const goal = clamp(target, 0, Math.max(0, count - 1));
    setActive(goal);
    if (reducedMotion()) { centre.current = goal; layout(); return; }
    const from = centre.current;
    let start = -1;
    const tick = (now: number) => {
      if (start < 0) start = now;
      const t = Math.min(1, (now - start) / ms);
      centre.current = from + (goal - from) * easeOutCubic(t);
      layout();
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }

  // ---------- phone: swipe ----------
  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (mode !== "phone" || !ready || busy.current || event.button !== 0) return;
    cancelAnimationFrame(frame.current);
    setMotion("");
    swallowClick.current = false;
    drag.current = { id: event.pointerId, x0: event.clientX, from: centre.current, moving: false, samples: [{ t: event.timeStamp, x: event.clientX }] };
  }
  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const dx = event.clientX - d.x0;
    if (!d.moving) {
      if (Math.abs(dx) < MOTION.dragThreshold) return;
      d.moving = true;
      stageRef.current?.setPointerCapture(event.pointerId);
    }
    d.samples.push({ t: event.timeStamp, x: event.clientX });
    if (d.samples.length > 8) d.samples.shift();
    centre.current = rubberBand(d.from - dx / PHONE.step, count);
    layout();
  }
  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== event.pointerId || !d.moving) return;
    // the click that ends this swipe is not a pick; nothing after it is swallowed
    swallowClick.current = true;
    window.setTimeout(() => { swallowClick.current = false; }, 0);
    const last = d.samples[d.samples.length - 1];
    const first = d.samples.find((sample) => last.t - sample.t <= 90) ?? d.samples[0];
    const velocity = last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
    const target = flingTarget(centre.current, velocity, count);
    glideTo(target, MOTION.snapMs + Math.min(MOTION.momentumMs, Math.abs(target - centre.current) * 45));
  }
  // an interrupted swipe settles on the nearest card, without a fling
  function onPointerCancel(event: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== event.pointerId || !d.moving) return;
    glideTo(Math.round(centre.current));
  }

  // ---------- desktop: lift and tilt under the mouse ----------
  const tiltFrame = useRef(0);
  function onCardMove(event: PointerEvent<HTMLButtonElement>) {
    if (mode !== "desk" || event.pointerType !== "mouse" || reducedMotion()) return;
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    cancelAnimationFrame(tiltFrame.current);
    tiltFrame.current = requestAnimationFrame(() => {
      const inner = el.firstElementChild as HTMLElement | null;
      if (inner) inner.style.transform = `rotateX(${(-y * 12).toFixed(2)}deg) rotateY(${(x * 12).toFixed(2)}deg)`;
    });
  }
  function onCardLeave(event: PointerEvent<HTMLButtonElement>) {
    cancelAnimationFrame(tiltFrame.current);
    const inner = event.currentTarget.firstElementChild as HTMLElement | null;
    if (inner) inner.style.transform = "";
  }

  // ---------- choosing ----------
  function onCardClick(index: number, event: MouseEvent<HTMLButtonElement>) {
    if (swallowClick.current) { swallowClick.current = false; return; }
    if (!ready || busy.current) return;
    // a tap on a side card first brings it to the middle; the keyboard picks straight away
    if (mode === "phone" && event.detail !== 0 && index !== Math.round(centre.current)) { glideTo(index); return; }
    pick(index);
  }

  function pick(index: number) {
    const card = cards[index];
    const el = card ? cardEls.current.get(card.id) : null;
    const slot = slotEls.current[filled];
    if (!card || !el || !slot || busy.current || filled >= positions.length) return;
    busy.current = true;
    keepFocus.current = Boolean(stageRef.current?.contains(document.activeElement));
    cancelAnimationFrame(frame.current);
    navigator.vibrate?.(10);
    const next = filled + 1;
    setAnnouncement(next < positions.length
      ? `已選第 ${next} 張：${positions[filled]}。請選第 ${next + 1} 張：${positions[next]}。`
      : `已選第 ${next} 張：${positions[filled]}。正在翻開妳的牌。`);
    if (reducedMotion()) { setLanded(next); onPick(card); return; }
    const box = el.getBoundingClientRect();
    const target = slot.querySelector(".fan4-slot-card")?.getBoundingClientRect() ?? slot.getBoundingClientRect();
    const p = placeCard(index, count, centre.current, mode, stageWidth.current || stageRef.current?.clientWidth || 390);
    const width = (mode === "phone" ? PHONE.width : DESK.width) * p.scale;
    const height = (mode === "phone" ? PHONE.height : DESK.height) * p.scale;
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    el.style.visibility = "hidden";
    setFlight({
      id: card.id, left: cx - width / 2, top: cy - height / 2, width, height, rotate: p.rotate,
      dx: target.left + target.width / 2 - cx, dy: target.top + target.height / 2 - cy, scale: target.width / width,
    });
  }

  // the flight itself: up a little, then into the slot, upright and slot-sized
  const flightEl = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!flight || !flightEl.current) return;
    const card = cards.find((item) => item.id === flight.id);
    const animation = flightEl.current.animate([
      { transform: `translate3d(0, 0, 0) rotate(${flight.rotate}deg) scale(1)` },
      { transform: `translate3d(${flight.dx * 0.28}px, ${flight.dy * 0.28 - 34}px, 0) rotate(${flight.rotate * 0.4}deg) scale(1.06)`, offset: 0.38 },
      { transform: `translate3d(${flight.dx}px, ${flight.dy}px, 0) rotate(0deg) scale(${flight.scale})` },
    ], { duration: MOTION.flightMs, easing: MOTION.flightEase, fill: "forwards" });
    animation.onfinish = () => {
      setLanded(filled + 1);
      setFlight(null);
      if (card) onPick(card);
    };
    return () => { animation.onfinish = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flight]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, number> = { ArrowLeft: activeIndex - 1, ArrowRight: activeIndex + 1, Home: 0, End: count - 1 };
    if (!(event.key in moves) || !count) return;
    event.preventDefault();
    const next = clamp(moves[event.key], 0, count - 1);
    setActive(next);
    cardEls.current.get(cards[next].id)?.focus({ preventScroll: true });
    if (mode === "phone") glideTo(next);
  }

  const hint = mode === "phone" ? "左右滑動看牌，點一下置中，再點一次就選定" : "移到喜歡的牌上，點一下就選定";

  return <div className={`fan4 fan4--${mode}`}>
    <ol className={`fan4-slots count-${positions.length}`} aria-label="牌陣位置">
      {positions.map((label, index) => <li key={label} ref={(el) => { slotEls.current[index] = el; }} data-slot={index}
        className={index < filled ? "is-filled" : index === filled ? "is-next" : ""}>
        <div className="fan4-slot-card">{index < filled ? <span className="fan4-back" /> : <b>{index + 1}</b>}</div>
        <p>{label}</p>
      </li>)}
    </ol>
    <div ref={stageRef} className="fan4-stage" role="group" aria-roledescription="牌扇" aria-label={`展開的牌，共 ${count} 張。${hint}。也可以用左右方向鍵瀏覽，按 Enter 選定。`}
      aria-busy={!ready} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onKeyDown={onKeyDown}>
      {cards.map((card, index) => <button key={card.id} type="button" className="fan4-card" data-rank={openRank(index, count)}
        style={{ "--rank": openRank(index, count) } as React.CSSProperties}
        ref={(el) => { if (el) cardEls.current.set(card.id, el); else cardEls.current.delete(card.id); }}
        tabIndex={index === activeIndex ? 0 : -1} aria-label={`第 ${index + 1} 張牌，共 ${count} 張`} aria-disabled={!ready}
        onClick={(event) => onCardClick(index, event)} onPointerMove={onCardMove} onPointerLeave={onCardLeave}>
        <span className="fan4-tilt"><span className="fan4-back" /></span>
      </button>)}
    </div>
    <p className="fan4-hint">{hint}</p>
    <p className="sr-only" aria-live="polite">{announcement}</p>
    {flight && typeof document !== "undefined" ? createPortal(<div ref={flightEl} className="fan4-flight" aria-hidden="true"
      style={{ left: flight.left, top: flight.top, width: flight.width, height: flight.height }}><span className="fan4-back" /></div>, document.body) : null}
  </div>;
}
