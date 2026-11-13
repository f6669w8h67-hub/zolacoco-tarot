import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

// 星骰互動 v1 + 珍珠粉藍洛可可 (ChatGPT spec, 2026-11-13).
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const page = await read("app/astro-dice/page.tsx");
const css = await read("app/astro-dice/astro-dice-v1.css");

test("one block: topic, question, stage, cast; examples and records fold away", () => {
  assert.match(page, /<main className="astro-dice-page ad2-page pearl-page">/);
  assert.match(page, /import "\.\.\/styles\/pearl-page\.css";/);
  assert.doesNotMatch(page, /import "\.\/astro-dice\.css"|ad-journey|ad-intro|ad-sky/);
  assert.match(page, /<details className="ad2-ideas"/);
  assert.match(page, /function chooseIdea\(idea:string\)\{setQuestion\(idea\);setIdeasOpen\(false\)/);
  assert.match(page, /<details className="ad2-fold" id="astro-records"/);
  assert.doesNotMatch(page, /你/, "the site speaks to members as 妳");
});

test("the stage comes on screen before the 1.2s roll; reduced motion shows the dice at once", () => {
  assert.match(page, /const ROLL_MS=1200;/);
  assert.match(page, /later\(show,reducedMotion\(\)\?200:ROLL_MS\)/);
  assert.match(page, /const wait=fullyVisible\(stageRef\.current\)\?0:scrollToTop\(stageRef\.current\);/);
  assert.match(css, /animation: ad2Tumble 1\.2s cubic-bezier\(\.22, 1, \.36, 1\) both; animation-delay: calc\(var\(--i, 0\) \* 80ms\);/);
  assert.match(css, /25% \{ transform: translateY\(-18px\) rotate\(-18deg\); \}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\n  \.ad2-page \.ad2-die\.is-rolling \.ad2-die-body, \.ad2-page \.ad2-die\.is-rolling \.ad2-glyph \{ animation: none; \}/);
});

test("result: summary, current, friction, action and reflection open; the full reading folds", () => {
  const result = page.slice(page.indexOf('className="ad2-result"'));
  const order = ["整體訊息", "目前狀況", "需要留意", "今天可以做什麼", "完整星骰解析", "給自己的覺察題"].map((text) => result.indexOf(text));
  assert.ok(order.every((index) => index > 0), String(order));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.match(result, /<details className="ad2-more">/);
  assert.match(result, /\{item!\.meaning\}<\/p><b>\{item!\.prompt\}<\/b>/);
  assert.match(result, /\{categoryLead\[reading\.category\]\}/);
});

test("save once, say so, and open the record; the storage format is unchanged", () => {
  assert.match(page, /const ASTRO_STORAGE_KEY = "zolacoco-astro-dice-records-v1";/);
  assert.match(page, /if\(!reading\|\|savedId!==null\)return;/);
  assert.match(page, /\.slice\(0,80\)/);
  assert.match(page, /這次星骰結果已保存 ✨/);
  assert.match(page, /已儲存 ✓/);
  assert.match(page, /查看我的星骰紀錄/);
  assert.match(page, /id=\{`astro-entry-\$\{item\.id\}`\}/);
  assert.match(page, /planet_name:reading\.roll\.planet\.name,sign_name:reading\.roll\.sign\.name,house_name:reading\.roll\.house\.name,note/);
});

test("porcelain dice art with the symbol drawn by the page; small symbol font; no overflow ring", () => {
  for (const file of ["die.webp", "stage.webp", "stage-800.webp", "hero-desktop.webp", "hero-mobile.webp"]) {
    assert.ok(existsSync(new URL(`../public/astro-dice/${file}`, import.meta.url)), file);
  }
  assert.match(page, /<img src="\/astro-dice\/die\.webp" alt="" draggable=\{false\}\/><span className="ad2-cartouche" aria-hidden="true">/);
  for (const font of ["astro-serif-subset.woff2", "cormorant-numerals-600.woff2"]) {
    assert.match(css, new RegExp(`src: url\\("/fonts/${font.replace(".", "\\.")}"\\) format\\("woff2"\\);`));
    assert.ok(statSync(new URL(`../public/fonts/${font}`, import.meta.url)).size < 20000, font);
  }
  assert.doesNotMatch(page, /ad-table-rings/);
  assert.match(css, /\.ad2-page \.ad2-stage \{[^}]*overflow: clip;/);
});

test("pearl palette: no browns, khaki, deep purple or dark buttons", () => {
  const hsl = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min, s = l > .5 ? d / (2 - max - min) : d / (max + min);
    let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  };
  // gold ornaments, and the gold-foil shading tones used only inside the engraved die glyphs (骰面符號 v2)
  const ornamentGold = new Set(["#c5a46f", "#d8be8a", "#f8e7be", "#b99258", "#f3e3ba", "#a77a43"]);
  for (const hex of (css.match(/#[0-9a-fA-F]{6}\b/g) || []).map((value) => value.toLowerCase())) {
    if (ornamentGold.has(hex)) continue;
    const [h, s, l] = hsl(hex);
    assert.ok(!(h >= 15 && h <= 55 && s >= .12 && (l < .55 || (s < .45 && l < .9))), `earthy ${hex}`);
    assert.ok(!(h >= 230 && h <= 335 && s >= .12 && l <= .38), `deep purple ${hex}`);
  }
  assert.match(css, /background: linear-gradient\(180deg, #fff2f8 0%, #f4dfe9 100%\);/);
});

test("a roll locks at once, before scrolling, so a second tap cannot start another roll (review B1)", () => {
  const cast = page.slice(page.indexOf("  function cast(){"), page.indexOf("  function save(){"));
  assert.match(cast, /if\(!question\.trim\(\)\|\|busyRef\.current\)return;\n    busyRef\.current=true;setBusy\(true\);/);
  assert.ok(cast.indexOf("busyRef.current=true") < cast.indexOf("scrollToTop(stageRef.current)"));
  assert.match(page, /className="ad2-cast" disabled=\{!question\.trim\(\)\|\|busy\}/);
});

test("result and record come from one snapshot; question and topic are locked until 換一個問題 (review B2)", () => {
  assert.match(page, /const \[reading,setReading\]=useState<\{roll:Roll;question:string;category:string\}\|null>\(null\);/);
  assert.match(page, /const specific=useMemo\(\(\)=>reading\?detailedReading\(reading\.roll,reading\.category\):null,\[reading\]\);/);
  assert.match(page, /妳問的是「\$\{reading\.question\}」/);
  const save = page.slice(page.indexOf("  function save(){"), page.indexOf("  function viewRecord(){"));
  assert.match(save, /question:reading\.question,category:reading\.category,planet_name:reading\.roll\.planet\.name/);
  assert.doesNotMatch(save, /question\.trim\(\)|question:question|,category,/);
  assert.match(page, /const locked=busy\|\|reading!==null;/);
  assert.match(page, /value=\{question\} disabled=\{locked\}/);
  assert.match(page, /aria-pressed=\{category===item\} disabled=\{locked\}/);
  assert.match(page, /\{!locked&&<details className="ad2-ideas"/);
  assert.match(page, /const asked=reading\?\{question:reading\.question,category:reading\.category\}/);
  assert.match(page, /function newQuestion\(\)\{clearTimers\(\);busyRef\.current=false;setBusy\(false\);setRolling\(false\);setReading\(null\);/);
});

test("骰面符號 v2: gold engraved glyphs in an ivory cartouche, Latin numerals for houses", async () => {
  assert.match(page, /const ROMAN=\["","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"\];/);
  assert.match(page, /type==="house"\?<span className="ad2-glyph roman">\{ROMAN\[Number\(item\.key\)\]\?\?item\.symbol\}<\/span>/);
  assert.equal((page.match(/className="ad2-cartouche"/g) || []).length, 3, "die, result card and full reading");
  assert.doesNotMatch(page + css, /ad2-symbol|zolacoco-astro-symbols-subset/);
  assert.match(css, /background: linear-gradient\(180deg, #f8e7be 0%, #d8be8a 38%, #b99258 72%, #f3e3ba 100%\);\n  -webkit-background-clip: text; background-clip: text; color: transparent;/);
  assert.match(css, /transform: translate\(-50%, -50%\) perspective\(200px\) rotateX\(5deg\) rotateY\(-4deg\) scale\(\.98\);/);
  const fonts = await read("public/fonts/README-fonts.txt");
  assert.match(fonts, /GNU FreeFont font exception/);
});
