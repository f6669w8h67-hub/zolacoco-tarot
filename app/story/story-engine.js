// The home page's storybook (Zola, 2026-11-20): rose stardust that re-forms into each chapter's object,
// the pendulum over its dowsing chart, the astro die on the cloud sea, cards scattered and gathered into a
// hand fan, client voices and the plan finder. It runs inside a shadow root so its styles and the rest of
// the home page never collide; mountStory returns a function that stops every loop and listener.
import majorsData from "./majors.json";
import extraData from "./extra.json";

export function mountStory(root, host) {
  let alive = true, awake = true, onScreen = true;
  const listeners = [], timers = new Set(), observers = [], cleanups = [], parked = new Set();
  const ON = (type, fn, o) => { window.addEventListener(type, fn, o); listeners.push([type, fn, o]); };
  // Frame loops run only while the story is on screen and the tab is visible. With reduced motion they
  // run only for a moment after the reader scrolls, resizes or touches something. A loop that asks for a
  // frame when it may not run is parked and picks up again when it may.
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let busyUntil = performance.now() + 1500;
  const canRun = () => awake && (!reduceMotion || performance.now() < busyUntil);
  const RAF = cb => {
    if (!alive) return;
    if (!canRun()) { parked.add(cb); return; }
    requestAnimationFrame(t => { if (alive) cb(t); });
  };
  const resume = () => {
    if (!canRun() || !parked.size) return;
    const cbs = [...parked]; parked.clear();
    cbs.forEach(cb => requestAnimationFrame(t => { if (alive) cb(t); }));
  };
  const wake = () => { awake = onScreen && !document.hidden; resume(); };
  if (reduceMotion) {
    const poke = () => { busyUntil = performance.now() + 700; resume(); };
    ["scroll", "resize", "pointerdown", "pointermove", "keydown", "click"].forEach(type => ON(type, poke, { passive: true }));
  }
  const OFF = (type, fn, o) => window.removeEventListener(type, fn, o);
  const TO = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (alive) fn(); }, ms); timers.add(id); return id; };
  const IO = (cb, o) => { const io = new IntersectionObserver(cb, o); observers.push(io); return io; };
  const RO = cb => { const ro = new ResizeObserver(cb); observers.push(ro); return ro; };
  // links between chapters live inside the shadow root, so the browser cannot follow them by itself
  const onRootClick = e => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = root.getElementById(a.getAttribute("href").slice(1));
    if (!target) return; // a link to the rest of the home page (#draw, #trial …) is left to the browser
    e.preventDefault();
    target.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };
  root.addEventListener("click", onRootClick);
  // once the reader is well into the full draw below, the story sleeps and its fixed layers leave the page
  const seen = IO(es => { onScreen = es.some(e => e.isIntersecting); host.toggleAttribute("data-away", !onScreen); wake(); }, { rootMargin: "240px 0px" });
  seen.observe(host);
  document.addEventListener("visibilitychange", wake);


  const MAJORS = majorsData;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- sparkles ---------- */
  const sp = root.querySelector(".sparkles");
  const sparkColors = ["#d48ea8", "#e9b9ca", "#d48ea8", "#f1cbd8"];
  for (let i = 0; i < 18; i++) {
    const el = document.createElement("i");
    const s = 6 + Math.random() * 12;
    el.style.cssText = `left:${4 + Math.random() * 92}%;top:${6 + Math.random() * 88}%;--s:${s}px;--c:${sparkColors[i % 4]};--d:${2.6 + Math.random() * 3}s;--delay:${-Math.random() * 5}s`;
    sp.appendChild(el);
  }

  /* ---------- stardust shapes ---------- */
  const canvas = root.getElementById("dust");
  const ctx = canvas.getContext("2d");
  const small = innerWidth < 760;
  const N = reduce ? 900 : small ? 1800 : 2600;
  const rand = (a, b) => a + Math.random() * (b - a);
  const TAU = Math.PI * 2;

  function makeShape(fill) {
    const x = new Float32Array(N), y = new Float32Array(N), z = new Float32Array(N);
    for (let i = 0; i < N; i++) { const p = fill(i, i / N); x[i] = p[0]; y[i] = p[1]; z[i] = p[2]; }
    return { x, y, z };
  }
  const onSeg = (a, b, t, j = 0.012) => [a[0] + (b[0] - a[0]) * t + rand(-j, j), a[1] + (b[1] - a[1]) * t + rand(-j, j), a[2] + (b[2] - a[2]) * t + rand(-j, j)];
  function onPolyline(pts, t, closed, j) {
    const segs = closed ? pts.length : pts.length - 1;
    const f = t * segs, k = Math.min(segs - 1, Math.floor(f));
    return onSeg(pts[k], pts[(k + 1) % pts.length], f - k, j);
  }
  function starPoly(R, r, n, z = 0, rot = -Math.PI / 2) {
    const pts = [];
    for (let k = 0; k < n * 2; k++) { const a = rot + k * Math.PI / n, rr = k % 2 ? r : R; pts.push([Math.cos(a) * rr, Math.sin(a) * rr, z]); }
    return pts;
  }
  function rotX(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; }

  // 0 crystal ball with a tilted ring of dust and a small stand
  const ball = makeShape((i, u) => {
    if (u < 0.6) { const k = i + 0.5, phi = Math.acos(1 - 2 * (k / (N * 0.6))), th = Math.PI * (1 + Math.sqrt(5)) * k; return [Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th)]; }
    if (u < 0.88) { const a = Math.random() * TAU, r = rand(1.32, 1.6); return rotX([Math.cos(a) * r, rand(-0.03, 0.03), Math.sin(a) * r], 1.22); }
    const a = Math.random() * TAU, r = Math.random() < 0.5 ? 0.62 : 0.4; return [Math.cos(a) * r, 1.12 + (r < 0.5 ? 0.12 : 0), Math.sin(a) * r * 0.35];
  });
  // 1 tarot card: double border, eight-point star, a little dust inside
  const W = 1.1, H = 1.76, outer = [[-W/2,-H/2,0],[W/2,-H/2,0],[W/2,H/2,0],[-W/2,H/2,0]], inset = 0.09;
  const inner = [[-W/2+inset,-H/2+inset,0],[W/2-inset,-H/2+inset,0],[W/2-inset,H/2-inset,0],[-W/2+inset,H/2-inset,0]];
  const star8 = starPoly(0.42, 0.17, 8);
  const card = makeShape((i, u) => {
    if (u < 0.36) return onPolyline(outer, Math.random(), true, 0.01);
    if (u < 0.52) return onPolyline(inner, Math.random(), true, 0.008);
    if (u < 0.8) return onPolyline(star8, Math.random(), true, 0.01);
    return [rand(-W/2+0.12, W/2-0.12), rand(-H/2+0.12, H/2-0.12), rand(-0.05, 0.05)];
  });
  // 2 pendulum: chain from a pivot, faceted crystal drop
  const sides = 8, girdle = 0.36, yTop = -0.18, yG = 0.06, yTip = 0.95, yPivot = -1.45;
  const gp = k => [Math.cos(k / sides * TAU) * girdle, yG, Math.sin(k / sides * TAU) * girdle];
  const pend = makeShape((i, u) => {
    if (u < 0.2) { const t = Math.random(); const yy = yPivot + (yTop - yPivot) * t; const link = Math.sin(t * 60) * 0.025; return [link + rand(-0.008, 0.008), yy, rand(-0.008, 0.008)]; }
    const k = Math.floor(Math.random() * sides), a = gp(k), b = gp(k + 1);
    if (u < 0.55) { // edges
      const r = Math.random();
      if (r < 0.3) return onSeg(a, b, Math.random(), 0.006);
      if (r < 0.55) return onSeg([0, yTop, 0], a, Math.random(), 0.006);
      return onSeg(a, [0, yTip, 0], Math.random(), 0.006);
    }
    // facets
    let s = Math.random(), t = Math.random(); if (s + t > 1) { s = 1 - s; t = 1 - t; }
    const apex = Math.random() < 0.3 ? [0, yTop, 0] : [0, yTip, 0];
    return [apex[0] + (a[0] - apex[0]) * s + (b[0] - apex[0]) * t, apex[1] + (a[1] - apex[1]) * s + (b[1] - apex[1]) * t, apex[2] + (a[2] - apex[2]) * s + (b[2] - apex[2]) * t];
  });
  // 3 astro die: cube edges, faint faces, pips
  const c = 0.78, V = [[-c,-c,-c],[c,-c,-c],[c,c,-c],[-c,c,-c],[-c,-c,c],[c,-c,c],[c,c,c],[-c,c,c]];
  const E = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  const pipFaces = [];
  const faceDefs = [[[0,0,1],[1,0,0],[0,1,0],1],[[0,0,-1],[1,0,0],[0,1,0],6],[[1,0,0],[0,0,1],[0,1,0],3],[[-1,0,0],[0,0,1],[0,1,0],4],[[0,1,0],[1,0,0],[0,0,1],5],[[0,-1,0],[1,0,0],[0,0,1],2]];
  const pipLayout = {1:[[0,0]],2:[[-.4,-.4],[.4,.4]],3:[[-.45,-.45],[0,0],[.45,.45]],4:[[-.42,-.42],[.42,-.42],[-.42,.42],[.42,.42]],5:[[-.42,-.42],[.42,-.42],[0,0],[-.42,.42],[.42,.42]],6:[[-.42,-.45],[.42,-.45],[-.42,0],[.42,0],[-.42,.45],[.42,.45]]};
  faceDefs.forEach(([n, u, v, count]) => pipLayout[count].forEach(([a, b]) => pipFaces.push([n[0]*c + (u[0]*a + v[0]*b)*c, n[1]*c + (u[1]*a + v[1]*b)*c, n[2]*c + (u[2]*a + v[2]*b)*c, u, v])));
  const die = makeShape((i, u) => {
    if (u < 0.5) { const e = E[Math.floor(Math.random() * 12)]; return onSeg(V[e[0]], V[e[1]], Math.random(), 0.01); }
    if (u < 0.78) { const p = pipFaces[Math.floor(Math.random() * pipFaces.length)], a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 0.11; return [p[0] + (p[3][0]*Math.cos(a) + p[4][0]*Math.sin(a)) * r, p[1] + (p[3][1]*Math.cos(a) + p[4][1]*Math.sin(a)) * r, p[2] + (p[3][2]*Math.cos(a) + p[4][2]*Math.sin(a)) * r]; }
    const f = faceDefs[Math.floor(Math.random() * 6)], a = rand(-1, 1), b = rand(-1, 1);
    return [f[0][0]*c + (f[1][0]*a + f[2][0]*b)*c, f[0][1]*c + (f[1][1]*a + f[2][1]*b)*c, f[0][2]*c + (f[1][2]*a + f[2][2]*b)*c];
  });
  // 4 galaxy halo above the fan
  const galaxy = makeShape((i, u) => {
    if (u < 0.16) { const a = Math.random() * TAU, r = Math.pow(Math.random(), 2) * 0.35; return [Math.cos(a) * r, rand(-0.06, 0.06), Math.sin(a) * r]; }
    const arm = i % 3, r = 0.25 + Math.pow(Math.random(), 0.8) * 1.85, a = arm * TAU / 3 + r * 2.3 + rand(-0.22, 0.22);
    return [Math.cos(a) * r, rand(-0.04, 0.04), Math.sin(a) * r];
  });
  // 5 star burst around the drawn card
  const burstStar = starPoly(2.05, 0.95, 8, 0, -Math.PI / 2);
  const burst = makeShape((i, u) => {
    if (u < 0.5) return onPolyline(burstStar, Math.random(), true, 0.012);
    const a = Math.random() * TAU, r = rand(1.15, 2.7); return [Math.cos(a) * r, Math.sin(a) * r, rand(-0.15, 0.15)];
  });
  // chapters II and III: a loose drift of dust (the glass pendulum and die are the objects there)
  const drift = seed => makeShape((i, u) => { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 2.6; return [Math.cos(a) * r, 2.2 + (Math.random() - 0.5) * 0.5 + Math.sin(a * 3 + seed) * 0.12, Math.sin(a) * r * 0.5]; });
  const SHAPES = [ball, card, drift(0), drift(2), galaxy, burst];

  // per-particle colour, size, twinkle, flow
  // rose-pink stardust (Zola picked it over gold, pearl white and pink + blue)
  const THEMES = {
    pearl: { blend: "source-over", glow: 0.42, alpha: 0.62, colors: [["#d48ea8", 0.7], ["#e9b9ca", 0.3]] }
  };
  let theme = THEMES.pearl, sprites = [], starSprites = [];
  function makeSprites() {
    sprites = theme.colors.map(([col]) => {
      const s = document.createElement("canvas"); s.width = s.height = 32;
      const g = s.getContext("2d"), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      gr.addColorStop(0, col); gr.addColorStop(0.28, col); gr.addColorStop(0.32, col + "99"); gr.addColorStop(theme.glow, col + "00"); gr.addColorStop(1, col + "00");
      g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return s;
    });
    starSprites = theme.colors.map(([col]) => {
      const s = document.createElement("canvas"); s.width = s.height = 48;
      const g = s.getContext("2d"); g.fillStyle = col; g.beginPath();
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 - Math.PI / 2, r = k % 2 ? 4 : 23; g.lineTo(24 + Math.cos(a) * r, 24 + Math.sin(a) * r); }
      g.closePath(); g.fill(); return s;
    });
  }
  const pr = new Float32Array(N), isStar = new Uint8Array(N);
  const pc = new Uint8Array(N), ps = new Float32Array(N), ph = new Float32Array(N), pf = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pr[i] = Math.random(); isStar[i] = Math.random() < 0.025 ? 1 : 0;
    ps[i] = isStar[i] ? rand(1.6, 2.6) : rand(0.55, 1.25);
    ph[i] = Math.random() * TAU;
    const a = Math.random() * TAU, b = Math.acos(rand(-1, 1)), m = rand(0.4, 1.4);
    pf[i*3] = Math.sin(b) * Math.cos(a) * m; pf[i*3+1] = Math.cos(b) * m; pf[i*3+2] = Math.sin(b) * Math.sin(a) * m;
  }

  function applyTheme(name) {
    theme = THEMES[name];
    for (let i = 0; i < N; i++) { let acc = 0, k = 0; for (; k < theme.colors.length - 1; k++) { acc += theme.colors[k][1]; if (pr[i] < acc) break; } pc[i] = k; }
    makeSprites();
  }
  applyTheme("pearl");

  // where each shape sits on screen: [cx, cy, scale] as fractions of the viewport
  function view(k, w, h) {
    const m = Math.min(w, h), wide = w >= 900;
    if (k === 4) return wide ? [0.5, 0.46, m * 0.26] : [0.5, 0.42, m * 0.25];
    if (wide) return [[0.72, 0.5, m * 0.25], [0.72, 0.5, m * 0.24], [0.72, 0.46, m * 0.25], [0.72, 0.5, m * 0.22]][k];
    return [[0.5, 0.25, m * 0.27], [0.5, 0.25, m * 0.235], [0.5, 0.25, m * 0.2], [0.5, 0.25, m * 0.23]][k];
  }
  function motion(k, t) { // rx, ry, swing
    if (reduce) return [k === 4 ? 1.05 : -0.25, 0.5, 0];
    switch (k) {
      case 0: return [-0.2 + Math.sin(t * 0.3) * 0.08, t * 0.35, 0];
      case 1: return [-0.12, Math.sin(t * 0.55) * 0.75, 0];
      case 2: return [0.2, t * 0.12, 0];
      case 3: return [0.2, -t * 0.12, 0];
      case 4: return [1.05, t * 0.18, 0];
      default: return [0, 0, t * 0.15];
    }
  }

  let w = 0, h = 0, dpr = 1;
  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1); w = innerWidth; h = innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  ON("resize", resize); resize();

  const sections = [...root.querySelectorAll("[data-shape]")];
  const navLinks = [...root.querySelectorAll(".chapters-nav a")];
  let shown = 0;
  function scrollState() {
    const mids = sections.map(s => { const r = s.getBoundingClientRect(); return r.top + Math.min(r.height, h) / 2 - h / 2; });
    if (mids[0] >= 0) return 0;
    for (let i = 0; i < mids.length - 1; i++) if (mids[i] <= 0 && mids[i + 1] > 0) return i + (-mids[i]) / (mids[i + 1] - mids[i]);
    return sections.length - 1;
  }
  function setChapter(i) {
    if (i === shown) return; shown = i;
    navLinks.forEach((a, k) => a.setAttribute("aria-current", k === i ? "true" : "false"));

  }

  let px = 0, py = 0, tpx = 0, tpy = 0;
  ON("pointermove", e => { if (e.pointerType === "mouse") { tpx = e.clientX / w - 0.5; tpy = e.clientY / h - 0.5; } });

  // the prologue's stardust parts around a finger or the mouse and drifts back; a tap blows it outward
  const dX = new Float32Array(N), dY = new Float32Array(N), vX = new Float32Array(N), vY = new Float32Array(N);
  let tX = -1e4, tY = -1e4, tLive = 0, burstAt = null, stirred = 0;
  const touchPoint = (x, y) => { tX = x; tY = y; tLive = performance.now(); };
  ON("pointermove", e => { if (e.pointerType === "mouse") touchPoint(e.clientX, e.clientY); }, { passive: true });
  ON("pointerdown", e => { if (e.pointerType === "mouse") { touchPoint(e.clientX, e.clientY); burstAt = [e.clientX, e.clientY]; } }, { passive: true });
  ON("touchstart", e => { const p = e.touches[0]; if (p) { touchPoint(p.clientX, p.clientY); burstAt = [p.clientX, p.clientY]; } }, { passive: true });
  ON("touchmove", e => { const p = e.touches[0]; if (p) touchPoint(p.clientX, p.clientY); }, { passive: true });

  const smooth = t => t * t * (3 - 2 * t);
  let reveal = 0, revealTarget = 0, f = 0, last = performance.now();
  const drawnEl = root.getElementById("drawn");
  const skyEl = root.querySelector(".sky"), pendSection = root.getElementById("pendulum"), diceSection = root.getElementById("dice"), voicesSection = root.getElementById("voices"), plansSection = root.getElementById("plans"), navEl = root.querySelector(".chapters-nav");
  let lastOut = -1;
  let lastSky = -1;
  const A = new Float32Array(3), B = new Float32Array(3);

  function place(shape, i, mo, out) {
    let x = shape.x[i], y = shape.y[i], z = shape.z[i];
    // spin around y, then tilt around x
    const cy = Math.cos(mo[1]), sy = Math.sin(mo[1]);
    let x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
    const cx = Math.cos(mo[0]), sx = Math.sin(mo[0]);
    let y1 = y * cx - z1 * sx; z1 = y * sx + z1 * cx;
    if (mo[2]) { // pendulum swing around the pivot
      const cs = Math.cos(mo[2]), ss = Math.sin(mo[2]), dy = y1 - yPivot;
      const nx = x1 * cs - dy * ss, ny = x1 * ss + dy * cs; x1 = nx; y1 = ny + yPivot + 0.25;
    }
    out[0] = x1; out[1] = y1; out[2] = z1;
  }

  let stillKey = "";
  function frame(now) {
    RAF(frame);
    if (reduce) { const key = `${scrollY}|${innerWidth}|${innerHeight}|${revealTarget}`; if (key === stillKey) return; stillKey = key; }
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
    const t = now / 1000;
    const target = scrollState();
    f += (target - f) * (reduce ? 1 : Math.min(1, dt * 6));
    if (!(f >= 0)) f = 0; if (f > 4) f = 4;
    const ia = Math.max(0, Math.min(SHAPES.length - 3, Math.floor(f))), ib = Math.min(4, ia + 1);
    const local = Math.max(0, Math.min(1, (f - ia - 0.18) / 0.64));
    const e = smooth(local);
    setChapter(Math.round(target));

    reveal += (revealTarget - reveal) * Math.min(1, dt * (reduce ? 60 : 2.4));
    px += (tpx - px) * 0.05; py += (tpy - py) * 0.05;

    const va = view(ia, w, h), vb = view(ib, w, h);
    let cx = (va[0] + (vb[0] - va[0]) * e) * w, cy = (va[1] + (vb[1] - va[1]) * e) * h, sc = va[2] + (vb[2] - va[2]) * e;
    let bx = cx, by = cy, bs = sc;
    if (reveal > 0.001) { const r = drawnEl.getBoundingClientRect(); bx = r.left + r.width / 2; by = r.top + r.height / 2; bs = r.height * 0.36; }
    cx += (bx - cx) * reveal; cy += (by - cy) * reveal; sc += (bs - sc) * reveal;

    const moA = motion(ia, t), moB = motion(ib, t), moS = motion(5, t);
    const mid = Math.sin(Math.PI * e) * (reduce ? 0 : 1);
    const swirl = mid * 1.3;
    const pX = py * 0.35, pY = px * 0.5;
    const cpx = Math.cos(pY), spx = Math.sin(pY), cpy = Math.cos(pX), spy = Math.sin(pX);

    // the sky over chapters II and III, from where those sections sit on screen
    const pr = pendSection.getBoundingClientRect(), dr = diceSection.getBoundingClientRect();
    const skyIn = smooth(Math.max(0, Math.min(1, (h * 0.95 - pr.top) / (h * 0.6))));
    const skyOut = smooth(Math.max(0, Math.min(1, (dr.bottom - h * 0.1) / (h * 0.6))));
    const skyV = Math.min(skyIn, skyOut);
    if (Math.abs(skyV - lastSky) > 0.002) { host.style.setProperty("--sky", skyV.toFixed(3)); skyEl.classList.toggle("on", skyV > 0.001); lastSky = skyV; }
    // past the finale the dust steps back behind the client voices and the plan finder
    const vr = voicesSection.getBoundingClientRect();
    const afterV = smooth(Math.max(0, Math.min(1, (h * 0.9 - vr.top) / (h * 0.6))));
    const endB = plansSection.getBoundingClientRect().bottom;
    const outV = smooth(Math.max(0, Math.min(1, (h * 0.55 - endB) / (h * 0.45))));
    if (Math.abs(outV - lastOut) > 0.002) { host.style.setProperty("--out", outV.toFixed(3)); navEl.classList.toggle("gone", outV > 0.98); lastOut = outV; }
    const dustVis = (1 - skyV) * (1 - 0.82 * afterV) * (1 - outV), revealVis = reveal * (1 - afterV);
    ctx.clearRect(0, 0, w, h);
    if (dustVis < 0.02 && revealVis < 0.01) return;
    ctx.globalCompositeOperation = theme.blend;
    const D = 4;
    // stardust that a finger can stir: only in the prologue, and only until it has settled again
    const heroW = reduce ? 0 : Math.max(0, 1 - f * 2.5);
    const live = heroW > 0.02 && performance.now() - tLive < 140, R = small ? 110 : 140, R2 = R * R, push = 2.6 * heroW;
    const bst = heroW > 0.02 ? burstAt : null; burstAt = null;
    if (live || bst) stirred = 1;
    const stir = stirred > 0.001, k60 = Math.min(2, dt * 60);
    if (stir) stirred *= Math.pow(0.985, k60);
    for (let i = 0; i < N; i++) {
      place(SHAPES[ia], i, moA, A);
      let x = A[0], y = A[1], z = A[2];
      if (e > 0) { place(SHAPES[ib], i, moB, B); x += (B[0] - x) * e; y += (B[1] - y) * e; z += (B[2] - z) * e; }
      if (mid > 0) { // threads of dust while changing shape
        x += pf[i*3] * mid * 0.9; y += pf[i*3+1] * mid * 0.6; z += pf[i*3+2] * mid * 0.9;
        const cs = Math.cos(swirl), ss = Math.sin(swirl), nx = x * cs + z * ss; z = -x * ss + z * cs; x = nx;
      }
      if (reveal > 0.001) { place(SHAPES[5], i, moS, B); x += (B[0] - x) * reveal; y += (B[1] - y) * reveal; z += (B[2] - z) * reveal; }
      // pointer parallax
      let x2 = x * cpx + z * spx, z2 = -x * spx + z * cpx;
      let y2 = y * cpy - z2 * spy; z2 = y * spy + z2 * cpy;
      const p = D / (D - z2);
      let sx = cx + x2 * sc * p, sy = cy + y2 * sc * p;
      if (stir) {
        const qx = sx + dX[i] - tX, qy = sy + dY[i] - tY;
        if (live) { const d2 = qx * qx + qy * qy; if (d2 < R2) { const d = Math.sqrt(d2) + 0.01, kk = (1 - d / R) * push * k60; vX[i] += (qx / d - qy / d * 0.55) * kk; vY[i] += (qy / d + qx / d * 0.55) * kk; } }
        if (bst) { const bx2 = sx - bst[0], by2 = sy - bst[1], d = Math.hypot(bx2, by2) + 0.01; if (d < R * 1.5) { const kk = (1 - d / (R * 1.5)) * 13 * heroW; vX[i] += bx2 / d * kk; vY[i] += by2 / d * kk; } }
        vX[i] = (vX[i] - dX[i] * 0.045 * k60) * Math.pow(0.9, k60); vY[i] = (vY[i] - dY[i] * 0.045 * k60) * Math.pow(0.9, k60);
        dX[i] += vX[i] * k60; dY[i] += vY[i] * k60;
        sx += dX[i]; sy += dY[i];
      }
      const lit = stir ? Math.min(1, Math.abs(vX[i]) + Math.abs(vY[i])) * 0.12 : 0; // stirred dust glints a little
      const tw = reduce ? 1 : 0.65 + 0.35 * Math.sin(t * 2.2 + ph[i]);
      const size = ps[i] * p * (small ? 3.2 : 3.6) * (1 + lit * 3);
      ctx.globalAlpha = Math.max(0.12, Math.min(1, (theme.alpha + 0.4 * (z2 + 1.2) / 2.4) * tw + lit * 2)) * Math.max(dustVis, revealVis);
      if (isStar[i]) { const ss = size * 2.2 * (0.7 + 0.3 * Math.sin(t * 3 + ph[i])); ctx.drawImage(starSprites[pc[i]], sx - ss, sy - ss, ss * 2, ss * 2); }
      else ctx.drawImage(sprites[pc[i]], sx - size, sy - size, size * 2, size * 2);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }
  RAF(frame);

  /* ---------- finale: the cards land scattered on the clouds; push them around, gather them into a hand fan, lift one ---------- */
  const fan = root.getElementById("fan"), stage = root.getElementById("stage");
  const hint = root.getElementById("hint"), reading = root.getElementById("reading");
  const img = root.getElementById("drawnImg"), tag = root.getElementById("drawnTag");
  const stageAct = root.getElementById("stageAct"), mixBtn = root.getElementById("mixBtn"), gatherBtn = root.getElementById("gatherBtn");
  const COUNT = 22, wide = () => innerWidth >= 900;
  const CW = () => (wide() ? 100 : 62), CHh = () => (wide() ? 160 : 99);
  const HINTS = { table: "用手指撥一撥、洗一洗牌，準備好就收成扇形", fan: matchMedia("(hover: hover)").matches ? "滑過牌會浮起並亮起顏色，點一下翻開" : "按住一張牌，它會亮起顏色；點一下翻開" };
  let deck = [], chosen = -1, mode = "stack", zTop = 40, grab = null, currentCard = null;
  function shuffle() { deck = [...Array(COUNT).keys()]; for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; } }
  shuffle();
  const cards = [];
  const setCard = c => { c.el.style.transform = `translate(${c.x - CW() / 2}px, ${c.y - CHh() / 2}px) rotate(${c.r}deg)`; };
  const ease = (c, ms, delay = 0) => { c.el.style.transition = reduce ? "none" : `transform ${ms}ms cubic-bezier(.2, .8, .2, 1) ${delay}ms`; };
  function setMode(m) {
    mode = m; stage.classList.toggle("is-table", m === "table"); stage.classList.toggle("is-fan", m === "fan");
    hint.textContent = HINTS[m] || ""; stageAct.hidden = m !== "table";
  }

  // where the cards can lie on the table: a best-candidate scatter so they overlap like a real spread, not a heap
  function tableSpots() {
    const W = stage.clientWidth, H = stage.clientHeight, w = CW(), h = CHh();
    const x0 = Math.max(w * 0.75, W / 2 - 430), x1 = W - x0, y0 = 50 + h * 0.5, y1 = H - 76 - h * 0.62;
    const pts = [];
    for (let i = 0; i < COUNT; i++) {
      let best = null, bd = -1;
      for (let k = 0; k < 24; k++) {
        const p = [x0 + Math.random() * (x1 - x0), y0 + Math.random() * (y1 - y0)];
        let d = 1e9; for (const q of pts) d = Math.min(d, Math.hypot(p[0] - q[0], (p[1] - q[1]) * 1.25));
        if (d > bd) { bd = d; best = p; }
      }
      pts.push(best);
    }
    return pts;
  }
  // a hand fan: every card pivots around one point below the stage
  function fanSpot(k) {
    const W = stage.clientWidth, H = stage.clientHeight, big = wide();
    const spread = big ? 120 : 72, R = big ? 380 : 190, bottom = big ? 246 : 104, rr = R + CHh() / 2;
    const a = (k - (COUNT - 1) / 2) * spread / (COUNT - 1) * Math.PI / 180;
    return { x: W / 2 + Math.sin(a) * rr, y: H - bottom + R - Math.cos(a) * rr, r: a * 180 / Math.PI };
  }
  function toTable(stagger) {
    const pts = tableSpots(), order = [...cards].sort(() => Math.random() - 0.5);
    order.forEach((c, n) => {
      c.vx = c.vy = c.vr = 0; c.slot = -1;
      [c.x, c.y] = pts[n]; c.r = (Math.random() - 0.5) * 76;
      c.el.style.zIndex = ++zTop; ease(c, 820, stagger ? n * stagger : 0); setCard(c);
    });
    setMode("table");
  }
  function toFan() {
    // cards slide to the fan slot nearest their spot on the table, so the gathering reads left to right
    [...cards].sort((a, b) => a.x - b.x).forEach((c, k) => {
      c.slot = k; Object.assign(c, fanSpot(k)); c.vx = c.vy = c.vr = 0;
      c.el.style.zIndex = 10 + k; ease(c, 760, k * 34); setCard(c);
    });
    setMode("fan");
  }
  function relayout() {
    cards.forEach(c => { c.el.style.transition = "none"; });
    if (mode === "fan") cards.forEach(c => { Object.assign(c, fanSpot(c.slot)); setCard(c); });
    else if (mode === "table") { const W = stage.clientWidth, H = stage.clientHeight; cards.forEach(c => { c.x = Math.max(CW() / 2, Math.min(W - CW() / 2, c.x)); c.y = Math.max(CHh() / 2, Math.min(H - CHh() / 2, c.y)); setCard(c); }); }
    else cards.forEach(c => { c.x = stage.clientWidth / 2; c.y = stage.clientHeight * 0.45; setCard(c); });
  }

  for (let i = 0; i < COUNT; i++) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "fan-card"; b.setAttribute("aria-label", `第 ${i + 1} 張牌`);
    b.innerHTML = '<span class="back"></span>';
    const c = { el: b, i, x: 0, y: 0, r: (Math.random() - 0.5) * 8, vx: 0, vy: 0, vr: 0, slot: i, gliding: false };
    b.addEventListener("click", ev => {
      if (chosen >= 0) return;
      if (mode === "fan") choose(c);
      else if (mode === "table" && ev.detail === 0) toFan(); // keyboard: Enter on the table gathers the fan
    });
    b.addEventListener("pointerdown", e => {
      if (chosen >= 0) return;
      if (mode === "fan") { b.classList.add("lift"); return; }
      if (mode !== "table") return;
      const st = stage.getBoundingClientRect();
      grab = { c, id: e.pointerId, gx: e.clientX - st.left - c.x, gy: e.clientY - st.top - c.y, sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now(), moved: false };
      try { b.setPointerCapture(e.pointerId); } catch (_) {}
      b.style.transition = "none"; b.style.zIndex = ++zTop; b.classList.add("held"); c.vx = c.vy = c.vr = 0; c.gliding = false;
    });
    b.addEventListener("pointermove", e => {
      if (!grab || grab.c !== c || e.pointerId !== grab.id) return;
      const now = performance.now(), dt = Math.max(8, now - grab.t), dx = e.clientX - grab.lx, dy = e.clientY - grab.ly;
      if (!grab.moved && Math.hypot(e.clientX - grab.sx, e.clientY - grab.sy) > 4) grab.moved = true;
      // pulled by a corner, a card on a table turns to trail behind the finger
      const dr = (grab.gx * dy - grab.gy * dx) / (grab.gx * grab.gx + grab.gy * grab.gy + 900) * 0.6;
      const cs = Math.cos(dr), sn = Math.sin(dr), gx = grab.gx * cs - grab.gy * sn, gy = grab.gx * sn + grab.gy * cs;
      c.x += dx + (grab.gx - gx); c.y += dy + (grab.gy - gy); c.r += dr * 57.3; grab.gx = gx; grab.gy = gy;
      c.vx = dx / dt * 16; c.vy = dy / dt * 16; c.vr = dr * 57.3 / dt * 16;
      grab.lx = e.clientX; grab.ly = e.clientY; grab.t = now; setCard(c);
    });
    const release = e => {
      b.classList.remove("lift");
      if (!grab || grab.c !== c || (e.pointerId !== undefined && e.pointerId !== grab.id)) return;
      const g = grab; grab = null; b.classList.remove("held");
      if (g.moved) glide(c); else peek(c);
    };
    ["pointerup", "pointercancel"].forEach(n => b.addEventListener(n, release));
    b.addEventListener("pointerleave", () => { if (mode === "fan") b.classList.remove("lift"); });
    fan.appendChild(b); cards.push(c); setCard(c);
  }
  // a flicked card slides on and slows, bumping softly off the edge of the stage
  function glide(c) {
    if (reduce || c.gliding) return; c.gliding = true;
    (function step() {
      if (!c.gliding || mode !== "table") { c.gliding = false; return; }
      const W = stage.clientWidth, H = stage.clientHeight, w = CW() / 2, h = CHh() / 2;
      c.x += c.vx; c.y += c.vy; c.r += c.vr; c.vx *= 0.9; c.vy *= 0.9; c.vr *= 0.88;
      if (c.x < w || c.x > W - w) { c.x = Math.max(w, Math.min(W - w, c.x)); c.vx *= -0.5; }
      const yMax = H - 64 - h; // keep clear of the buttons along the bottom
      if (c.y < h || c.y > yMax) { c.y = Math.max(h, Math.min(yMax, c.y)); c.vy *= -0.5; }
      setCard(c);
      if (Math.hypot(c.vx, c.vy) < 0.15 && Math.abs(c.vr) < 0.1) { c.gliding = false; return; }
      RAF(step);
    })();
  }
  // a tap on the table only turns the card a little and lets its colour show for a moment
  function peek(c) {
    c.r += (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 10); ease(c, 420); setCard(c);
    c.el.classList.add("peek"); TO(() => c.el.classList.remove("peek"), 700);
    gatherBtn.classList.remove("nudge"); void gatherBtn.offsetWidth; gatherBtn.classList.add("nudge");
  }
  mixBtn.addEventListener("click", () => { if (mode === "table" && chosen < 0) toTable(14); });
  gatherBtn.addEventListener("click", () => { if (mode === "table" && chosen < 0) toFan(); });
  ON("resize", relayout);
  relayout();
  // the cards are dealt onto the clouds the first time the stage comes into view
  const dealIn = () => { if (mode === "stack") toTable(32); };
  if ("IntersectionObserver" in window) {
    const io = IO(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); dealIn(); } }, { threshold: 0.3 });
    io.observe(stage);
  } else dealIn();
  setMode("stack"); hint.textContent = HINTS.table;

  function choose(c) {
    if (chosen >= 0) return;
    chosen = c.i;
    const card = MAJORS[deck[c.i]]; currentCard = card;
    const back = c.el.querySelector(".back").getBoundingClientRect();
    drawnEl.classList.remove("open");
    drawnEl.style.transition = "none";
    drawnEl.style.transform = "none";
    drawnEl.classList.add("show");
    const dr = drawnEl.getBoundingClientRect();
    const dx = (back.left + back.width / 2) - (dr.left + dr.width / 2), dy = (back.top + back.height / 2) - (dr.top + dr.height / 2);
    drawnEl.style.transform = `translate(${dx}px, ${dy}px) rotate(${c.r}deg) scale(${CW() / drawnEl.offsetWidth})`;
    c.el.classList.add("taken"); c.el.classList.remove("lift");
    fan.classList.add("dim"); hint.style.opacity = "0";
    img.src = `/tarot-scenes/major-${String(card.n).padStart(2, "0")}.webp`;
    img.alt = `${card.name}（${card.en}）`;
    tag.innerHTML = `<i>${card.num}</i>${card.name}`;
    RAF(() => RAF(() => {
      drawnEl.style.transition = reduce ? "none" : "transform .85s cubic-bezier(.2, .8, .2, 1)";
      drawnEl.style.transform = "none";
      TO(() => {
        drawnEl.classList.add("open"); revealTarget = 1;
        root.getElementById("rKw").textContent = card.kw;
        root.getElementById("rTitle").innerHTML = `<i>${card.num}</i>${card.name}<small>${card.en}</small>`;
        root.getElementById("rTruth").textContent = card.truth;
        root.getElementById("rAction").textContent = card.action;
        reading.dataset.state = "open";
      }, reduce ? 0 : 750);
    }));
  }
  root.getElementById("again").addEventListener("click", () => {
    revealTarget = 0; drawnEl.classList.remove("open");
    TO(() => {
      drawnEl.classList.remove("show"); drawnEl.style.transform = "none";
      if (chosen >= 0) cards[chosen].el.classList.remove("taken");
      chosen = -1; shuffle(); fan.classList.remove("dim"); hint.style.opacity = "1";
      reading.dataset.state = "rest";
      toTable(18);
      stage.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    }, reduce ? 0 : 500);
  });
  /* ---------- the drawn card as an IG story image (1080 × 1920) ---------- */
  const storyBtn = root.getElementById("storyBtn"), sheet = root.getElementById("storySheet");
  const storyImg = root.getElementById("storyImg"), storyShare = root.getElementById("storyShare");
  const storyDl = root.getElementById("storyDl"), storyTip = root.getElementById("storyTip");
  let storyUrl = "", storyFile = null, storyBlob = null, lastFocus = null;
  cleanups.push(() => { if (storyUrl) URL.revokeObjectURL(storyUrl); });
  const SERIF = '"Noto Serif TC", "Songti TC", "Noto Serif CJK TC", serif', LATIN = '"Cormorant Garamond", Georgia, serif';
  function wrapCJK(g, text, maxW) {
    const lines = []; let line = "";
    for (const ch of text) {
      if (g.measureText(line + ch).width > maxW && line && !"，。；：、！？」』）".includes(ch)) { lines.push(line); line = ch; }
      else line += ch;
    }
    if (line) lines.push(line);
    return lines;
  }
  function wrapBalanced(g, text, maxW) { // same number of lines, but evened out so no word is left alone
    const n = wrapCJK(g, text, maxW).length; if (n < 2) return [text];
    if (n === 2) { // two lines read best when they break at a comma near the middle
      const chars = [...text]; let best = -1;
      chars.forEach((ch, k) => {
        if (!"，；、：".includes(ch) || k >= chars.length - 2) return;
        const a = chars.slice(0, k + 1).join(""), b = chars.slice(k + 1).join("");
        if (g.measureText(a).width <= maxW && g.measureText(b).width <= maxW && Math.abs(k + 1 - chars.length / 2) <= chars.length * 0.3 && (best < 0 || Math.abs(k + 1 - chars.length / 2) < Math.abs(best + 1 - chars.length / 2))) best = k;
      });
      if (best >= 0) return [chars.slice(0, best + 1).join(""), chars.slice(best + 1).join("")];
    }
    let lo = g.measureText(text).width / n, hi = maxW;
    for (let k = 0; k < 14; k++) { const mid = (lo + hi) / 2; if (wrapCJK(g, text, mid).length > n) lo = mid; else hi = mid; }
    return wrapCJK(g, text, hi + 1);
  }
  function spaced(g, text, x, y, gap) { // centred text with letter spacing
    const chars = [...text], wds = chars.map(c => g.measureText(c).width), total = wds.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
    let cx = x - total / 2; g.textAlign = "left";
    chars.forEach((c, k) => { g.fillText(c, cx, y); cx += wds[k] + gap; });
    g.textAlign = "center";
  }
  function star4(g, x, y, r, col, a) {
    g.save(); g.globalAlpha = a; g.fillStyle = col; g.beginPath();
    for (let k = 0; k < 8; k++) { const an = k * Math.PI / 4 - Math.PI / 2, rr = k % 2 ? r * 0.18 : r; g.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
    g.closePath(); g.fill(); g.restore();
  }
  function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function labelRow(g, text, y) {
    g.font = `700 30px ${SERIF}`; g.fillStyle = "#8a3a59"; spaced(g, text, 540, y, 10);
    const half = g.measureText(text).width / 2 + text.length * 5 + 28;
    [-1, 1].forEach(s => { g.save(); g.translate(540 + s * half, y - 10); g.rotate(Math.PI / 4); g.fillStyle = "#c4a46c"; g.fillRect(-6, -6, 12, 12); g.restore(); });
  }
  async function makeStory(card) {
    try { await Promise.all([document.fonts.load(`700 40px ${SERIF}`, card.name + "此刻的真相給妳的一小步"), document.fonts.load(`italic 600 60px ${LATIN}`, "Zolacoco Tarot")]); } catch (_) {}
    const art = new Image(); art.src = `/tarot-scenes/major-${String(card.n).padStart(2, "0")}.webp`;
    await (art.decode ? art.decode() : new Promise(r => { art.onload = r; }));
    const cv = document.createElement("canvas"); cv.width = 1080; cv.height = 1920;
    const g = cv.getContext("2d"); g.textAlign = "center"; g.textBaseline = "alphabetic";
    // pearl ground with a rose glow behind the card
    const bg = g.createLinearGradient(0, 0, 0, 1920); bg.addColorStop(0, "#fbeef3"); bg.addColorStop(0.55, "#faf6f6"); bg.addColorStop(1, "#edf0fb");
    g.fillStyle = bg; g.fillRect(0, 0, 1080, 1920);
    const glow = g.createRadialGradient(540, 660, 60, 540, 660, 620); glow.addColorStop(0, "rgba(246,214,228,.9)"); glow.addColorStop(1, "rgba(246,214,228,0)");
    g.fillStyle = glow; g.fillRect(0, 0, 1080, 1920);
    let seed = card.n * 97 + 13; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 40; k++) { // sparkles stay off the words
      const x = 80 + rnd() * 920, y = 80 + rnd() * 1760, r = 6 + rnd() * 16, a = 0.25 + rnd() * 0.45;
      if (y > 1040 && y < 1720 && x > 90 && x < 990) continue;
      star4(g, x, y, r, k % 3 ? "#d48ea8" : "#c4a46c", a);
    }
    // a thin double gold frame with diamond corners
    g.strokeStyle = "rgba(196,164,108,.85)"; g.lineWidth = 2; g.strokeRect(46, 46, 988, 1828);
    g.lineWidth = 1; g.strokeRect(60, 60, 960, 1800);
    [[46, 46], [1034, 46], [46, 1874], [1034, 1874]].forEach(([x, y]) => { g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillStyle = "#c4a46c"; g.fillRect(-9, -9, 18, 18); g.restore(); });
    // brand
    g.font = `italic 600 66px ${LATIN}`; g.fillStyle = "#8a3a59"; g.fillText("Zolacoco Tarot", 540, 176);
    g.font = `500 30px ${SERIF}`; g.fillStyle = "#7a5a33"; spaced(g, "今天抽到的牌", 540, 228, 12);
    // the card: paper, art, name strip
    const cw = 470, aw = 446, ah = 714, ch = 12 + ah + 68, cx0 = 540 - cw / 2, cy0 = 270;
    g.save(); g.shadowColor = "rgba(132,52,80,.22)"; g.shadowBlur = 40; g.shadowOffsetY = 18;
    rrect(g, cx0, cy0, cw, ch, 22); g.fillStyle = "#fffdfb"; g.fill(); g.restore();
    rrect(g, cx0, cy0, cw, ch, 22); g.strokeStyle = "#c4a46c"; g.lineWidth = 2; g.stroke();
    g.save(); rrect(g, cx0 + 12, cy0 + 12, aw, ah, 14); g.clip();
    const s = Math.max(aw / art.naturalWidth, ah / art.naturalHeight), dw = art.naturalWidth * s, dh = art.naturalHeight * s;
    g.drawImage(art, cx0 + 12 + (aw - dw) / 2, cy0 + 12 + (ah - dh) * 0.3, dw, dh); g.restore();
    rrect(g, cx0 + 12, cy0 + 12, aw, ah, 14); g.strokeStyle = "rgba(197,164,111,.6)"; g.lineWidth = 1.5; g.stroke();
    g.font = `italic 600 38px ${LATIN}`; const numW = g.measureText(card.num).width;
    g.font = `700 34px ${SERIF}`; const nameW = g.measureText(card.name).width + (card.name.length - 1) * 8;
    const sx0 = 540 - (numW + 18 + nameW) / 2, sy = cy0 + 12 + ah + 46;
    g.textAlign = "left"; g.font = `italic 600 38px ${LATIN}`; g.fillStyle = "#7a5a33"; g.fillText(card.num, sx0, sy);
    g.font = `700 34px ${SERIF}`; g.fillStyle = "#8a3a59"; spaced(g, card.name, sx0 + numW + 18 + nameW / 2, sy, 8);
    // keywords, then the reading
    let y = cy0 + ch + 72;
    g.font = `500 28px ${SERIF}`; const kwW = g.measureText(card.kw).width + 64;
    rrect(g, 540 - kwW / 2, y - 40, kwW, 58, 29); g.fillStyle = "#f4dfe9"; g.fill();
    g.fillStyle = "#6a2a42"; g.fillText(card.kw, 540, y - 1);
    y += 84; labelRow(g, "此刻的真相", y);
    g.font = `500 36px ${SERIF}`; g.fillStyle = "#483f47";
    y += 58; wrapBalanced(g, card.truth, 840).forEach(l => { g.fillText(l, 540, y); y += 56; });
    y += 30; labelRow(g, "給妳的一小步", y);
    g.font = `500 36px ${SERIF}`; g.fillStyle = "#483f47";
    y += 58; wrapBalanced(g, card.action, 840).forEach(l => { g.fillText(l, 540, y); y += 56; });
    // where to find Zola, kept clear of the story's reply bar
    const fy = Math.max(y + 40, 1640);
    g.strokeStyle = "rgba(196,164,108,.7)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(400, fy - 52); g.lineTo(680, fy - 52); g.stroke();
    g.font = `500 28px ${SERIF}`; g.fillStyle = "#7a5a33"; g.fillText("IG @zolacoco_tarot　·　LINE @903ijdgr", 540, fy);
    g.font = `italic 600 26px ${LATIN}`; g.fillStyle = "#8a7480"; g.fillText("zolacoco-tarot.vercel.app", 540, fy + 44);
    return new Promise(res => cv.toBlob(res, "image/png"));
  }
  let inerted = [];
  function setBackgroundInert(on) {
    inerted.forEach(el => { el.inert = false; }); inerted = [];
    if (!on) return;
    inerted = [root.querySelector(".story-main"), root.querySelector(".chapters-nav")];
    // and outside the shadow root: every sibling on the way up from the story to <body>
    for (let el = host; el && el !== document.body; el = el.parentElement) {
      for (const sib of el.parentElement ? el.parentElement.children : []) if (sib !== el && !sib.inert) inerted.push(sib);
    }
    inerted = inerted.filter(Boolean); inerted.forEach(el => { el.inert = true; });
  }
  cleanups.push(() => setBackgroundInert(false));
  function closeSheet() { sheet.hidden = true; setBackgroundInert(false); document.documentElement.style.overflow = ""; if (lastFocus) lastFocus.focus({ preventScroll: true }); }
  sheet.addEventListener("keydown", e => {
    if (e.key !== "Tab") return;
    const stops = [...sheet.querySelectorAll("button, a[href]")].filter(el => !el.hidden && !el.disabled && el.getClientRects().length);
    if (!stops.length) return;
    const first = stops[0], last = stops[stops.length - 1], cur = root.activeElement;
    if (e.shiftKey && (cur === first || !sheet.contains(cur))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (cur === last || !sheet.contains(cur))) { e.preventDefault(); first.focus(); }
  });
  storyBtn.addEventListener("click", async () => {
    if (!currentCard) return;
    lastFocus = storyBtn; storyBtn.disabled = true; const label = storyBtn.textContent; storyBtn.textContent = "製作圖卡中…";
    try {
      const blob = await makeStory(currentCard);
      if (storyUrl) URL.revokeObjectURL(storyUrl);
      storyBlob = blob; storyUrl = URL.createObjectURL(blob); storyImg.src = storyUrl;
      storyImg.alt = `限動圖卡：${currentCard.num} ${currentCard.name}，${currentCard.kw}`;
      storyFile = new File([blob], `zolacoco-${currentCard.en.toLowerCase().replace(/\s+/g, "-")}.png`, { type: "image/png" });
      storyDl.href = storyUrl; storyDl.download = storyFile.name;
      storyShare.hidden = !(navigator.canShare && navigator.canShare({ files: [storyFile] }));
      storyTip.textContent = matchMedia("(pointer: coarse)").matches ? "長按圖片，選「儲存到照片」，就能貼到 IG 限動" : "按「下載圖片」存起來，再上傳到 IG 限動";
      sheet.hidden = false; setBackgroundInert(true); document.documentElement.style.overflow = "hidden";
      root.getElementById("storyClose").focus({ preventScroll: true });
    } catch (_) { storyBtn.textContent = "圖卡製作失敗，再試一次"; storyBtn.disabled = false; return; }
    storyBtn.textContent = label; storyBtn.disabled = false;
  });
  storyShare.addEventListener("click", async () => {
    try { await navigator.share({ files: [storyFile], title: "Zolacoco Tarot" }); }
    catch (e) { if (e && e.name !== "AbortError") storyTip.textContent = "這個畫面不能直接分享，長按圖片儲存就可以了"; }
  });
  root.getElementById("storyClose").addEventListener("click", closeSheet);
  sheet.addEventListener("click", e => { if (e.target === sheet) closeSheet(); });
  ON("keydown", e => { if (e.key === "Escape" && !sheet.hidden) closeSheet(); });
  /* ---------- chapter worlds ---------- */
  const EXTRA = extraData;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const txt = sym => sym + "\uFE0E";

  // gentle parallax on the room backgrounds (mouse only)
  root.querySelectorAll(".room-world").forEach(wd => {
    const bg = wd.querySelector(".bg");
    if (!bg) return;
    wd.addEventListener("pointermove", e => {
      if (e.pointerType !== "mouse" || reduce) return;
      const r = wd.getBoundingClientRect();
      bg.style.setProperty("--px", `${((e.clientX - r.left) / r.width - 0.5) * -18}px`);
      bg.style.setProperty("--py", `${((e.clientY - r.top) / r.height - 0.5) * -12}px`);
    });
    wd.addEventListener("pointerleave", () => { bg.style.setProperty("--px", "0px"); bg.style.setProperty("--py", "0px"); });
  });

  // I. the Star card: tilt it, tap it for stardust
  const holo = root.getElementById("holo"), cardWorld = root.getElementById("cardWorld"), holoHint = root.getElementById("holoHint");
  let hDrag = null, hMoved = false;
  function tilt(rx, ry) { holo.style.setProperty("--rx", rx + "deg"); holo.style.setProperty("--ry", ry + "deg"); holo.style.setProperty("--sx", (50 - ry * 2.4) + "%"); }
  holo.addEventListener("pointerdown", e => { hDrag = { x: e.clientX }; hMoved = false; });
  holo.addEventListener("pointermove", e => {
    if (hDrag) {
      const dx = e.clientX - hDrag.x;
      if (!hMoved && Math.abs(dx) > 6) { hMoved = true; holo.classList.add("dragging"); try { holo.setPointerCapture(e.pointerId); } catch (_) {} }
      if (hMoved) tilt(0, Math.max(-40, Math.min(40, dx * 0.4)));
    } else if (e.pointerType === "mouse") {
      const r = holo.getBoundingClientRect();
      tilt(-((e.clientY - r.top) / r.height - 0.5) * 16, ((e.clientX - r.left) / r.width - 0.5) * 24);
    }
  });
  const hEnd = () => { if (!hDrag) return; hDrag = null; holo.classList.remove("dragging"); tilt(0, 0); TO(() => { hMoved = false; }, 0); };
  holo.addEventListener("pointerup", hEnd); holo.addEventListener("pointercancel", hEnd);
  holo.addEventListener("pointerleave", () => { if (!hDrag) tilt(0, 0); });
  holo.addEventListener("click", e => {
    if (hMoved) return;
    const r = holo.getBoundingClientRect();
    const x = e.detail ? e.clientX : r.left + r.width / 2, y = e.detail ? e.clientY : r.top + r.height / 2;
    const w = cardWorld.getBoundingClientRect(), cols = ["#d48ea8", "#e9b9ca", "#c4a46c", "#f1cbd8"];
    for (let k = 0; k < 18; k++) {
      const sp = document.createElement("span"), a = Math.random() * TAU, d = 50 + Math.random() * 120, z = 14 + Math.random() * 18;
      sp.className = "spark";
      sp.style.cssText = `left:${x - w.left}px;top:${y - w.top}px;width:${z}px;height:${z}px;margin:${-z / 2}px 0 0 ${-z / 2}px;--c:${cols[k % 4]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px`;
      cardWorld.appendChild(sp); TO(() => sp.remove(), 1050);
    }
    holoHint.textContent = MAJORS[17].truth;
  });

  // II. the pendulum: real swing, drag it, or ask it; a gilded dowsing chart lies in the clouds under it
  const pendEl = root.getElementById("pend"), pendWorld = root.getElementById("pendWorld");
  const pendResult = root.getElementById("pendResult"), askBtn = root.getElementById("askPend");
  const pendHint = pendWorld.querySelector(".world-hint");
  const fxCv = document.createElement("canvas"); fxCv.className = "pend-fx"; fxCv.setAttribute("aria-hidden", "true");
  pendWorld.insertBefore(fxCv, pendEl);
  const fx = fxCv.getContext("2d");
  let FW = 1, FH = 1, fxDirty = false;
  function fxSize() { const r = pendWorld.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); FW = r.width; FH = r.height; fxCv.width = Math.round(FW * d); fxCv.height = Math.round(FH * d); fx.setTransform(d, 0, 0, d, 0, 0); }
  fxSize(); ON("resize", fxSize);

  let pa = 0.12, pw = 0, pz = 0, pwz = 0, pDrag = null, lastP = performance.now(), asking = false;
  let guide = null, askAt = 0;
  pendWorld.addEventListener("pointerdown", e => { if (e.target.closest("button, input")) return; pDrag = { x: e.clientX, t: performance.now(), on: false }; });
  pendWorld.addEventListener("pointermove", e => {
    if (!pDrag) return;
    if (!pDrag.on) { if (Math.abs(e.clientX - pDrag.x) < 5) return; pDrag.on = true; guide = null; try { pendWorld.setPointerCapture(e.pointerId); } catch (_) {} }
    const r = pendWorld.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height * 0.01;
    const na = Math.max(-0.42, Math.min(0.42, -Math.atan2(e.clientX - cx, Math.max(60, e.clientY - cy))));
    const now = performance.now(); pw = (na - pa) / Math.max(0.016, (now - pDrag.t) / 1000); pDrag.t = now; pa = na;
  });
  const pEnd = () => { if (!pDrag) return; pDrag = null; pw = Math.max(-1.2, Math.min(1.2, pw)); };
  pendWorld.addEventListener("pointerup", pEnd); pendWorld.addEventListener("pointercancel", pEnd);

  function pendLoop(now) {
    RAF(pendLoop);
    if (reduce && !asking && !(pDrag && pDrag.on) && Math.abs(pw) < 1e-4 && fxDirty) { lastP = now; return; }
    const dt = Math.max(0, Math.min(0.033, (now - lastP) / 1000)); lastP = now; const t = now / 1000;
    if (guide && !(pDrag && pDrag.on)) { // the swing plane searches the chart, then settles on the answer
      const e = (now - askAt) / 1000;
      let A;
      if (asking) { guide.cur = Math.PI / 2 + 1.25 * Math.sin(e * 1.5); A = Math.min(0.24, 0.05 + e * 0.16); }
      else { const s = Math.min(1, (now - guide.at) / 1000), ss = s * s * (3 - 2 * s); guide.cur = guide.from + (guide.phi - guide.from) * ss; A = Math.max(0.12, 0.24 * Math.exp(-Math.max(0, (now - guide.at) / 1000 - 2) / 5)); }
      const sw = Math.sin(3 * e), k = Math.min(1, dt * 8);
      pa += (-A * Math.cos(guide.cur) * sw - pa) * k; pz += (A * Math.sin(guide.cur) * sw - pz) * k; pw = 0; pwz = 0;
    } else if (!(pDrag && pDrag.on)) {
      const drive = reduce || asking ? 0 : 0.06 * Math.sin(t * 3);
      let acc = -9 * Math.sin(pa) - 0.22 * pw + drive;
      let accz = -9 * Math.sin(pz) - 0.32 * pwz;
      pw += acc * dt; pa += pw * dt; pwz += accz * dt; pz += pwz * dt;
    }
    // the camera looks slightly down onto the clouds, so a swing towards us draws an ellipse
    const vx = Math.sin(pa), vy = Math.cos(pa) * Math.cos(pz) + 0.38 * Math.sin(pz);
    const ang = Math.atan2(vx, vy);
    pendEl.style.setProperty("--a", ang + "rad");
    pendEl.style.setProperty("--sy", Math.hypot(vx, vy).toFixed(4)); pendEl.style.setProperty("--s", (1 + 0.07 * Math.sin(pz)).toFixed(4));
    const wr = pendWorld.getBoundingClientRect();
    if (wr.bottom < -50 || wr.top > innerHeight + 50) { if (fxDirty) { fx.clearRect(0, 0, FW, FH); fxDirty = false; } return; }
    fx.clearRect(0, 0, FW, FH); fxDirty = true;
    const L = pendEl.offsetHeight, px0 = FW / 2, py0 = pendEl.offsetTop;
    drawChart(t, px0, py0 + L * 0.93 + 10);
  }

  // C. dowsing chart: a gilded half-circle lies in the clouds under the crystal; the swing line points to 是 · 未定 · 否
  const CH = [{ p: Math.PI / 6, zh: "是", en: "YES" }, { p: Math.PI / 2, zh: "未定", en: "WAIT" }, { p: Math.PI * 5 / 6, zh: "否", en: "NO" }];
  const TILT = 0.38;
  function drawChart(t, cx, cy) {
    const rr = Math.min(FW * 0.37, 160), gold = a => `rgba(176,134,70,${a})`;
    const P = (r, p) => [cx + Math.cos(p) * r, cy + TILT * Math.sin(p) * r];
    const cur = guide ? guide.cur : null;
    const settled = guide && !asking && Math.abs(guide.cur - guide.phi) < 0.04;
    // lit sector
    CH.forEach((c, i) => {
      const lit = settled && i === guide.k ? 0.6 + 0.15 * Math.sin(t * 4) : cur != null && Math.abs(cur - c.p) < Math.PI / 6 ? 0.16 : 0;
      if (lit) {
        fx.save(); fx.translate(cx, cy); fx.scale(1, TILT);
        const g = fx.createRadialGradient(0, 0, rr * 0.15, 0, 0, rr * 1.05);
        g.addColorStop(0, "rgba(255,214,230,0)"); g.addColorStop(0.55, `rgba(255,205,224,${lit})`); g.addColorStop(1, "rgba(255,214,230,0)");
        fx.fillStyle = g; fx.beginPath(); fx.moveTo(0, 0); fx.arc(0, 0, rr * 1.05, c.p - Math.PI / 6, c.p + Math.PI / 6); fx.closePath(); fx.fill(); fx.restore();
      }
    });
    // rim, inner ring and the sector spokes
    fx.save(); fx.translate(cx, cy); fx.scale(1, TILT);
    fx.lineWidth = 1.3 / Math.sqrt(TILT);
    fx.strokeStyle = gold(0.35); fx.beginPath(); fx.arc(0, 0, rr, Math.PI, Math.PI * 2); fx.stroke();
    fx.strokeStyle = gold(0.85); fx.beginPath(); fx.arc(0, 0, rr, 0, Math.PI); fx.stroke();
    fx.lineWidth = 0.7 / Math.sqrt(TILT); fx.beginPath(); fx.arc(0, 0, rr - 8, 0, Math.PI); fx.stroke();
    fx.beginPath(); fx.arc(0, 0, rr * 0.34, 0, Math.PI * 2); fx.stroke();
    for (let p = 0; p <= Math.PI + 1e-6; p += Math.PI / 36) { fx.beginPath(); fx.moveTo(Math.cos(p) * (rr - 8), Math.sin(p) * (rr - 8)); fx.lineTo(Math.cos(p) * (rr - (p * 36 / Math.PI % 3 < 0.5 ? 16 : 12)), Math.sin(p) * (rr - (p * 36 / Math.PI % 3 < 0.5 ? 16 : 12))); fx.stroke(); }
    fx.lineWidth = 1 / Math.sqrt(TILT);
    for (const p of [0, Math.PI / 3, Math.PI * 2 / 3, Math.PI]) { fx.beginPath(); fx.moveTo(Math.cos(p) * rr * 0.34, Math.sin(p) * rr * 0.34); fx.lineTo(Math.cos(p) * rr, Math.sin(p) * rr); fx.stroke(); }
    fx.restore();
    for (const p of [0, Math.PI]) { const [x, y] = P(rr, p); diamond(x, y, 5, gold(0.9)); }
    // the swing line: where the pendulum is pointing right now
    if (cur != null) {
      const [x0, y0] = P(rr * 1.02, cur + Math.PI), [x1, y1] = P(rr * 1.02, cur);
      const g = fx.createLinearGradient(x0, y0, x1, y1);
      g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.45, "rgba(255,255,255,.9)"); g.addColorStop(1, `rgba(232,150,186,${settled ? 1 : 0.8})`);
      fx.strokeStyle = g; fx.lineWidth = settled ? 3.5 : 2.5; fx.shadowColor = "rgba(255,190,214,.9)"; fx.shadowBlur = 10;
      fx.beginPath(); fx.moveTo(x0, y0); fx.lineTo(x1, y1); fx.stroke(); fx.shadowBlur = 0;
    }
    // labels stand upright on the front rim
    CH.forEach((c, i) => {
      const on = settled && i === guide.k, [lx, ly] = P(rr + 26, c.p);
      fx.textAlign = "center"; fx.textBaseline = "middle";
      fx.font = `700 ${on ? 22 : 17}px "Noto Serif TC", "Songti TC", serif`;
      fx.shadowColor = on ? "rgba(255,190,214,.95)" : "rgba(255,255,255,.95)"; fx.shadowBlur = on ? 14 : 6;
      fx.fillStyle = on ? "#8a3a59" : "rgba(122,90,51,.95)"; fx.fillText(c.zh, lx, ly);
      fx.font = 'italic 600 9px "Cormorant Garamond", Georgia, serif'; fx.shadowBlur = 4;
      fx.fillText(c.en.split("").join(" "), lx, ly + 16); fx.shadowBlur = 0;
    });
  }
  function diamond(x, y, r, c) { fx.fillStyle = c; fx.beginPath(); fx.moveTo(x, y - r); fx.lineTo(x + r * 0.7, y); fx.lineTo(x, y + r); fx.lineTo(x - r * 0.7, y); fx.closePath(); fx.fill(); }


  RAF(pendLoop);

  const weights = [0.32, 0.32, 0.09, 0.09, 0.09, 0.09];
  const askForm = root.getElementById("askForm"), pendQ = root.getElementById("pendQ");
  const esc = t => t.replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  let answered = false;
  askForm.addEventListener("submit", e => { e.preventDefault(); askBtn.click(); });
  // the written question drifts down into the chart before the pendulum moves
  function floatQuestion(q) {
    if (reduce) return;
    const wr = pendWorld.getBoundingClientRect(), ir = pendQ.getBoundingClientRect();
    const el = document.createElement("span"); el.className = "q-float"; el.textContent = q;
    pendWorld.appendChild(el);
    const x0 = ir.left + ir.width / 2 - wr.left, y0 = ir.top + ir.height / 2 - wr.top;
    const x1 = wr.width / 2, y1 = pendEl.offsetTop + pendEl.offsetHeight * 0.93 + 10;
    el.style.left = x0 + "px"; el.style.top = y0 + "px";
    RAF(() => RAF(() => { el.style.transform = `translate(-50%, -50%) translate(${x1 - x0}px, ${y1 - y0}px) scale(.55)`; el.style.opacity = "0"; }));
    TO(() => el.remove(), 1500);
  }
  askBtn.addEventListener("click", () => {
    if (asking) return;
    if (answered) { // 再問一次 goes back to the question first
      answered = false; pendResult.innerHTML = ""; askForm.hidden = false; pendHint.hidden = false;
      pendQ.value = ""; askBtn.textContent = "問靈擺"; return;
    }
    const q = pendQ.value.trim(); pendQ.blur();
    if (q) floatQuestion(q);
    askForm.hidden = true; pendHint.hidden = true;
    asking = true; askAt = performance.now(); guide = reduce ? null : { cur: Math.PI / 2 };
    let u = Math.random(), k = 0; for (; k < weights.length - 1; k++) { u -= weights[k]; if (u < 0) break; }
    pendResult.innerHTML = '<p class="line">靈擺正在感應妳的問題…</p>';
    TO(() => {
      asking = false;
      if (guide) { guide.k = k === 0 ? 0 : k === 1 ? 2 : 1; guide.phi = CH[guide.k].p; guide.from = guide.cur; guide.at = performance.now(); }
      TO(() => {
        const r = EXTRA.answers[k];
        pendResult.innerHTML = `${q ? `<p class="q">妳問：「${esc(q)}」</p>` : ""}<p class="big">${r.l}<i>${r.en}</i></p><p class="line">${r.d}</p>`;
        askBtn.textContent = "再問一次"; answered = true;
      }, reduce ? 0 : 1200);
    }, reduce ? 0 : 2400);
  });

  // III. the astro die: tap to roll
  const dieEl = root.getElementById("die"), diceResult = root.getElementById("diceResult"), diceWorld = root.getElementById("diceWorld");
  // the planet medallion sits on the die's plain front face, in the painting's perspective
  const dieFace = root.getElementById("dieFace"), dieGlyph = root.getElementById("dieGlyph"), dieName = root.getElementById("dieName");
  function quad(wd, ht, [[x0, y0], [x1, y1], [x2, y2], [x3, y3]]) {
    const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
    const den = dx1 * dy2 - dx2 * dy1, g = (dx3 * dy2 - dx2 * dy3) / den, hh = (dx1 * dy3 - dx3 * dy1) / den;
    const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3;
    return `matrix3d(${a / wd},${d / wd},0,${g / wd},${b / ht},${e / ht},0,${hh / ht},0,0,1,0,${x0},${y0},0,1)`;
  }
  function fitFace() {
    const sz = dieEl.clientWidth;
    dieFace.style.transform = quad(100, 100, [[0.05, 0.262], [0.775, 0.27], [0.77, 0.962], [0.035, 0.948]].map(([x, y]) => [x * sz, y * sz]));
  }
  fitFace(); ON("resize", fitFace);
  if ("ResizeObserver" in window) RO(fitFace).observe(dieEl);
  function showPlanet(p) {
    dieGlyph.textContent = p.s + "\uFE0E"; dieName.textContent = p.n;
    dieFace.classList.remove("swap"); void dieFace.offsetWidth; dieFace.classList.add("swap");
    dieFace.style.opacity = "1";
  }
  dieFace.style.transition = "opacity .2s";
  dieEl.addEventListener("click", () => {
    if (dieEl.classList.contains("rolling")) return;
    diceResult.innerHTML = "";
    const roll = { p: pick(EXTRA.planets), s: pick(EXTRA.signs), h: pick(EXTRA.houses) };
    dieFace.style.opacity = "0";
    const shadowEl = root.getElementById("dieShadow");
    dieEl.classList.add("rolling"); shadowEl.classList.add("rolling");
    TO(() => { // the die lands: a small burst of stardust on the clouds
      const w = diceWorld.getBoundingClientRect(), d = dieEl.getBoundingClientRect();
      const cx = d.left + d.width / 2 - w.left, cy = d.bottom - d.height * 0.12 - w.top, cols = ["#d48ea8", "#e9b9ca", "#c4a46c", "#f1cbd8"];
      for (let k = 0; k < 16; k++) {
        const sp = document.createElement("span"), a = Math.PI + Math.random() * Math.PI, dd = 40 + Math.random() * 90, z = 10 + Math.random() * 14;
        sp.className = "spark";
        sp.style.cssText = `left:${cx}px;top:${cy}px;width:${z}px;height:${z}px;margin:${-z / 2}px 0 0 ${-z / 2}px;--c:${cols[k % 4]};--dx:${Math.cos(a) * dd * 1.4}px;--dy:${Math.sin(a) * dd * 0.6}px`;
        diceWorld.appendChild(sp); TO(() => sp.remove(), 1050);
      }
      showPlanet(roll.p);
    }, reduce ? 0 : 1036);
    TO(() => {
      const { p, s, h } = roll;
      diceResult.innerHTML = `<p class="dice-line">${txt(p.s)} ${p.n}<b>·</b>${txt(s.s)} ${s.n}<b>·</b>${txt(h.s)} ${h.n}</p><p class="line">${p.m}。${h.p}</p>`;
      dieEl.classList.remove("rolling"); shadowEl.classList.remove("rolling");
    }, reduce ? 0 : 1420);
  });
  // shake the phone to roll; an iPhone asks once for motion access, from a tap
  const shakeBtn = root.getElementById("shakeBtn");
  if ("DeviceMotionEvent" in window && matchMedia("(pointer: coarse)").matches) shakeBtn.hidden = false;
  let shakeOn = false, lastShake = 0, prevA = null, gotMotion = false;
  function onMotion(e) {
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (!a || a.x == null) return;
    gotMotion = true;
    if (prevA) {
      const d = Math.abs(a.x - prevA.x) + Math.abs(a.y - prevA.y) + Math.abs(a.z - prevA.z), now = performance.now(), r = diceWorld.getBoundingClientRect();
      if (d > 22 && now - lastShake > 1800 && r.top < innerHeight * 0.7 && r.bottom > innerHeight * 0.3) { lastShake = now; dieEl.click(); }
    }
    prevA = { x: a.x, y: a.y, z: a.z };
  }
  shakeBtn.addEventListener("click", async () => {
    if (shakeOn) return;
    let state = "granted";
    try { if (typeof DeviceMotionEvent.requestPermission === "function") state = await DeviceMotionEvent.requestPermission(); } catch (_) { state = "blocked"; }
    if (state !== "granted") { shakeBtn.textContent = state === "denied" ? "沒有開啟動作權限，用點的也可以擲骰" : "這個預覽畫面讀不到手機動作，正式網站上就能搖"; return; }
    ON("devicemotion", onMotion); shakeOn = true; shakeBtn.classList.add("on");
    shakeBtn.textContent = "已開啟：拿起手機搖一搖，星骰就會擲出";
    TO(() => { if (!gotMotion) { OFF("devicemotion", onMotion); shakeOn = false; shakeBtn.classList.remove("on"); shakeBtn.textContent = "這個預覽畫面讀不到手機動作，正式網站上就能搖"; } }, 1500);
  });

  /* ---------- client voices: a LINE-style thread that types itself out as it comes into view ---------- */
  // Real messages from Zola's LINE (2026-11), names removed; each client must agree before this goes live.
  const CHAT = [
    { label: "4 週陪跑・第二週", who: "a" },
    { who: "a", t: "老師我之後可以用完整版的陪跑方案嗎？" },
    { label: "4 週陪跑・最後一週", who: "a" },
    { who: "a", t: "老師真的很謝謝妳 這四週的陪跑報告 我不會被同事的反應牽著走 不然我這樣真的很累 會影響我的心情 老師好險有遇到妳 不然我現在還是待在原地不知道要怎麼辦 真的很感謝妳 有妳真好" },
    { label: "收到牌陣解析那天", who: "b" },
    { who: "b", t: "老師，我等等一次看完，天呀，您好用心，解釋的好清楚哦" },
    { who: "b", t: "老師我看完了，您真的太厲害了" },
    { who: "b", t: "謝謝老師的解惑，您真的幫我好大的忙，我內心平靜許多了，不然我天天哭。" },
  ];
  const chat = root.getElementById("chat");
  const bubble = (m, typing) => {
    if (m.label) { const day = document.createElement("p"); day.className = "chat-day"; day.textContent = m.label; return day; }
    const row = document.createElement("div"); row.className = `msg ${m.who === "z" ? "me" : "them"} who-${m.who}`;
    row.innerHTML = `<span class="ava" aria-hidden="true">${m.who === "z" ? "Z" : "客"}</span><p class="bub${typing ? " typing" : ""}">${typing ? "<i></i><i></i><i></i>" : esc(m.t)}</p>`;
    if (!typing) row.querySelector(".bub").setAttribute("aria-label", `${m.who === "z" ? "Zola" : "客人"}：${m.t}`);
    return row;
  };
  function playChat() {
    if (reduce) { CHAT.forEach(m => chat.appendChild(bubble(m))); return; }
    let t = 0;
    CHAT.forEach(m => {
      if (m.label) { TO(() => chat.appendChild(bubble(m)), t); t += 450; return; }
      const wait = m.who === "z" ? 600 : 900;
      TO(() => { const dots = bubble(m, true); chat.appendChild(dots); TO(() => dots.replaceWith(bubble(m)), wait); }, t);
      t += wait + 650;
    });
  }
  if ("IntersectionObserver" in window) {
    const io2 = IO(es => { if (es.some(e => e.isIntersecting)) { io2.disconnect(); playChat(); } }, { threshold: 0.25 });
    io2.observe(chat);
  } else playChat();

  /* ---------- which way of working fits: three questions, then a plan and a LINE button ---------- */
  const LINE_URL = "https://lin.ee/tchILJk";
  // public wording: 體驗、單次正式、4 週、8 週 (Zola, 2026-11-20); no prices on the site
  const PLANS = [
    { name: "體驗諮詢", en: "First reading", fit: "想先感受一次 Zola 的解讀，再決定要不要更深入。", items: ["單次諮詢", "10 分鐘通話（或文字）", "解析 1 個問題"] },
    { name: "單次正式諮詢", en: "Full reading", fit: "有一件事想一次好好問清楚，不需要後續追蹤。", items: ["單次完整諮詢", "一次把這個主題梳理清楚"] },
    { name: "4 週陪跑", en: "Four weeks together", fit: "事情還在變化，想有人陪著邊走邊調整。", items: ["4 週", "初次通話 45 分鐘，解析 5 題", "之後 3 次追蹤，每次最多 5 題", "可提前使用 1 次重大事件判斷"] },
    { name: "8 週陪跑", en: "Eight weeks together", fit: "同一類問題反覆發生、正面臨重大轉換，或想理解自己長期的感情與工作模式。", items: ["8 週", "初次通話 60 分鐘，含本命星盤核心議題", "之後 6 次追蹤，每次最多 5 題", "中期與總結通話各 30 分鐘", "2 次重大事件快速判斷", "每週一份追蹤報告，月底附當月總結"] },
  ];
  const QS = [
    { q: "妳現在的狀況比較像？", a: ["只有一個小問題，想先試試看", "有一件事想好好問清楚", "事情還在變化，想邊走邊調整", "同樣的問題一再發生，或正面臨重大轉換"] },
    { q: "妳希望被陪伴多久？", a: ["先試一次看看", "一次就把問題談完整", "四週左右", "八週，慢慢整理"] },
    { q: "妳最想得到的是？", a: ["先感受解讀適不適合我", "一次完整的分析和建議", "有人定期追蹤，給我行動建議", "看懂自己長期的感情或工作模式"] },
  ];
  const quiz = root.getElementById("quiz");
  let picks = [];
  const dots = n => `<p class="q-dots" aria-label="第 ${n + 1} 題，共 ${QS.length} 題">${QS.map((_, k) => `<span class="${k < n ? "done" : k === n ? "now" : ""}"></span>`).join("")}</p>`;
  function renderQ() {
    const n = picks.length, Q = QS[n];
    quiz.innerHTML = `${dots(n)}<h3 class="q-title">${Q.q}</h3><div class="q-opts">${Q.a.map((t, k) => `<button class="q-opt" type="button" data-k="${k}">${t}</button>`).join("")}</div>${n ? '<button class="link-btn q-back" type="button">上一題</button>' : ""}`;
    quiz.querySelectorAll(".q-opt").forEach(b => b.addEventListener("click", () => { picks.push(+b.dataset.k); picks.length < QS.length ? renderQ() : renderPlan(bestPlan()); }));
    const back = quiz.querySelector(".q-back"); if (back) back.addEventListener("click", () => { picks.pop(); renderQ(); });
  }
  function bestPlan() { // most votes wins; a tie goes to what she said about her situation
    const v = [0, 0, 0, 0]; picks.forEach(k => v[k]++);
    const top = Math.max(...v), tied = v.map((x, k) => x === top ? k : -1).filter(k => k >= 0);
    return tied.includes(picks[0]) ? picks[0] : tied[tied.length - 1];
  }
  function renderPlan(k) {
    const P = PLANS[k];
    quiz.innerHTML = `<p class="q-eyebrow">最適合現在的妳</p>
      <h3 class="plan-name">${P.name}<small>${P.en}</small></h3>
      <p class="plan-fit">${P.fit}</p>
      <ul class="plan-items">${P.items.map(t => `<li>${t}</li>`).join("")}</ul>
      <div class="actions"><a class="btn primary" href="${LINE_URL}" target="_blank" rel="noopener">用 LINE 詢問這個方案</a></div>
      <p class="plan-others">其他方案：${PLANS.map((p, j) => j === k ? "" : `<button class="link-btn" type="button" data-k="${j}">${p.name}</button>`).join("")}</p>
      <button class="link-btn q-again" type="button">重新測一次</button>`;
    quiz.querySelectorAll(".plan-others .link-btn").forEach(b => b.addEventListener("click", () => renderPlan(+b.dataset.k)));
    quiz.querySelector(".q-again").addEventListener("click", () => { picks = []; renderQ(); });
  }
  renderQ();


  return () => {
    alive = false;
    listeners.forEach(([type, fn, o]) => window.removeEventListener(type, fn, o));
    document.removeEventListener("visibilitychange", wake);
    root.removeEventListener("click", onRootClick);
    observers.forEach(o => o.disconnect());
    timers.forEach(id => clearTimeout(id)); timers.clear();
    parked.clear();
    cleanups.forEach(fn => fn());
    document.documentElement.style.overflow = "";
    host.removeAttribute("data-away");
  };
}
