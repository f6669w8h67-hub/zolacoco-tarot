// 學員練習室 question bank. Server-only data: the /practice page never imports this file, it gets
// published questions (without answers) from /api/practice, so drafts never reach a student's browser.
//
// Rules (ChatGPT spec review, step 8):
// - A question is shown to students only when status is "published"; Zola confirms each one first.
//   Admin (Zola) sees drafts too, marked 草稿, to preview them.
// - A question id is never reused. When a question's meaning changes, bump `version`; saved answers
//   keep the version they answered, so an old answer never looks like an answer to the new question.
// - Every scene detail comes from the card's `scene` in tarot-data.ts (the site's 萊恩 and 蝦蝦 deck),
//   so a question never mentions something that is not in the picture.
// - `sample` is Zola's own demonstration reading. Until she writes it, it stays null and the page says
//   「Zola 示範解讀準備中」; the site's card meaning is shown separately as 網站牌義參考.

export type PracticeLevel = "基礎" | "進階";
export type PracticeStatus = "draft" | "published";

export type PracticeUnit = {
  id: string;
  level: PracticeLevel;
  title: string;
  focus: string;
};

export type PracticeOption = { id: "a" | "b" | "c"; text: string; correct: boolean; note: string };

export type PracticeQuestion = {
  id: string;
  version: number;
  status: PracticeStatus;
  unit: string;
  cardId: string;
  reversed?: boolean;
  /** A client question (實戰). */
  scenario?: string;
  observe: string;
  read: string;
  choose: string;
  options: PracticeOption[];
  sample: string | null;
};

export const PRACTICE_UNITS: PracticeUnit[] = [
  { id: "major", level: "基礎", title: "大阿爾克納", focus: "從畫面讀出大牌的核心課題" },
  { id: "minor", level: "基礎", title: "小阿爾克納", focus: "元素、數字階段與畫面動作" },
  { id: "court", level: "基礎", title: "宮廷牌", focus: "人物的成熟度、個性與行動方式" },
  { id: "practice", level: "基礎", title: "實戰練習", focus: "一個問題、一張牌，說出對方聽得懂的解讀" },
  { id: "gateway", level: "進階", title: "門戶牌", focus: "準備中" },
  { id: "body", level: "進階", title: "塔羅中的肢體語言", focus: "姿勢、視線、手勢與人物距離" },
  { id: "spread", level: "進階", title: "牌陣", focus: "準備中" },
  { id: "reversed", level: "進階", title: "逆位深度解讀", focus: "逆位不是壞，是能量卡住或用錯方向" },
];

export const PRACTICE_QUESTIONS: PracticeQuestion[] = [
  {
    id: "major-09-a", version: 1, status: "draft", unit: "major", cardId: "major-09",
    observe: "先不要想牌義。寫下妳在畫面上看到的三件事：牠在哪裡、在做什麼、手上有什麼。",
    read: "用一兩句話寫：如果這張牌是對問事者說話，它會說什麼？",
    choose: "哪一個解讀最有畫面依據？",
    options: [
      { id: "a", text: "牠站在雪山頂、提著燈照向前方，代表此刻需要先退一步，安靜地看清自己真正的答案。", correct: true, note: "有依據：高處、提燈、往前照，三個畫面線索都指向「拉開距離，靠自己的光看清楚」。" },
      { id: "b", text: "牠披著灰色斗篷，代表心情很憂鬱，這件事一定不會有好結果。", correct: false, note: "陷阱：只抓一個顏色就下負面結論，忽略了提燈照路這個主動的動作。" },
      { id: "c", text: "牠拄著手杖，代表身體需要休息，可能有健康問題。", correct: false, note: "陷阱：把符號直接當成健康判斷；塔羅不做醫療結論。" },
    ],
    sample: null,
  },
  {
    id: "minor-wands-03-a", version: 1, status: "draft", unit: "minor", cardId: "wands-03",
    observe: "先問自己：這張牌屬於哪個元素？數字三在旅程裡是什麼階段？再寫下畫面上看到的兩件事。",
    read: "用一兩句話寫妳的解讀。",
    choose: "哪一個解讀同時用到了元素、數字和畫面？",
    options: [
      { id: "a", text: "牠背對畫面、望向海上的帆船，代表努力已經送出去，現在是等待回響、看向更遠的階段。", correct: true, note: "有依據：火元素的行動力、數字三的第一個成果，加上「望向遠方的船」這個畫面。" },
      { id: "b", text: "牠背對畫面，代表對方在迴避妳。", correct: false, note: "陷阱：把「背對」直接套成拒絕，沒有看牠面向的是什麼。" },
      { id: "c", text: "三根權杖代表三個人，有第三者。", correct: false, note: "陷阱：用數量硬套人物，忽略數字三的階段意義。" },
    ],
    sample: null,
  },
  {
    id: "court-cups-12-a", version: 1, status: "draft", unit: "court", cardId: "cups-12",
    observe: "先問自己：騎士在宮廷裡是哪一種成熟度？聖杯給牠什麼個性？再寫下牠的動作。",
    read: "用一兩句話寫：這個人物會用什麼方式行動？",
    choose: "哪一個解讀讀的是人物的能量與行為？",
    options: [
      { id: "a", text: "緩緩騎馬、雙爪捧著金杯，是帶著心意靠近的人，但還要觀察浪漫能不能落實。", correct: true, note: "有依據：騎士是行動中的力量，聖杯給它溫柔與感受；「慢慢前行、捧杯」說明了它靠近的方式。" },
      { id: "b", text: "騎士一定是男生。", correct: false, note: "陷阱：宮廷牌讀的是能量與行為，不是性別。" },
      { id: "c", text: "牠捧著杯子，代表一定會求婚。", correct: false, note: "陷阱：把一個動作放大成結果保證。" },
    ],
    sample: null,
  },
  {
    id: "practice-swords-05-a", version: 1, status: "draft", unit: "practice", cardId: "swords-05",
    scenario: "「我和朋友吵架後一直沒聯絡，我該先開口嗎？」",
    observe: "先寫下畫面裡每個角色在做什麼、朝向哪裡。",
    read: "寫一段對問事者說的解讀（3～5 句），要有畫面依據，也要有一個可以做的小行動。",
    choose: "哪一個解讀回答了問事者的問題？",
    options: [
      { id: "a", text: "萊恩抱著寶劍回頭看，蝦蝦和小貓背對牠走開；就算妳覺得自己沒錯，這場輸贏也讓關係付出了代價。先問自己想要「贏」還是想要「和好」，再決定怎麼開口。", correct: true, note: "有依據：用「抱著劍回頭看、對方走開」說明代價，最後回到「該不該開口」，給了一個可以做的小行動。" },
      { id: "b", text: "寶劍五是不好的牌，這段友情已經結束了。", correct: false, note: "陷阱：用一張牌替客人宣判結果，沒有回答「該不該開口」。" },
      { id: "c", text: "走開的是對方，所以是對方的錯。", correct: false, note: "陷阱：用位置判誰對誰錯，會讓客人更抓緊立場。" },
    ],
    sample: null,
  },
  {
    id: "body-pentacles-04-a", version: 1, status: "draft", unit: "body", cardId: "pentacles-04",
    observe: "看牠的身體：手、頭、腳各自在做什麼？",
    read: "用一兩句話寫：這個姿勢在說什麼？",
    choose: "哪一個解讀讀到了身體的語言？",
    options: [
      { id: "a", text: "緊抱一枚、頭頂一枚、腳踩兩枚，全身都在「守住」金幣，姿勢是收緊的；重點不是有沒有錢，而是用控制換安全感。", correct: true, note: "有依據：手、頭、腳三個位置都在守，姿勢本身就是答案。" },
      { id: "b", text: "牠戴著小金冠，代表很有錢、財運很好。", correct: false, note: "陷阱：只看配件，沒有讀身體的語言。" },
      { id: "c", text: "蝦蝦在旁邊看著，代表有人想搶牠的錢。", correct: false, note: "陷阱：把旁觀者的表情編成故事；畫面裡蝦蝦是好奇、俏皮，不是搶奪。" },
    ],
    sample: null,
  },
  {
    id: "reversed-pentacles-04-a", version: 1, status: "draft", unit: "reversed", cardId: "pentacles-04", reversed: true,
    scenario: "「我最近一直存不了錢，明明很省了。」",
    observe: "把牌轉過來看：逆位時，「守住」這個姿勢變成什麼樣子？",
    read: "用一兩句話寫：逆位的錢幣四，是能量卡住了，還是用錯了方向？",
    choose: "哪一個解讀最符合「逆位不是壞，是能量卡住或用錯方向」？",
    options: [
      { id: "a", text: "守住的力量用錯了方向：越想省、越緊張，反而把力氣花在擔心上，看不見錢真正流去哪裡。先記一週的花費，再決定哪裡要守。", correct: true, note: "有依據：逆位讀成「守的能量用錯方向」，回到問題，也給了可以做的事。" },
      { id: "b", text: "逆位就是正位的相反，所以妳會變得很會花錢。", correct: false, note: "陷阱：逆位不是把正位反過來。" },
      { id: "c", text: "逆位是壞牌，代表妳的財運很差。", correct: false, note: "陷阱：逆位不是壞，也不替客人下財運的結論。" },
    ],
    sample: null,
  },
];

const questionById = new Map(PRACTICE_QUESTIONS.map((question) => [question.id, question]));

/** A question this person may see: students only published ones, admin everything. */
export function visibleQuestion(id: string, admin: boolean): PracticeQuestion | null {
  const question = questionById.get(id);
  if (!question) return null;
  return admin || question.status === "published" ? question : null;
}

/** What the page receives: the question without which option is right or why. */
export function publicQuestion(question: PracticeQuestion) {
  return {
    id: question.id,
    version: question.version,
    unit: question.unit,
    cardId: question.cardId,
    reversed: question.reversed === true,
    scenario: question.scenario ?? null,
    observe: question.observe,
    read: question.read,
    choose: question.choose,
    options: question.options.map(({ id, text }) => ({ id, text })),
    draft: question.status !== "published",
  };
}

export function practiceCatalog(admin: boolean) {
  return PRACTICE_UNITS.map((unit) => ({
    ...unit,
    questions: PRACTICE_QUESTIONS.filter((question) => question.unit === unit.id && (admin || question.status === "published")).map(publicQuestion),
  }));
}

/** The server decides whether a choice is right; the page only shows what this returns. */
export function judgeChoice(question: PracticeQuestion, choice: string) {
  const option = question.options.find((item) => item.id === choice);
  if (!option) return null;
  const right = question.options.find((item) => item.correct);
  return { correct: option.correct, note: option.note, rightNote: right?.note ?? "", sample: question.sample };
}
