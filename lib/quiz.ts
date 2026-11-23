// 心理測驗 on the site (Zola 2026-11-22): every IG quiz also goes up here and opens at the same time as the
// IG post. Two kinds:
//  - "abc"          三選一圖卡: five IG cards (1080×1350), pick A／B／C, read that analysis.
//  - "first-sight"  第一眼測驗: one painting with four hidden things; tap what she saw first.
// Each quiz keeps its own look (「美編每一篇都要換」): an abc quiz its rainbow colour, a first-sight quiz its
// painting and its paper (信紙拼貼／淺色／深色). Pure helpers only: no database, no network.

export const QUIZ_COLORS = {
  red: { label: "紅", tint: "#f2c4ce", ink: "#d4607a" },
  orange: { label: "橙", tint: "#ffc9a8", ink: "#e8825a" },
  yellow: { label: "黃", tint: "#e8c86a", ink: "#b8923c" },
  green: { label: "綠", tint: "#bfe8d2", ink: "#5fa07e" },
  blue: { label: "藍", tint: "#a8c4f0", ink: "#6490d4" },
  indigo: { label: "靛", tint: "#e8c86a", ink: "#3a4a6e" },
  purple: { label: "紫", tint: "#d4a8f0", ink: "#a855d4" },
} as const;
export type QuizColor = keyof typeof QUIZ_COLORS;
export const RAINBOW: QuizColor[] = ["red", "orange", "yellow", "green", "blue", "indigo", "purple"];

/** The generator's own colour names (zola-psych-quiz-generator) → the rainbow. */
const TEMPLATE_COLORS: Record<string, QuizColor> = {
  rose: "red", orangepink: "orange", gold: "yellow", mint: "green", blue: "blue", navygold: "indigo", purple: "purple",
};

export const FIRST_SIGHT_THEMES = {
  letter: { label: "信紙拼貼", accent: "#c0637a" },
  light: { label: "淺色", accent: "#a8732f" },
  dark: { label: "深色", accent: "#e8c27a" },
} as const;
export type FirstSightTheme = keyof typeof FIRST_SIGHT_THEMES;

export const ZOLA_LINE_URL = "https://lin.ee/tchILJk";
const ZOLA_LINE_ID = "@903ijdgr";
// Zola's official account @903ijdgr: today's link, the two she used before it (Zola, 2026-11), and the one in
// her 第一眼 generator (Zola 2026-11-22: lin.ee/6iPii8m 「也是我的官方帳號」).
const ZOLA_LINE_SHORT = new Set(["tchILJk", "XIi2Nam", "sPw8XmU", "6iPii8m"]);
const ZOLA_LINE_PATH = /^\/(?:R\/)?(?:ti\/p|oaMessage)\/(?:@|%40)903ijdgr\/?$/i;

/** A link that opens Zola's own official account, where the visitor's message can be typed in for her. */
export function isZolaLine(url: string) {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return false; }
  if (parsed.protocol !== "https:") return false;
  if (parsed.hostname === "lin.ee") return ZOLA_LINE_SHORT.has(parsed.pathname.replace(/^\/|\/$/g, ""));
  return parsed.hostname === "line.me" && ZOLA_LINE_PATH.test(parsed.pathname);
}

export type Choice = "A" | "B" | "C";
export const CHOICES: Choice[] = ["A", "B", "C"];

export type AbcData = {
  cards: string[];                      // five card images, in order
  choices: (string | null)[];           // A／B／C option art, when there is a separate file
  analysis: Record<Choice, string>;
  hook: string;
  caption: string;                      // the IG post text (A block), for search and screen readers
  lineUrl: string;
};
export type FirstSightObject = { name: string; x: number; y: number; s: number; hint: string; text: string; line: string };
export type FirstSightData = {
  painting: string;
  blur: string | null;
  paper: string | null;                 // 信紙拼貼's paper texture
  ratio: number;                        // painting height ÷ width
  subtitle: string;
  objects: FirstSightObject[];
  hook: string;
  caption: string;
  lineUrl: string;
};

type QuizBase = { code: string; title: string; publishAt: string; status: "draft" | "scheduled" };
export type AbcQuiz = QuizBase & { kind: "abc"; tone: QuizColor; data: AbcData };
export type FirstSightQuiz = QuizBase & { kind: "first-sight"; tone: FirstSightTheme; data: FirstSightData };
export type Quiz = AbcQuiz | FirstSightQuiz;
export type QuizSummary = { code: string; kind: Quiz["kind"]; title: string; tone: string; publishAt: string; cover: string };

/* ---------- codes and publish times ---------- */

const SLOT_TIMES: Record<number, string> = { 1: "07:00", 2: "11:20", 3: "17:20" };

/** IG post time for a quiz's number of the day: 01 → 07:00, 02 → 11:20, 03 → 17:20 (Taipei). */
export function publishAtFor(ymd: string, slot: number) {
  const time = SLOT_TIMES[slot];
  if (!time || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  return new Date(`${ymd}T${time}:00+08:00`).toISOString();
}

/** 三選一 codes are the file name: 8-digit post date + 2-digit number, e.g. 2026112201. */
export function abcCodeInfo(code: string) {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})$/.exec(code);
  if (!match) return null;
  const [, y, m, d, n] = match;
  const ymd = `${y}-${m}-${d}`;
  const date = new Date(`${ymd}T12:00:00+08:00`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== ymd) return null;
  return { ymd, slot: Number(n), publishAt: publishAtFor(ymd, Number(n)) };
}

/** 第一眼 quizzes are named by month/day and serial ("12/2", 1). The year is the one that puts the date
 *  nearest to `now` (a December quiz made in late November is this year; a January one, next year). */
export function firstSightCode(monthDay: string, serial: number, now = new Date()) {
  const match = /^(\d{1,2})\/(\d{1,2})$/.exec(monthDay.trim());
  if (!match || !Number.isInteger(serial) || serial < 1 || serial > 99) return null;
  const month = Number(match[1]), day = Number(match[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const thisYear = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric" }).format(now));
  const candidates = [thisYear - 1, thisYear, thisYear + 1].map((year) => ({ year, at: Date.parse(`${year}-${pad(month)}-${pad(day)}T12:00:00+08:00`) }));
  const best = candidates.filter((c) => Number.isFinite(c.at)).sort((a, b) => Math.abs(a.at - now.getTime()) - Math.abs(b.at - now.getTime()))[0];
  const ymd = `${best.year}-${pad(month)}-${pad(day)}`;
  return { code: `F${best.year}${pad(month)}${pad(day)}${pad(serial)}`, ymd, slot: serial, publishAt: publishAtFor(ymd, serial) };
}

export function isQuizCode(code: string) {
  return /^F?\d{10}$/.test(code);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** The Taipei calendar day of a moment, as YYYY-MM-DD. */
export function taipeiDay(at: string | Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(at));
}

export function isPublished(quiz: Pick<Quiz, "status" | "publishAt">, now = new Date()) {
  return quiz.status === "scheduled" && Date.parse(quiz.publishAt) <= now.getTime();
}

/** Zola 2026-11-22: 今天的三篇免費，舊測驗要註冊. A quiz is open to everyone for its first 24 hours
 *  (07:00, 11:20 and 17:20 make "today's three"); after that a free account opens it. */
export const FREE_HOURS = 24;
export function isFreeQuiz(publishAt: string, now = new Date()) {
  const age = now.getTime() - Date.parse(publishAt);
  return age >= 0 && age < FREE_HOURS * 60 * 60 * 1000;
}

/* ---------- the IG text ---------- */

/** Splits the generator's A～D text (【A｜IG貼文文案】…【B｜完整解析（LINE）】…) into what the site shows. */
export function parseAbcCaption(text: string) {
  const blocks: Record<string, string> = {};
  const parts = text.replace(/\r\n?/g, "\n").split(/【([A-D])｜[^】]*】/);
  for (let i = 1; i < parts.length; i += 2) blocks[parts[i]] = parts[i + 1].trim();
  const post = blocks.A ?? "";
  const titleLines = post.split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("#")).slice(0, 2);
  const title = titleLines.join(" ").replace(/｜/g, "").trim();
  const analysis = { A: "", B: "", C: "" } as Record<Choice, string>;
  let hook = "";
  const full = blocks.B ?? "";
  const starts = CHOICES.map((letter) => {
    const match = new RegExp(`(^|\\n)${letter}[.．、]\\s*`).exec(full);
    return match ? { letter, at: match.index + match[1].length, body: match.index + match[0].length } : null;
  });
  if (starts.every(Boolean)) {
    const marks = starts as { letter: Choice; at: number; body: number }[];
    marks.forEach((mark, i) => {
      const end = i + 1 < marks.length ? marks[i + 1].at : full.length;
      analysis[mark.letter] = full.slice(mark.body, end).trim();
    });
    // the fourth paragraph after C is the hook (「想知道…歡迎留言告訴我妳的困擾和年齡」)
    const paragraphs = analysis.C.split(/\n\s*\n/);
    if (paragraphs.length > 1) {
      const last = paragraphs[paragraphs.length - 1];
      if (/想知道|困擾|年齡|最後想跟妳說/.test(last)) {
        hook = last.replace(/^✨?\s*最後想跟妳說的話\s*/, "").trim();
        analysis.C = paragraphs.slice(0, -1).join("\n\n").trim();
      }
    }
  }
  return { title, post, analysis, hook };
}

/** What the generator HTML files carry, read in the browser before upload. */
export function readGeneratorHtml(html: string) {
  const embed = /window\.EMBED\s*=\s*(\{[\s\S]*?\});\s*<\/script>/.exec(html);
  if (embed) {
    try {
      const data = JSON.parse(embed[1]) as { main?: string; blur?: string; ratio?: number; state?: Record<string, unknown> };
      const paper = /const LETTER_BG\s*=\s*"(data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+)"/.exec(html)?.[1] ?? null;
      // fields the file left at the template's defaults are not in EMBED.state (the hook, often)
      const defaults: Record<string, unknown> = {};
      const block = /const DEFAULT\s*=\s*\{([\s\S]*?)\n\};/.exec(html)?.[1] ?? "";
      for (const key of ["hook", "c1sub", "capOpen", "capGuide", "capTags", "lineUrl", "theme"]) {
        const found = new RegExp(`(?:^|[\\s,{])${key}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`).exec(block);
        if (found) try { defaults[key] = JSON.parse(`"${found[1]}"`); } catch { /* left out */ }
      }
      return { kind: "first-sight" as const, embed: data, paper, state: { ...defaults, ...(data.state ?? {}) } };
    } catch {
      return null;
    }
  }
  const prefix = /DL_CONFIG\s*=\s*\{[^}]*prefix\s*:\s*['"](\d{10})['"]/.exec(html)?.[1] ?? null;
  const color = /let COLOR\s*=\s*['"]([a-z]+)['"]/.exec(html)?.[1] ?? null;
  const caption = /<textarea[^>]*id=["']i_caption["'][^>]*>([\s\S]*?)<\/textarea>/.exec(html)?.[1] ?? null;
  if (!prefix && !caption) return null;
  return { kind: "abc" as const, code: prefix, color: color ? TEMPLATE_COLORS[color] ?? null : null, caption: caption ? decodeEntities(caption) : null };
}

function decodeEntities(text: string) {
  return text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
}

const num = (value: unknown, min: number, max: number, fallback: number) => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const str = (value: unknown, limit: number) => (typeof value === "string" ? value.trim().slice(0, limit) : "");

/** The 第一眼 state from window.EMBED, checked and trimmed to what the site shows. */
export function firstSightFromState(state: Record<string, unknown>, ratio: unknown) {
  const objects = Array.isArray(state.objs) ? state.objs.slice(0, 4).map((raw) => {
    const o = (raw ?? {}) as Record<string, unknown>;
    return { name: str(o.name, 20), x: num(o.x, 0, 100, 50), y: num(o.y, 0, 100, 50), s: num(o.s, 5, 60, 20), hint: str(o.hint, 60), text: str(o.text, 1200), line: str(o.line, 80) };
  }) : [];
  const theme = typeof state.theme === "string" && state.theme in FIRST_SIGHT_THEMES ? state.theme as FirstSightTheme : "light";
  const title = str(state.c1title, 60).replace(/｜/g, "").replace(/\n+/g, " ");
  const caption = [str(state.capOpen, 300), str(state.capGuide, 300), str(state.capTags, 300)].filter(Boolean).join("\n\n");
  return {
    ok: objects.length === 4 && objects.every((o) => o.name && o.text) && Boolean(title),
    title,
    theme,
    date: str(state.date, 5),
    serial: num(state.serial, 1, 99, 1),
    subtitle: str(state.c1sub, 80),
    objects,
    hook: str(state.hook, 400),
    caption,
    lineUrl: /^https:\/\/(lin\.ee|line\.me)\//.test(str(state.lineUrl, 200)) ? str(state.lineUrl, 200) : ZOLA_LINE_URL,
    ratio: num(ratio, 0.8, 2, 1.25),
  };
}

/* ---------- after reading: the message she sends Zola ---------- */

// Zola 2026-11-22: 「傳給我的話應該是題目（完整題目）選到什麼（內容）」. So the message carries the whole title,
// what she picked and what it said, plus the code, so Zola can answer without looking the quiz up.
const HOOK_LINE = /想知道|困擾|年齡|(?:留言|私訊)告訴我|直接回覆我|最後想跟妳說/;
const MESSAGE_CONTENT_MAX = 180;

// Zola 2026-11-23: IG asks for a comment (「歡迎留言告訴我妳的困擾和年齡」), but the site has no comment box and its
// button is 「私訊 Zola」, so the page says 私訊. Only what the page shows changes: the stored text stays the IG copy,
// so every quiz pasted in from the generator reads right without editing. 「留言區」「留言我傳解析」 are left alone.
const COMMENT_ASK = /留言(?=告訴我|跟我說|給我)/g;

/** A reading or hook as the site shows it: the ask to leave a comment becomes an ask to message Zola. */
export function siteWording(text: string) {
  return text.replace(COMMENT_ASK, "私訊");
}

/** The reading she got, as one short block: without the closing hook that speaks to her (想知道…留言告訴我妳的
 *  困擾和年齡), and cut at a sentence end if it is long. Counts characters, so an emoji is never split. */
export function messageContent(text: string, max = MESSAGE_CONTENT_MAX) {
  const paragraphs = text.replace(/\r\n?/g, "\n").split(/\n+/).map((line) => line.trim()).filter(Boolean);
  // Drop hook sentences from the end, and a last paragraph that was nothing but the hook.
  while (paragraphs.length) {
    const sentences = paragraphs[paragraphs.length - 1].match(/[^。！？!?]+[。！？!?]*/g) ?? [];
    while (sentences.length && HOOK_LINE.test(sentences[sentences.length - 1])) sentences.pop();
    if (sentences.length) { paragraphs[paragraphs.length - 1] = sentences.join("").trim(); break; }
    if (paragraphs.length === 1) break; // all of it reads like a hook: keep it rather than send nothing
    paragraphs.pop();
  }
  const chars = Array.from(paragraphs.join("\n"));
  if (chars.length <= max) return chars.join("");
  const cut = chars.slice(0, max).join("");
  const end = Math.max(...["。", "！", "？"].map((mark) => cut.lastIndexOf(mark)));
  return `${end > cut.length / 2 ? cut.slice(0, end + 1) : cut}…`;
}

/** The title as she saw it: a first-sight quiz adds its subtitle (「妳第一眼看到什麼？那就是妳 12 月最需要的訊息」). */
export function fullQuizTitle(quiz: Quiz) {
  const sub = quiz.kind === "first-sight" ? quiz.data.subtitle.trim() : "";
  if (!sub) return quiz.title;
  return /[。！？!?]$/.test(quiz.title) ? `${quiz.title}${sub}` : `${quiz.title}，${sub}`;
}

export function quizMessage(quiz: Quiz, picked: string) {
  let line: string;
  if (quiz.kind === "abc") {
    const content = messageContent(quiz.data.analysis[picked as Choice] ?? "");
    line = `我選到：${picked}${content ? `｜${content}` : ""}`;
  } else {
    const object = quiz.data.objects.find((item) => item.name === picked);
    const hint = object?.hint.trim() ?? "", said = object?.line.trim() ?? "";
    const content = hint && said ? `${hint}${/[。！？!?]$/.test(hint) ? "" : "。"}${said}` : hint || said;
    line = `我第一眼看到：${picked}${content ? `｜${content}` : ""}`;
  }
  return `我剛剛在網站完成心理測驗 ${quiz.code}\n題目：${fullQuizTitle(quiz)}\n${line}\n想進一步聊聊我的狀況。`;
}

export type QuizLineLink = { href: string; prefilled: boolean; open: string };

/** Any link to Zola's own account opens her chat with the message typed in (the visitor still presses send).
 *  Any other LINE link is kept exactly as given and the page says the message has to be copied in by hand. */
export function quizLineLink(lineUrl: string, message: string): QuizLineLink {
  if (isZolaLine(lineUrl)) return { href: `https://line.me/R/oaMessage/${ZOLA_LINE_ID}/?${encodeURIComponent(message)}`, prefilled: true, open: ZOLA_LINE_URL };
  return { href: lineUrl, prefilled: false, open: lineUrl };
}

export function quizCover(quiz: Quiz) {
  return quiz.kind === "abc" ? quiz.data.cards[0] ?? "" : quiz.data.painting;
}

export function quizSummary(quiz: Quiz): QuizSummary {
  return { code: quiz.code, kind: quiz.kind, title: quiz.title, tone: quiz.tone, publishAt: quiz.publishAt, cover: quizCover(quiz) };
}

/** The stripe colour a quiz shows in the wall: its rainbow colour, or its paper's accent. */
export function toneColor(kind: Quiz["kind"], tone: string) {
  if (kind === "abc") return QUIZ_COLORS[tone as QuizColor]?.ink ?? QUIZ_COLORS.red.ink;
  return FIRST_SIGHT_THEMES[tone as FirstSightTheme]?.accent ?? FIRST_SIGHT_THEMES.light.accent;
}

/** A first-sight object's round close-up as background-size／position percentages, so the circle can be
 *  any size (the same picture as the generator's circle(): the object's centre in the middle, s% of the
 *  painting's width across). */
export function lens(object: Pick<FirstSightObject, "x" | "y" | "s">, ratio: number) {
  const s = Math.min(90, Math.max(5, object.s));
  const width = 10000 / s;                      // painting width, in % of the circle
  const height = width * ratio;
  const px = (100 * (0.5 - object.x / s)) / (1 - 100 / s);
  const py = (100 * (0.5 - (object.y * ratio) / s)) / (1 - (100 * ratio) / s);
  return { backgroundSize: `${round(width)}% ${round(height)}%`, backgroundPosition: `${round(px)}% ${round(py)}%` };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

/* ---------- checking what the admin page sends ---------- */

const URL_RE = /^https:\/\/[^\s"'<>]+$/;
const imageUrl = (value: unknown) => (typeof value === "string" && URL_RE.test(value) ? value : null);

export function parseQuizInput(body: unknown): { ok: true; quiz: Quiz } | { ok: false; error: string } {
  const input = (body ?? {}) as Record<string, unknown>;
  const code = str(input.code, 12);
  if (!isQuizCode(code)) return { ok: false, error: "代碼要是 10 碼數字（三選一）或 F 開頭加 10 碼（第一眼）。" };
  const title = str(input.title, 80);
  if (!title) return { ok: false, error: "請填標題。" };
  const publishAt = typeof input.publishAt === "string" && Number.isFinite(Date.parse(input.publishAt)) ? new Date(input.publishAt).toISOString() : null;
  if (!publishAt) return { ok: false, error: "請設定公開時間。" };
  const status = input.status === "scheduled" ? "scheduled" : "draft";
  const data = (input.data ?? {}) as Record<string, unknown>;
  if (input.kind === "abc") {
    if (code.startsWith("F")) return { ok: false, error: "三選一的代碼不用 F。" };
    const tone = typeof input.tone === "string" && input.tone in QUIZ_COLORS ? input.tone as QuizColor : null;
    if (!tone) return { ok: false, error: "請選這組的彩虹色。" };
    const cards = Array.isArray(data.cards) ? data.cards.map(imageUrl) : [];
    if (cards.length !== 5 || cards.some((url) => !url)) return { ok: false, error: "需要五張卡片圖。" };
    const choices = CHOICES.map((_, i) => (Array.isArray(data.choices) ? imageUrl(data.choices[i]) : null));
    const raw = (data.analysis ?? {}) as Record<string, unknown>;
    const analysis = { A: str(raw.A, 1500), B: str(raw.B, 1500), C: str(raw.C, 1500) };
    if (status === "scheduled" && CHOICES.some((c) => !analysis[c])) return { ok: false, error: "A、B、C 三段解析都要有內容才能排程公開。" };
    return { ok: true, quiz: { kind: "abc", code, title, tone, publishAt, status, data: {
      cards: cards as string[], choices, analysis, hook: str(data.hook, 400), caption: str(data.caption, 2000),
      lineUrl: imageUrl(data.lineUrl) && /^https:\/\/(lin\.ee|line\.me)\//.test(String(data.lineUrl)) ? String(data.lineUrl) : ZOLA_LINE_URL,
    } } };
  }
  if (input.kind === "first-sight") {
    if (!code.startsWith("F")) return { ok: false, error: "第一眼測驗的代碼以 F 開頭。" };
    const tone = typeof input.tone === "string" && input.tone in FIRST_SIGHT_THEMES ? input.tone as FirstSightTheme : "light";
    const painting = imageUrl(data.painting);
    if (!painting) return { ok: false, error: "需要主畫。" };
    const checked = firstSightFromState({ ...data, objs: data.objects, c1title: title, c1sub: data.subtitle, theme: tone }, data.ratio);
    if (!checked.ok) return { ok: false, error: "四樣東西都要有名稱和解析。" };
    return { ok: true, quiz: { kind: "first-sight", code, title, tone, publishAt, status, data: {
      painting, blur: imageUrl(data.blur), paper: imageUrl(data.paper), ratio: checked.ratio, subtitle: checked.subtitle,
      objects: checked.objects, hook: str(data.hook, 400), caption: str(data.caption, 2000),
      lineUrl: typeof data.lineUrl === "string" && /^https:\/\/(lin\.ee|line\.me)\//.test(data.lineUrl) ? data.lineUrl.slice(0, 200) : ZOLA_LINE_URL,
    } } };
  }
  return { ok: false, error: "不認得這種測驗。" };
}
