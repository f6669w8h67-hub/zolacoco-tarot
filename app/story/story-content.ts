// Generated from the storybook demo (demo-fusion/src.html): its stylesheet, scoped to a shadow root,
// and its markup. Edit the demo and regenerate rather than editing these strings by hand.
export const STORY_CSS = `
/* Pearl Rococo storybook over a fixed rose stardust canvas; chapters scroll past, the dust re-forms into each chapter's object, the finale is a draw fan. */
:host {
  /* A 珍珠香檳: ivory pearl ground, one champagne-gold dust, rose titles, warm grey text */
  --pearl: #fbf7f5;
  --ink: #483f47;
  --muted: #6a5e67;
  --rose: #8a3a59;
  --gold: #c4a46c;
  --gold-text: #7a5a33;
  --paper: #fffdfb;
  --halo: #fbf7f5;
  --pool: rgba(251, 247, 245, .82);
  --tile: .1;
  --veil: #fbf5f6;
  --frame-line: rgba(196, 164, 108, .75);
  --stage-glow: radial-gradient(ellipse 60% 70% at 50% 100%, rgba(246, 222, 232, .9), rgba(246, 222, 232, 0) 70%);
  --bg:
    radial-gradient(ellipse 75% 45% at 8% 0%, rgba(250, 228, 236, .95) 0%, rgba(250, 228, 236, 0) 70%),
    radial-gradient(ellipse 70% 50% at 100% 60%, rgba(231, 239, 251, .9) 0%, rgba(231, 239, 251, 0) 70%),
    radial-gradient(ellipse 70% 40% at 20% 100%, rgba(250, 236, 240, .9) 0%, rgba(250, 236, 240, 0) 70%),
    #fbf7f5;
  --font-display: "Noto Serif TC", "Songti TC", Georgia, serif;
  --font-latin: "Cormorant Garamond", Georgia, "Times New Roman", serif;
  --font-body: "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
  --frame: 8px;
  color-scheme: light;
}
* { box-sizing: border-box; }
:host { display: block; position: relative; color: var(--ink); font-family: var(--font-body); letter-spacing: .015em; -webkit-font-smoothing: antialiased; text-align: left; line-height: normal; }
img { max-width: 100%; display: block; }
a { color: inherit; }
:where(a, button):focus-visible { outline: 2px solid var(--gold-text); outline-offset: 3px; border-radius: 6px; }

/* ---------- fixed layers ---------- */
#dust { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; }
/* chapters II and III share one sky: it rises in as the pendulum chapter arrives and lifts away before the finale */
.sky { position: fixed; inset: 0; z-index: 1; pointer-events: none; opacity: var(--sky, 0); visibility: hidden; }
.sky.on { visibility: visible; }
.sky img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 58%; transform: translateY(calc((1 - var(--sky, 0)) * 7%)) scale(1.06); }
.sparkles { position: fixed; inset: 0; z-index: 1; pointer-events: none; overflow: hidden; opacity: calc((1 - var(--sky, 0)) * (1 - var(--out, 0))); }
.sparkles i {
  position: absolute; width: var(--s); height: var(--s);
  background: var(--c);
  clip-path: polygon(50% 0, 58% 42%, 100% 50%, 58% 58%, 50% 100%, 42% 58%, 0 50%, 42% 42%);
  animation: twinkle var(--d) ease-in-out var(--delay) infinite;
  opacity: .2;
}
@keyframes twinkle { 0%, 100% { opacity: .15; transform: scale(.6) rotate(0); } 50% { opacity: .95; transform: scale(1) rotate(45deg); } }


.chapters-nav { position: fixed; right: 16px; top: 50%; transform: translateY(-50%); z-index: 31; display: grid; gap: 6px; opacity: calc(1 - var(--out, 0)); transition: visibility .3s; }
.chapters-nav.gone { visibility: hidden; }
.chapters-nav a { width: 28px; height: 28px; display: grid; place-items: center; text-decoration: none; }
.chapters-nav a::before { content: ""; width: 7px; height: 7px; transform: rotate(45deg); border: 1px solid var(--gold); background: rgba(255, 255, 255, .7); transition: background .3s, transform .3s; }
.chapters-nav a[aria-current="true"]::before { background: var(--gold); transform: rotate(45deg) scale(1.35); }

/* ---------- chapters ---------- */
.story-main { position: relative; z-index: 2; overflow-x: hidden; overflow-x: clip; }
.chapter { position: relative; min-height: 108svh; padding: 50svh 26px 12svh; display: grid; align-content: start; justify-items: center; gap: 22px; }
.chapter.hero { padding-top: 47svh; min-height: 100svh; }
.copy {
  width: min(100%, 470px);
  padding: 4px 6px;
  position: relative;
  text-align: center;
  text-shadow: 0 0 14px var(--halo), 0 0 4px var(--halo), 0 0 1px var(--halo);
}
.copy::before {
  content: ""; position: absolute; inset: -44px -26px; z-index: -1; pointer-events: none;
  background: radial-gradient(closest-side, var(--pool) 0%, var(--pool) 45%, rgba(255, 255, 255, 0) 100%);
}
.copy .actions { justify-content: center; }
.copy h1::after, .copy h2::after { margin-inline: auto; }
.mark { display: grid; justify-items: center; gap: 2px; margin: 0 0 10px; }
.mark .roman { display: flex; align-items: center; gap: 14px; font: italic 500 46px/1 var(--font-latin); color: var(--gold); }
.mark .roman::before, .mark .roman::after { content: ""; width: 42px; height: 1px; background: var(--gold); opacity: .8; }
.mark .zh { font: 500 12px/1.4 var(--font-display); letter-spacing: .32em; color: var(--rose); }
.mark .zh i { font: italic 600 14px/1 var(--font-latin); letter-spacing: .14em; color: var(--gold-text); margin-left: 6px; }
.copy h1::after, .copy h2::after {
  content: ""; display: block; width: 88px; height: 10px; margin-top: 12px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='88' height='10'%3E%3Cpath d='M0 5h34M54 5h34' stroke='%23c4a46c'/%3E%3Cpath d='M44 1l4 4-4 4-4-4z' fill='%23c4a46c'/%3E%3C/svg%3E") 0 0 / 88px 10px no-repeat;
}
.copy .eyebrow { margin: 0 0 10px; font: italic 600 14px/1.3 var(--font-latin); letter-spacing: .14em; color: var(--gold-text); }
.eyebrow b { font: 500 12px/1 var(--font-display); font-style: normal; letter-spacing: .24em; color: var(--rose); margin-right: 8px; }
h1, h2, h3 { font-family: var(--font-display); color: var(--rose); text-wrap: balance; letter-spacing: .05em; }
h1 { margin: 0 0 12px; font-size: clamp(26px, 7vw, 44px); line-height: 1.35; font-weight: 700; }
h1 span { display: block; }
h1 em { display: block; font-style: normal; color: var(--ink); }
h2 { margin: 0 0 10px; font-size: clamp(25px, 6.4vw, 38px); line-height: 1.35; font-weight: 700; }
.copy .brandmark { margin: 0 0 6px; font: italic 600 clamp(34px, 10vw, 64px)/1 var(--font-latin); color: var(--rose); letter-spacing: .02em; }
.copy p { margin: 0 0 12px; line-height: 1.85; font-size: 15px; color: var(--muted); }
.copy p.lead { color: var(--ink); font-size: 16px; }
.copy .ritual { font-family: var(--font-display); color: var(--gold-text); font-size: 13.5px; letter-spacing: .12em; margin: 14px 0 0; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 46px; padding: 0 20px; border-radius: 999px;
  font: 500 15px/1 var(--font-display); letter-spacing: .08em; text-decoration: none; cursor: pointer;
  border: 1px solid var(--gold); transition: transform .2s ease, box-shadow .2s ease, background .2s ease;
}
.btn.primary { background: linear-gradient(180deg, #fbe6ee, #f1d3de); color: #51323d; box-shadow: 0 4px 14px rgba(132, 52, 80, .12), inset 0 1px 0 rgba(255, 255, 255, .8); }
.btn.secondary { background: rgba(255, 253, 251, .85); color: var(--ink); }
.btn:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(132, 52, 80, .16); }
.note { font-size: 13px !important; color: var(--muted) !important; line-height: 1.7 !important; }
.more { display: inline-flex; gap: 6px; margin-top: 4px; font: 500 15px/1 var(--font-display); color: var(--rose); letter-spacing: .1em; text-decoration: none; border-bottom: 1px solid var(--gold); padding-bottom: 4px; }
.scroll-cue { display: grid; justify-items: center; gap: 6px; font: italic 600 13px/1 var(--font-latin); letter-spacing: .18em; color: var(--gold-text); text-decoration: none; }
.scroll-cue span { font: 500 12px/1 var(--font-display); font-style: normal; letter-spacing: .2em; }
.scroll-cue svg { animation: bob 1.8s ease-in-out infinite; }
@keyframes bob { 50% { transform: translateY(5px); } }

/* immersive worlds: full-bleed, no frame; the art dissolves into the pearl page at top and bottom */
.world { position: relative; width: 100vw; margin-inline: calc(50% - 50vw); height: min(92svh, 780px); overflow: hidden; touch-action: pan-y; -webkit-user-select: none; user-select: none; }
.world .bg { position: absolute; inset: -3%; -webkit-mask: linear-gradient(to bottom, transparent 0, #000 16%, #000 80%, transparent 100%); mask: linear-gradient(to bottom, transparent 0, #000 16%, #000 80%, transparent 100%); transform: translate3d(var(--px, 0px), var(--py, 0px), 0); transition: transform .5s ease-out; }
.world .bg img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 45%; }
.world-ui { position: absolute; left: 0; right: 0; bottom: 6%; z-index: 3; display: grid; justify-items: center; gap: 12px; padding: 0 24px; text-align: center; text-shadow: 0 0 14px var(--halo), 0 0 4px var(--halo), 0 0 1px var(--halo); }
.world-hint { margin: 0; font: 500 13.5px/1.6 var(--font-display); letter-spacing: .1em; color: var(--gold-text); }
.world-title { margin: 0; font: 700 22px/1.3 var(--font-display); letter-spacing: .12em; color: var(--rose); }
.world-title i { font: italic 600 22px/1 var(--font-latin); color: var(--gold-text); margin-right: 8px; letter-spacing: .04em; }
.world-title small { display: block; margin-top: 6px; font: 500 13px/1 var(--font-display); letter-spacing: .3em; color: var(--muted); }
.world-result { min-height: 0; max-width: 30em; }
.world-result .big { margin: 0; font: 700 34px/1.2 var(--font-display); letter-spacing: .14em; color: var(--rose); animation: rise .6s ease-out both; }
.world-result .big i { display: block; margin-top: 4px; font: italic 600 15px/1 var(--font-latin); letter-spacing: .2em; color: var(--gold-text); }
.world-result .line { margin: 8px 0 0; font-size: 15px; line-height: 1.8; color: var(--ink); animation: rise .6s .15s ease-out both; }
.world-result .dice-line { margin: 0; font: 700 21px/1.5 var(--font-display); letter-spacing: .08em; color: var(--rose); animation: rise .6s ease-out both; }
.world-result .dice-line b { color: var(--gold); font-weight: 500; margin: 0 6px; }
@keyframes rise { from { opacity: 0; transform: translateY(8px); } }

/* chapter I: a free-floating Star card that tilts under the finger */
.card-world { height: min(84svh, 720px); }
.card-world::before { content: ""; position: absolute; left: 50%; top: 44%; width: 120vmin; height: 120vmin; transform: translate(-50%, -50%); background: radial-gradient(closest-side, rgba(251, 247, 245, .9), rgba(251, 247, 245, 0)); pointer-events: none; }
.holo-wrap { position: absolute; left: 50%; top: 6%; width: min(64vw, 300px); transform: translateX(-50%); animation: hover 5s ease-in-out infinite; }
@keyframes hover { 50% { translate: 0 -10px; } }
.holo { display: block; width: 100%; padding: 0; border: 0; background: none; -webkit-tap-highlight-color: transparent; position: relative; aspect-ratio: 5 / 8; border-radius: 18px; overflow: hidden; transform: perspective(1100px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)); transition: transform .5s cubic-bezier(.2, .8, .2, 1); box-shadow: 0 30px 60px rgba(132, 52, 80, .18), 0 8px 18px rgba(72, 63, 71, .12); cursor: grab; }
.holo.dragging { transition: none; cursor: grabbing; }
.holo:focus-visible { outline: 2px solid var(--gold-text); outline-offset: 6px; }
.holo img { width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
.holo .sheen { position: absolute; inset: 0; pointer-events: none; mix-blend-mode: soft-light; background: linear-gradient(115deg, rgba(255, 255, 255, 0) 30%, rgba(255, 255, 255, .75) 46%, rgba(255, 196, 220, .6) 52%, rgba(255, 255, 255, 0) 66%) var(--sx, 50%) 0 / 260% 100% no-repeat; }
.spark { position: absolute; width: 14px; height: 14px; margin: -7px 0 0 -7px; pointer-events: none; z-index: 4; filter: drop-shadow(0 0 3px var(--c)) drop-shadow(0 0 8px var(--c)); animation: burst 1s ease-out forwards; }
.spark::before { content: ""; position: absolute; inset: 0; background: #fff; clip-path: polygon(50% 0, 58% 42%, 100% 50%, 58% 58%, 50% 100%, 42% 58%, 0 50%, 42% 42%); }
@keyframes burst { from { opacity: 1; transform: translate(0, 0) scale(.4) rotate(0); } to { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(1.1) rotate(90deg); } }

/* when WebGL is ready the cloud-sea canvas replaces the painted room, pendulum and die */
.world canvas.gl { position: absolute; inset: 0; width: 100%; height: 100%; display: block; -webkit-mask: linear-gradient(to bottom, transparent 0, #000 14%, #000 82%, transparent 100%); mask: linear-gradient(to bottom, transparent 0, #000 14%, #000 82%, transparent 100%); }
#diceWorld.gl-ready { cursor: grab; }
#diceWorld:focus-visible { outline: 2px solid var(--gold-text); outline-offset: -8px; }

/* chapter II: the pendulum hangs from the top of the room */
.pend { position: absolute; left: 50%; top: 1%; height: 60%; aspect-ratio: 226 / 1100; transform-origin: 50% 0; transform: translateX(-50%) rotate(var(--a, 0rad)) scale(var(--s, 1)) scaleY(var(--sy, 1)); filter: drop-shadow(0 10px 12px rgba(80, 110, 160, .28)); cursor: grab; z-index: 2; }
.pend img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; pointer-events: none; }
.pend .aura { position: absolute; left: 50%; top: 72%; width: 260%; aspect-ratio: 1; transform: translate(-50%, -50%); border-radius: 50%; background: radial-gradient(closest-side, rgba(255, 255, 255, .95), rgba(255, 236, 244, .55) 45%, rgba(255, 236, 244, 0)); animation: breathe 4s ease-in-out infinite; }
@keyframes breathe { 50% { opacity: .65; transform: translate(-50%, -50%) scale(.9); } }
.pend .glint { position: absolute; left: 36%; top: 64%; width: 34%; aspect-ratio: 1; background: #fff; clip-path: polygon(50% 0, 56% 44%, 100% 50%, 56% 56%, 50% 100%, 44% 56%, 0 50%, 44% 44%); filter: drop-shadow(0 0 4px #fff) drop-shadow(0 0 8px rgba(255, 214, 230, .9)); animation: glint 3.2s ease-in-out infinite; }
.pend .glint.g2 { left: 58%; top: 77%; width: 22%; animation-delay: -1.6s; }
@keyframes glint { 0%, 70%, 100% { opacity: 0; transform: scale(.3) rotate(0); } 82% { opacity: 1; transform: scale(1) rotate(45deg); } }
.trail { position: absolute; width: 10px; height: 10px; margin: -5px 0 0 -5px; pointer-events: none; z-index: 1; filter: drop-shadow(0 0 3px #fff) drop-shadow(0 0 6px rgba(212, 142, 168, .9)); animation: trail 1.4s ease-out forwards; }
.trail::before { content: ""; position: absolute; inset: 0; background: #fff; clip-path: polygon(50% 0, 58% 42%, 100% 50%, 58% 58%, 50% 100%, 42% 58%, 0 50%, 42% 42%); }
@keyframes trail { from { opacity: .95; transform: scale(1); } to { opacity: 0; transform: translate(var(--dx), 40px) scale(.3); } }

/* the dowsing chart under the pendulum is painted on one canvas behind it */
.pend-fx { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; }

/* the pendulum's question field and the line that drifts into the chart */
.ask-form { margin: 0; }
.ask-form[hidden], .world-hint[hidden] { display: none; }
.ask-input { width: min(300px, 78vw); height: 44px; padding: 0 18px; border-radius: 999px; border: 1px solid rgba(197, 164, 111, .75); background: rgba(255, 253, 251, .85); font: 500 16px/1 var(--font-display); letter-spacing: .04em; color: var(--ink); text-align: center; outline: none; box-shadow: 0 4px 14px rgba(132, 52, 80, .08); -webkit-appearance: none; appearance: none; }
.ask-input::placeholder { color: rgba(122, 90, 51, .62); font-size: 14px; letter-spacing: .08em; }
.ask-input:focus { border-color: var(--gold); box-shadow: 0 0 0 4px rgba(246, 219, 229, .85); }
.q-float { position: absolute; z-index: 4; pointer-events: none; transform: translate(-50%, -50%); font: 700 16px/1.4 var(--font-display); letter-spacing: .06em; color: var(--rose); white-space: nowrap; text-shadow: 0 0 10px #fff, 0 0 18px rgba(255, 190, 214, .9); transition: transform 1.4s cubic-bezier(.3, .7, .2, 1), opacity 1.4s ease-in; }
.world-result .q { margin: 0 0 6px; font: 500 13.5px/1.5 var(--font-display); letter-spacing: .06em; color: var(--gold-text); animation: rise .6s ease-out both; }

/* small text buttons inside the worlds */
.link-btn { border: 0; background: none; padding: 4px 8px; font: 500 13px/1.5 var(--font-display); letter-spacing: .08em; color: var(--gold-text); text-decoration: underline; text-decoration-color: rgba(197, 164, 111, .6); text-underline-offset: 4px; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.link-btn.on { text-decoration: none; color: var(--rose); }
.link-btn[hidden] { display: none; }

/* chapter III: the die rests on the middle of the table */
.die { position: absolute; left: 50%; top: 50%; width: min(32vw, 190px); aspect-ratio: 1; margin: 0; padding: 0; border: 0; background: none; cursor: pointer; transform: translate(-50%, -62%); z-index: 2; filter: drop-shadow(0 14px 14px rgba(80, 110, 160, .22)); animation: idleDie 4.6s ease-in-out infinite; -webkit-tap-highlight-color: transparent; }
.die img { width: 100%; height: 100%; object-fit: contain; pointer-events: none; }
.die .face { position: absolute; left: 0; top: 0; width: 100px; height: 100px; transform-origin: 0 0; pointer-events: none; filter: drop-shadow(0 1px 0 rgba(255, 255, 255, .9)) drop-shadow(0 0 1.5px rgba(176, 134, 70, .35)); }
.die .face svg { display: block; width: 100%; height: 100%; overflow: visible; }
.die .face #dieGlyph { font: 600 34px "Apple Symbols", "Segoe UI Symbol", "Noto Sans Symbols 2", "Noto Sans Symbols", "DejaVu Sans", serif; }
.die .face #dieName { font: 600 9px var(--font-display); letter-spacing: .3em; }
.die .face.swap svg { animation: faceIn .7s ease-out; }
@keyframes faceIn { 0% { opacity: 0; filter: blur(3px) brightness(1.6); } 100% { opacity: 1; filter: none; } }
.die:focus-visible { outline: 2px solid var(--gold-text); outline-offset: 6px; border-radius: 24px; }
@keyframes idleDie { 50% { translate: 0 -10px; rotate: 4deg; } }
.die.rolling { animation: toss 1.4s cubic-bezier(.33, .1, .3, 1) both; }
@keyframes toss {
  0% { translate: 0 0; rotate: 0deg; scale: 1; }
  10% { translate: 0 8px; rotate: 0deg; scale: 1.06 .9; }
  34% { translate: 0 -150px; rotate: -14deg; scale: .98 1.04; }
  52% { translate: 0 -175px; rotate: 9deg; scale: 1; }
  74% { translate: 0 0; rotate: 3deg; scale: 1.1 .88; }
  84% { translate: 0 -18px; rotate: -2deg; scale: .98 1.03; }
  92% { translate: 0 0; rotate: 0deg; scale: 1.03 .97; }
  100% { translate: 0 0; rotate: 0deg; scale: 1; }
}
.die-shadow { position: absolute; left: 50%; top: 50%; width: min(30vw, 170px); height: 26px; margin-left: calc(min(30vw, 170px) / -2); border-radius: 50%; background: radial-gradient(closest-side, rgba(150, 140, 190, .38), rgba(150, 140, 190, 0)); transform: translateY(calc(min(32vw, 190px) * .44)); z-index: 1; animation: shadowIdle 4.6s ease-in-out infinite; }
@keyframes shadowIdle { 50% { scale: .9; opacity: .8; } }
.die-shadow.rolling { animation: shadowToss 1.4s cubic-bezier(.33, .1, .3, 1) both; }
@keyframes shadowToss { 0%, 10% { scale: 1.05; opacity: 1; } 34% { scale: .55; opacity: .45; } 52% { scale: .5; opacity: .4; } 74% { scale: 1.12; opacity: 1; } 84% { scale: .95; } 100% { scale: 1; opacity: 1; } }
.die-glow { position: absolute; left: 50%; top: 50%; width: min(70vw, 420px); aspect-ratio: 1; transform: translate(-50%, -62%); border-radius: 50%; background: radial-gradient(closest-side, rgba(255, 255, 255, .85), rgba(255, 240, 246, .35) 50%, rgba(255, 240, 246, 0)); z-index: 1; pointer-events: none; }

/* ---------- finale: draw fan ---------- */
.chapter.finale { padding-top: 40svh; min-height: 120svh; gap: 12px; }
.stage {
  position: relative; width: 100vw; margin-inline: calc(50% - 50vw); height: 520px; overflow: hidden;
  touch-action: pan-y; user-select: none; -webkit-user-select: none;
  background: var(--stage-glow);
}
.stage .hint { position: absolute; z-index: 6; top: 12px; left: 0; right: 0; text-align: center; padding: 0 16px; text-shadow: 0 0 10px var(--halo), 0 0 3px var(--halo); margin: 0; font: 500 13px/1.4 var(--font-display); letter-spacing: .14em; color: var(--gold-text); transition: opacity .3s; }
.fan { position: absolute; inset: 0; z-index: 1; transition: opacity .4s ease; }
.fan.dim { opacity: .28; pointer-events: none; }
/* every card is placed by script: scattered on the clouds, then gathered into a hand fan */
.fan-card {
  --w: 62px; --h: 99px;
  position: absolute; left: 0; top: 0; width: var(--w); height: var(--h); padding: 0; border: 0; background: none; cursor: pointer;
  touch-action: pan-y; -webkit-tap-highlight-color: transparent; will-change: transform;
}
.stage.is-table .fan-card { touch-action: none; cursor: grab; }
.stage.is-table .fan-card.held { cursor: grabbing; }
.fan-card .back {
  display: block; width: 100%; height: 100%; border-radius: 7px; overflow: hidden;
  background: url("/textures/card-back.webp") center / cover;
  border: 1px solid rgba(197, 164, 111, .9);
  box-shadow: 0 6px 16px rgba(72, 63, 71, .16);
  filter: saturate(.45) brightness(1.04);
  transition: transform .28s cubic-bezier(.2, .8, .2, 1), box-shadow .28s ease, filter .4s ease;
}
/* a card only takes its colour when it is picked up */
.fan-card.held .back, .fan-card.peek .back, .fan-card.lift .back, .fan-card:focus-visible .back { filter: none; }
.fan-card.held .back { transform: scale(1.08); box-shadow: 0 16px 28px rgba(132, 52, 80, .22), 0 0 0 2px rgba(197, 164, 111, .6), 0 0 22px rgba(255, 190, 214, .85); }
.stage.is-fan .fan-card.lift .back, .stage.is-fan .fan-card:focus-visible .back { transform: translateY(-26px); box-shadow: 0 0 0 2px rgba(197, 164, 111, .6), 0 12px 26px rgba(132, 52, 80, .22), 0 0 22px rgba(255, 190, 214, .85); }
@media (hover: hover) { .stage.is-fan .fan-card:hover .back { filter: none; transform: translateY(-26px); box-shadow: 0 0 0 2px rgba(197, 164, 111, .6), 0 12px 26px rgba(132, 52, 80, .22), 0 0 22px rgba(255, 190, 214, .85); } }
.fan-card.taken { visibility: hidden; }
.stage-act { position: absolute; left: 0; right: 0; bottom: 16px; z-index: 6; display: flex; justify-content: center; gap: 10px; transition: opacity .35s ease; }
.stage-act[hidden] { display: flex; opacity: 0; pointer-events: none; }
.stage-act .btn.nudge { animation: nudge 1.2s ease-in-out 2; }
@keyframes nudge { 50% { transform: translateY(-4px); box-shadow: 0 0 0 6px rgba(246, 219, 229, .8); } }

.drawn { position: absolute; left: 50%; top: 22px; width: 170px; height: 272px; margin-left: -85px; perspective: 1200px; z-index: 5; pointer-events: none; opacity: 0; }
.drawn.show { opacity: 1; }
.drawn .flip { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform .9s cubic-bezier(.3, .7, .2, 1); }
.drawn.open .flip { transform: rotateY(180deg); }
.drawn .side { position: absolute; inset: 0; border-radius: 10px; overflow: hidden; -webkit-backface-visibility: hidden; backface-visibility: hidden; border: 1px solid var(--gold); box-shadow: 0 18px 40px rgba(38, 52, 73, .22), 0 0 0 4px rgba(255, 253, 251, .6); }
.drawn .b { background: url("/textures/card-back.webp") center / cover; }
.drawn .f { transform: rotateY(180deg); background: var(--paper); padding: 5px; }
.drawn .f .art { position: absolute; inset: 6px 6px 42px; border-radius: 6px; overflow: hidden; outline: 1px solid rgba(197, 164, 111, .6); }
.drawn .f img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 30%; }
/* the name sits in its own strip under the art, never over it */
.drawn .f .tag { position: absolute; left: 0; right: 0; bottom: 0; height: 42px; margin: 0; display: flex; align-items: center; justify-content: center; gap: 0; text-align: center; font: 600 13px/1 var(--font-display); letter-spacing: .18em; color: var(--rose); }
.drawn .f .tag i { font: italic 600 13px/1 var(--font-latin); color: var(--gold-text); margin-right: 6px; letter-spacing: .06em; }

.reading { width: min(100%, 560px); }
.reading[data-state="rest"] .result { display: none; }
.reading[data-state="open"] .rest { display: none; }
.reading .kw { display: inline-block; margin: 0 0 12px; padding: 5px 12px; border-radius: 999px; background: #f4dfe9; color: #6a2a42; font: 500 13px/1.4 var(--font-display); letter-spacing: .12em; }
.reading h3 { margin: 0 0 8px; font-size: 24px; line-height: 1.4; }
.reading h3 i { font: italic 600 20px/1 var(--font-latin); color: var(--gold-text); margin-right: 8px; }
.reading h3 small { display: block; font: italic 600 14px/1.4 var(--font-latin); color: var(--gold-text); letter-spacing: .14em; }
.reading .label { display: flex; align-items: center; justify-content: center; gap: 8px; font: 500 12px/1 var(--font-display); letter-spacing: .24em; color: var(--rose); margin: 18px 0 8px; }
.reading .label::before, .reading .label::after { content: ""; width: 5px; height: 5px; transform: rotate(45deg); background: var(--gold); }
.reading .rest p { font-family: var(--font-display); letter-spacing: .12em; }
.reading p { max-width: 30em; margin-inline: auto !important; }

/* ---------- after the finale: client voices and the plan finder ---------- */
.chapter.after { min-height: 0; padding-top: 16svh; padding-bottom: 6svh; }
.draft-note { display: inline-block; margin: 4px 0 0 !important; padding: 4px 12px; border-radius: 999px; border: 1px dashed rgba(196, 164, 108, .8); font: 500 12.5px/1.5 var(--font-display) !important; letter-spacing: .06em; color: var(--gold-text) !important; }
.reel-wrap { width: calc(100% + 52px); margin-inline: -26px; display: grid; gap: 12px; justify-items: center; }
.reel { width: 100%; display: flex; gap: 14px; overflow-x: auto; overscroll-behavior-x: contain; scroll-snap-type: x mandatory; padding: 10px calc(50% - min(150px, 39vw)) 24px; scrollbar-width: none; outline: none; }
.reel::-webkit-scrollbar { display: none; }
.reel:focus-visible { box-shadow: inset 0 0 0 2px rgba(196, 164, 108, .8); border-radius: 18px; }
.screen { flex: none; width: min(300px, 78vw); height: 470px; scroll-snap-align: center; display: grid; grid-template-rows: auto minmax(0, 1fr); border-radius: 28px; overflow: hidden; background: linear-gradient(180deg, #fdf4f7, #f6e6ed); border: 1px solid rgba(196, 164, 108, .6); box-shadow: 0 18px 36px rgba(132, 52, 80, .12), inset 0 0 0 5px rgba(255, 253, 251, .55); transition: transform .45s cubic-bezier(.2, .8, .2, 1), opacity .45s; }
.screen:not(.on) { opacity: .7; transform: scale(.95); }
.screen-top { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: rgba(255, 253, 251, .94); border-bottom: 1px solid rgba(196, 164, 108, .35); text-align: left; }
.screen-ava { flex: none; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; font: 600 14px/1 var(--font-display); border: 1px solid rgba(196, 164, 108, .8); background: #f6e9ee; color: var(--rose); }
.screen-name b { display: block; font: 600 14px/1.35 var(--font-display); letter-spacing: .06em; color: var(--ink); }
.screen-name small { display: block; margin-top: 1px; font-size: 11.5px; letter-spacing: .06em; color: var(--muted); }
.screen-body { display: flex; flex-direction: column; gap: 10px; padding: 14px 12px 18px; overflow-y: auto; scrollbar-width: none; }
.screen-body::-webkit-scrollbar { display: none; }
.screen-body .chat-day { align-self: center; }
.screen .bub { max-width: 84%; font-size: 14.5px; }
.reel-ctl { display: flex; align-items: center; gap: 12px; }
.reel-ctl[hidden] { display: none; }
.reel-btn { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; border: 1px solid rgba(196, 164, 108, .75); background: rgba(255, 253, 251, .85); color: var(--rose); cursor: pointer; transition: opacity .2s, background .2s; -webkit-tap-highlight-color: transparent; }
.reel-btn:hover:not(:disabled) { background: #fbe6ee; }
.reel-btn:disabled { opacity: .35; cursor: default; }
.reel-dots { display: flex; gap: 0; }
.reel-dot { width: 36px; height: 44px; display: grid; place-items: center; border: 0; padding: 0; background: none; cursor: pointer; }
.reel-dot::before { content: ""; width: 8px; height: 8px; transform: rotate(45deg); border: 1px solid var(--gold); transition: background .25s, border-color .25s; }
.reel-dot[aria-current="true"]::before { background: var(--rose); border-color: var(--rose); }
.msg { display: flex; align-items: flex-end; gap: 8px; animation: pop .45s cubic-bezier(.2, .8, .2, 1) both; }
.msg.me { flex-direction: row-reverse; }
@keyframes pop { from { opacity: 0; transform: translateY(10px) scale(.96); } }
.msg .ava { flex: none; width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; font: 600 14px/1 var(--font-display); border: 1px solid rgba(196, 164, 108, .8); background: #f6e9ee; color: var(--rose); }
.msg.me .ava { background: #1d1a1c; color: #fff; font: italic 600 18px/1 var(--font-latin); border-color: #1d1a1c; }
.chat-day { justify-self: center; margin: 8px 0 0; padding: 3px 12px; border-radius: 999px; background: rgba(255, 253, 251, .75); font: 500 12px/1.6 var(--font-display); letter-spacing: .1em; color: var(--gold-text); animation: pop .45s ease-out both; }
.msg.who-b .ava { background: #e8eefa; color: #4f5f86; }
.bub { margin: 0; max-width: 76%; padding: 10px 14px; border-radius: 18px 18px 18px 6px; font: 500 15px/1.7 var(--font-display); letter-spacing: .03em; color: var(--ink); background: rgba(255, 253, 251, .92); box-shadow: 0 6px 16px rgba(132, 52, 80, .08); text-align: left; }
.msg.me .bub { border-radius: 18px 18px 6px 18px; background: linear-gradient(180deg, #fbe6ee, #f1d3de); color: #51323d; }
.bub.typing { display: flex; gap: 5px; padding: 14px 16px; }
.bub.typing i { width: 7px; height: 7px; border-radius: 50%; background: var(--gold); opacity: .4; animation: dot 1s infinite; }
.bub.typing i:nth-child(2) { animation-delay: .15s; } .bub.typing i:nth-child(3) { animation-delay: .3s; }
@keyframes dot { 50% { opacity: 1; transform: translateY(-3px); } }
.quiz { width: min(100%, 440px); display: grid; justify-items: center; gap: 14px; text-align: center; text-shadow: 0 0 14px var(--halo), 0 0 4px var(--halo); }
.q-dots { display: flex; gap: 10px; margin: 0; }
.q-dots span { width: 9px; height: 9px; transform: rotate(45deg); border: 1px solid var(--gold); }
.q-dots span.done { background: var(--gold); }
.q-dots span.now { background: #f1cbd8; border-color: var(--rose); }
.q-title { margin: 0; font-size: 21px; line-height: 1.5; animation: rise .5s ease-out both; }
.q-opts { width: 100%; display: grid; gap: 10px; }
.q-opt { width: 100%; min-height: 52px; padding: 12px 20px; border-radius: 999px; border: 1px solid rgba(196, 164, 108, .75); background: rgba(255, 253, 251, .8); font: 500 15px/1.5 var(--font-display); letter-spacing: .04em; color: var(--ink); cursor: pointer; transition: background .2s, transform .2s, box-shadow .2s; animation: rise .5s ease-out both; -webkit-tap-highlight-color: transparent; }
.q-opt:nth-child(2) { animation-delay: .06s; } .q-opt:nth-child(3) { animation-delay: .12s; } .q-opt:nth-child(4) { animation-delay: .18s; }
.q-opt:hover, .q-opt:focus-visible { background: #fbe6ee; box-shadow: 0 6px 16px rgba(132, 52, 80, .12); }
.q-opt:active { transform: scale(.98); }
.q-eyebrow { margin: 0; font: 500 13px/1.4 var(--font-display); letter-spacing: .24em; color: var(--gold-text); }
.plan-name { margin: 0; font-size: clamp(28px, 8vw, 36px); line-height: 1.3; animation: rise .6s ease-out both; }
.plan-name small { display: block; margin-top: 4px; font: italic 600 15px/1.2 var(--font-latin); letter-spacing: .16em; color: var(--gold-text); }
.plan-fit { margin: 0; max-width: 26em; font: 500 15.5px/1.8 var(--font-display); color: var(--ink); }
.plan-items { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; font-size: 14.5px; line-height: 1.6; color: var(--muted); }
.plan-items li::before { content: ""; display: inline-block; width: 6px; height: 6px; margin: 0 10px 2px 0; transform: rotate(45deg); background: var(--gold); }
.quiz .actions { justify-content: center; margin-top: 4px; }
.plan-others { margin: 0; font: 500 13px/1.8 var(--font-display); color: var(--muted); }
.plan-others .link-btn { padding: 2px 6px; }

/* the story image opens over a pearl veil; long-press on a phone saves it */
.story-sheet { position: fixed; inset: 0; z-index: 1200; display: grid; place-items: center; padding: 18px; background: rgba(251, 247, 245, .86); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }
.story-sheet[hidden] { display: none; }
.story-inner { display: grid; justify-items: center; gap: 12px; max-width: 420px; text-align: center; }
.story-inner img { display: block; height: min(66svh, 640px); width: auto; max-width: 100%; border-radius: 14px; box-shadow: 0 24px 50px rgba(132, 52, 80, .2); -webkit-touch-callout: default; }
.story-tip { margin: 0; font: 500 14px/1.6 var(--font-display); letter-spacing: .08em; color: var(--gold-text); }
.story-inner .actions { justify-content: center; margin-top: 0; }

@media (min-width: 900px) {
  :host { --frame: 14px; }
  .chapters-nav { right: 30px; }
  .chapter { padding: 18svh 8vw 10svh; justify-items: start; grid-template-columns: minmax(0, 1fr); align-content: start; min-height: 118svh; }
  .chapter .copy { width: 470px; }
  .world { height: min(90vh, 820px); }
  .card-world { height: min(80vh, 700px); }
  .holo-wrap { width: 300px; }
  .chapter.hero { padding-top: 14svh; min-height: 100svh; }
  .chapter.finale { padding-top: 16svh; justify-items: center; grid-template-columns: minmax(0, 980px); align-content: start; }
  .finale .copy, .reading { justify-self: center; }
  .chapter.after { justify-items: center; grid-template-columns: minmax(0, 980px); padding-top: 12svh; }
  .after .copy, .reel-wrap, .quiz { justify-self: center; }
  .reel-wrap { width: 100%; margin-inline: 0; }
  .reel { padding: 10px 24px 24px; }
  .screen:first-child { margin-left: auto; } .screen:last-child { margin-right: auto; }
  .screen:not(.on) { opacity: 1; transform: none; }
  .stage { height: 640px; }
  .fan-card { --w: 100px; --h: 160px; }
  .drawn { width: 220px; height: 352px; margin-left: -110px; top: 22px; }
}
@media (max-width: 899px) {
  .chapters-nav { top: auto; bottom: calc(112px + env(safe-area-inset-bottom)); right: auto; left: calc(var(--frame) + 10px); transform: none; grid-auto-flow: column; gap: 2px; padding: 0 8px; border-radius: 999px; background: rgba(255, 253, 251, .75); }
  .chapters-nav a { width: 24px; height: 24px; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .sparkles i, .holo-wrap, .die, .scroll-cue svg { animation: none; }
  .drawn .flip, .fan-card .back { transition: none; }
}

/* in the site: well past the story its fixed layers leave the page (the story sleeps, see story-engine) */
:host([data-away]) :is(#dust, .sky, .sparkles, .chapters-nav) { display: none; }
/* in the site: the closing chapter hands over to the full draw below */
.chapter.after:last-of-type { padding-bottom: 12svh; }
`;

export const STORY_HTML = `<canvas id="dust" aria-hidden="true"></canvas>
<div class="sky" aria-hidden="true"><img src="/story/cloud-sea.webp" alt=""></div>
<div class="sparkles" aria-hidden="true"></div>


<nav class="chapters-nav" aria-label="章節">
  <a href="#prologue" aria-label="序章" aria-current="true"></a>
  <a href="#tarot" aria-label="第一章 塔羅抽牌"></a>
  <a href="#pendulum" aria-label="第二章 靈擺問答"></a>
  <a href="#dice" aria-label="第三章 星骰指引"></a>
  <a href="#story-draw" aria-label="終章 抽一張牌"></a>
</nav>

<div class="story-main">
  <section class="chapter hero" id="prologue" data-shape="0" data-label="序章|Prologue">
    <div class="copy">
      <p class="brandmark">Zolacoco Tarot</p>
      <p class="eyebrow">A message for your present moment</p>
      <h1><span>把問題放在心裡</span><em>抽一張屬於妳的牌</em></h1>
      <p class="lead">答案不替妳決定人生，而是陪妳看清此刻真正需要留意的方向。</p>
      <div class="actions">
        <a class="btn primary" href="#story-draw">抽一張牌 <span aria-hidden="true">↓</span></a>
        <a class="btn secondary" href="/sign-up" data-cta="join">免費註冊，體驗 3 次</a>
      </div>
      <p class="ritual">深呼吸三次，想著一個妳最近最在意的問題</p>
    </div>
    <a class="scroll-cue" href="#tarot">Chapter I<span>往下翻開第一章</span>
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
    </a>
  </section>

  <section class="chapter" id="tarot" data-shape="1" data-label="第一章|Tarot">
    <div class="copy">
      <p class="mark"><span class="roman">I</span><span class="zh">第一章<i>Tarot</i></span></p>
      <h2>塔羅抽牌</h2>
      <p class="lead">選一個主題，親手從 78 張萊恩貓咪塔羅裡抽牌。</p>
      <p>感情、工作、人際、金錢、創業、今日指引，每張牌都會告訴妳此刻的真相、容易忽略的盲點，和可以先做的一小步。</p>
      <a class="more" href="#story-draw">到終章抽一張 <span aria-hidden="true">→</span></a>
    </div>
    <div class="world card-world" id="cardWorld">
      <div class="holo-wrap">
        <button class="holo" id="holo" type="button" aria-label="星星牌：點一下撒下星光">
          <img src="/tarot-scenes/major-17.webp" alt="萊恩貓咪塔羅：星星牌，兩隻貓在星光下的水池邊倒水">
          <span class="sheen" aria-hidden="true"></span>
        </button>
      </div>
      <div class="world-ui">
        <p class="world-title"><i>XVII</i>星星<small>希望・療癒・真實</small></p>
        <p class="world-hint" id="holoHint">拖曳牌面轉動它，點一下撒下星光</p>
      </div>
    </div>
  </section>

  <section class="chapter" id="pendulum" data-shape="2" data-label="第二章|Pendulum">
    <div class="copy">
      <p class="mark"><span class="roman">II</span><span class="zh">第二章<i>Pendulum</i></span></p>
      <h2>靈擺問答</h2>
      <p class="lead">把問題整理成是非題，看靈擺停在哪裡。</p>
      <p>在粉色雲海上，水晶靈擺會替妳的直覺找到一個方向。</p>
      <a class="more" href="/pendulum">去問靈擺 <span aria-hidden="true">→</span></a>
    </div>
    <div class="world room-world" id="pendWorld">
      <div class="pend" id="pend" aria-hidden="true"><span class="aura"></span><img src="/pendulum/metal.webp" alt=""><img src="/pendulum/crystal.webp" alt=""><span class="glint"></span><span class="glint g2"></span></div>
      <div class="world-ui">
        <p class="world-hint">想一個是非題，寫下來或放在心裡，再按「問靈擺」</p>
        <form class="ask-form" id="askForm" autocomplete="off">
          <input class="ask-input" id="pendQ" type="text" maxlength="40" placeholder="寫下妳的是非題（也可以不寫）" enterkeyhint="go" aria-label="妳的是非題">
        </form>
        <button class="btn primary" type="button" id="askPend">問靈擺</button>
        <div class="world-result" id="pendResult" aria-live="polite"></div>
      </div>
    </div>
  </section>

  <section class="chapter" id="dice" data-shape="3" data-label="第三章|Astro Dice">
    <div class="copy">
      <p class="mark"><span class="roman">III</span><span class="zh">第三章<i>Astro Dice</i></span></p>
      <h2>星骰指引</h2>
      <p class="lead">擲出行星、星座與宮位，看此刻的能量。</p>
      <p>三顆星骰各自落下，拼成一句只屬於現在的星象提示。</p>
      <a class="more" href="/astro-dice">去擲星骰 <span aria-hidden="true">→</span></a>
    </div>
    <div class="world room-world" id="diceWorld">
      <span class="die-glow" aria-hidden="true"></span>
      <span class="die-shadow" id="dieShadow" aria-hidden="true"></span>
      <button class="die" id="die" type="button" aria-label="擲星骰"><img src="/astro-dice/die.webp" alt="">
        <span class="face" id="dieFace" aria-hidden="true">
          <svg viewBox="0 0 100 100">
            <defs><linearGradient id="goldInk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1d9a0"/><stop offset=".45" stop-color="#c2964f"/><stop offset="1" stop-color="#e3c27f"/></linearGradient></defs>
            <circle cx="50" cy="46" r="31" fill="none" stroke="url(#goldInk)" stroke-width="1.3"/>
            <circle cx="50" cy="46" r="27.5" fill="none" stroke="url(#goldInk)" stroke-width=".6"/>
            <g fill="url(#goldInk)">
              <path d="M50 11l1.4 3.6L55 16l-3.6 1.4L50 21l-1.4-3.6L45 16l3.6-1.4z"/>
              <path d="M50 71l1.4 3.6L55 76l-3.6 1.4L50 81l-1.4-3.6L45 76l3.6-1.4z"/>
              <path d="M15 46l1.4 3.6L20 51l-3.6 1.4L15 56l-1.4-3.6L10 51l3.6-1.4z" transform="translate(0 -5)"/>
              <path d="M85 46l1.4 3.6L90 51l-3.6 1.4L85 56l-1.4-3.6L80 51l3.6-1.4z" transform="translate(0 -5)"/>
              <circle cx="27.6" cy="23.6" r=".9"/><circle cx="72.4" cy="23.6" r=".9"/><circle cx="27.6" cy="68.4" r=".9"/><circle cx="72.4" cy="68.4" r=".9"/>
            </g>
            <text id="dieGlyph" x="50" y="47" text-anchor="middle" dominant-baseline="central" fill="url(#goldInk)">☉&#xFE0E;</text>
            <text id="dieName" x="50" y="90" text-anchor="middle" fill="#b58e5a">太陽</text>
          </svg>
        </span>
      </button>
      <div class="world-ui">
        <p class="world-hint">在心裡想著問題，點一下擲出星骰</p>
        <button class="link-btn" type="button" id="shakeBtn" hidden>開啟「搖一搖手機擲骰」</button>
        <div class="world-result" id="diceResult" aria-live="polite"></div>
      </div>
    </div>
  </section>

  <section class="chapter finale" id="story-draw" data-shape="4" data-label="終章|Draw a card">
    <div class="copy">
      <p class="mark"><span class="roman">IV</span><span class="zh">終章<i>Draw a card</i></span></p>
      <h2>今天，妳想問什麼？</h2>
      <p>深呼吸三次，想著那個問題，再從牌陣裡選一張與妳共振的牌。</p>
    </div>
    <div class="stage is-table" id="stage" aria-label="牌陣：先洗牌、收成扇形，再選一張翻開">
      <p class="hint" id="hint">用手指撥一撥、洗一洗牌，準備好就收成扇形</p>
      <div class="fan" id="fan"></div>
      <div class="stage-act" id="stageAct">
        <button class="btn secondary" type="button" id="mixBtn">洗一洗</button>
        <button class="btn primary" type="button" id="gatherBtn">收成扇形</button>
      </div>
      <div class="drawn" id="drawn" aria-hidden="true">
        <div class="flip">
          <div class="side b"></div>
          <div class="side f"><div class="art"><img id="drawnImg" alt=""></div><p class="tag" id="drawnTag"></p></div>
        </div>
      </div>
    </div>
    <div class="copy reading" id="reading" data-state="rest" aria-live="polite">
      <div class="rest">
        <p class="note">翻開的牌會在這裡告訴妳此刻的真相，和可以先做的一小步。</p>
      </div>
      <div class="result">
        <span class="kw" id="rKw"></span>
        <h3 id="rTitle"></h3>
        <span class="label">此刻的真相</span>
        <p id="rTruth"></p>
        <span class="label">給妳的一小步</span>
        <p id="rAction"></p>
        <div class="actions">
          <button class="btn secondary" type="button" id="again">再抽一次</button>
          <button class="btn secondary" type="button" id="storyBtn">存成限動圖卡</button>
          <a class="btn primary" href="#draw" data-page-link>用主題牌陣看完整解讀 ↓</a>
        </div>
      </div>
    </div>
  </section>

  <section class="chapter after" id="voices" aria-labelledby="voicesTitle">
    <div class="copy">
      <p class="eyebrow">Voices</p>
      <h2 id="voicesTitle">客人怎麼說</h2>
      <p class="draft-note">來自 LINE 的真實回饋・已隱去姓名</p>
    </div>
    <div class="reel-wrap">
      <div class="reel" id="reel" role="region" aria-roledescription="輪播" aria-label="客人回饋，左右滑動看下一則" tabindex="0"></div>
      <div class="reel-ctl" id="reelCtl">
        <button class="reel-btn" type="button" id="reelPrev" aria-label="上一則"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg></button>
        <div class="reel-dots" id="reelDots"></div>
        <button class="reel-btn" type="button" id="reelNext" aria-label="下一則"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></button>
      </div>
    </div>
  </section>

  <section class="chapter after" id="plans" aria-labelledby="plansTitle">
    <div class="copy">
      <p class="eyebrow">Find your path</p>
      <h2 id="plansTitle">找到適合妳的陪伴</h2>
      <p class="lead">回答三個小問題，看看哪一種方式最適合現在的妳。</p>
    </div>
    <div class="quiz" id="quiz" aria-live="polite"></div>
  </section>
</div>

<div class="story-sheet" id="storySheet" hidden role="dialog" aria-modal="true" aria-label="限動圖卡">
  <div class="story-inner">
    <img id="storyImg" alt="">
    <p class="story-tip" id="storyTip"></p>
    <div class="actions">
      <button class="btn primary" type="button" id="storyShare" hidden>分享</button>
      <a class="btn secondary" id="storyDl" href="#" download>下載圖片</a>
      <button class="btn secondary" type="button" id="storyClose">關閉</button>
    </div>
  </div>
</div>`;
