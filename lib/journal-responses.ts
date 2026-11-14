// 七日塔羅筆記: the response a writer sees the moment she saves a day (Zola 2026-11-14: 「寫完當天馬上
// 有回應」, so people want to keep writing). It is the site's response, never shown as Zola's: her own
// replies stay in 陪跑 (lib/coaching-*). Nothing here leaves the device; it only reads the saved note.
// Each day: two replies tied to that day's question and card (picked by the note, so the same note
// always gets the same one), one small practice, and the next day still unwritten.
import { JOURNAL_DAYS, JOURNAL_PROMPT_VERSION, journalPromptFor } from "./journal-prompts";

export type DayResponse = { replies: readonly [string, string]; practice: string };

export const JOURNAL_RESPONSES: readonly DayResponse[] = [
  { // 1 我現在真正的情緒是什麼？（聖杯皇后）
    replies: [
      "能把情緒寫下來，就已經不是被它推著走了。就像聖杯皇后安靜地凝視手中的杯子，妳今天也停下來，看了看自己的心。情緒沒有對錯，它是在告訴妳，什麼對妳很重要。",
      "謝謝妳願意誠實地看自己。很多時候我們只記得「應該」怎麼感覺，忘了問自己「其實」怎麼感覺。今天妳問了，這就是溫柔對待自己的開始。",
    ],
    practice: "今晚睡前，用一個詞替今天的情緒取名字，不用解釋原因。",
  },
  { // 2 我正在逃避或延後面對什麼？（寶劍八）
    replies: [
      "願意承認自己在逃避，需要很大的勇氣。寶劍八的絲帶其實綁得很鬆，困住我們的，常常是「還沒準備好」的想像，而不是真的沒有路。",
      "延後，有時候是在保護自己，不一定是軟弱。妳今天把它寫出來，就已經從看不見，走到看得見了。",
    ],
    practice: "把那件事拆成一個五分鐘就能做完的小步驟，今天只做那一步就好。",
  },
  { // 3 我內在最需要哪一種支持？（力量）
    replies: [
      "知道自己需要什麼，是一種很溫柔的力量。就像力量牌裡輕輕撫摸獅子的手，支持不需要很用力，有時是一句「我懂」，或一段安靜的時間。",
      "說出需要，不代表妳不夠堅強。妳今天替自己找到了方向，接下來可以練習把這份需要，慢慢說給值得的人聽。",
    ],
    practice: "想一個今天就能給自己的小支持，例如一杯熱茶、十分鐘散步，然後真的去做。",
  },
  { // 4 我在人際關係中反覆出現什麼習慣？（聖杯六）
    replies: [
      "看見重複的習慣，不是為了責怪自己。聖杯六帶著過去的溫度，我們在關係裡的模式，很多也是很早以前學會保護自己的方式。",
      "妳願意回頭看自己的模式，就多了選擇的空間：哪些想保留，哪些可以慢慢鬆開，都由妳決定。",
    ],
    practice: "下一次那個習慣出現時，先停三秒，在心裡說一句：「我注意到了。」",
  },
  { // 5 金錢與安全感對我代表什麼？（錢幣四）
    replies: [
      "金錢連著安全感，也連著我們成長的經驗。錢幣四緊緊抱住金幣，那份用力的背後，常常是「我想好好照顧自己」的心意。",
      "今天妳替安全感寫下了自己的定義。它不只是數字，也可以是穩定的作息、信任的人，和對自己的承諾。",
    ],
    practice: "寫下一件讓妳覺得「這樣就夠了」的小事，提醒自己：安全感也可以從這裡開始。",
  },
  { // 6 如果不必迎合任何人，我想成為怎樣的人？（星星）
    replies: [
      "這個問題沒有標準答案。星星在破曉時安靜地倒水，照顧的是自己的節奏。妳今天寫下的樣子，像一顆正在發亮的種子。",
      "當我們不再急著符合期待，真正想要的樣子才會慢慢浮現。謝謝妳把它寫下來，給它一點空間長大。",
    ],
    practice: "選一個今天就能做的小行動，讓自己更靠近那個樣子一點點。",
  },
  { // 7 這一週，我最想帶走的核心提醒是什麼？（世界）
    replies: [
      "走到這裡，妳替自己留下了一段很珍貴的對話。世界牌在花環中央輕盈起舞，一段旅程完成了它的功課，也準備好走向下一段。",
      "謝謝妳陪自己走過這些天。不需要每一天都寫得很完整，願意回來，就是最重要的事。",
    ],
    practice: "把妳寫下的核心提醒存成手機桌布或便條，讓它陪妳下一週。",
  },
];

const ECHO_LIMIT = 28;

/** Her own first sentence, shown back to her (on her screen only). */
export function echoOf(note: string) {
  const clean = note.replace(/\s+/g, " ").trim();
  const first = clean.split(/(?<=[。！？!?])|\n/)[0]?.trim() ?? "";
  const sentence = first.replace(/[。！？!?]+$/, "");
  return sentence.length > ECHO_LIMIT ? `${sentence.slice(0, ECHO_LIMIT)}…` : sentence;
}

function pick(note: string) {
  let sum = 0;
  for (const char of note) sum = (sum + char.codePointAt(0)!) % 9973;
  return sum % 2;
}

/**
 * day is 1–7. written[i] says whether day i+1 has a saved note (this one included).
 * next is the first unwritten day after this one (wrapping round), or null when all seven are written.
 */
export function journalResponse(day: number, note: string, written: readonly boolean[], version = JOURNAL_PROMPT_VERSION) {
  const response = JOURNAL_RESPONSES[day - 1];
  if (!response || !note.trim()) return null;
  let next: { day: number; prompt: string } | null = null;
  for (let step = 1; step < JOURNAL_DAYS; step++) {
    const candidate = ((day - 1 + step) % JOURNAL_DAYS) + 1;
    if (!written[candidate - 1]) { next = { day: candidate, prompt: journalPromptFor(version, candidate) }; break; }
  }
  return { echo: echoOf(note), reply: response.replies[pick(note.trim())], practice: response.practice, next };
}
