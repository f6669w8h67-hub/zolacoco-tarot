// 學員練習室: what a question said in an earlier version, kept so that an answer written then
// is shown with the option it actually chose (option ids move when a question is rewritten).
// Before bumping a question's version, copy its current scenario and option texts here.
// Only texts: whether the old choice was right is already stored with the answer.

export type PracticeSnapshot = { scenario: string | null; options: { id: "a" | "b" | "c"; text: string }[] };

export const PRACTICE_HISTORY: Record<string, Record<number, PracticeSnapshot>> = {
  "major-09-a": {
    1: {
      scenario: null,
      options: [
        { id: "a", text: "牠站在雪山頂、提著燈照向前方，代表此刻需要先退一步，安靜地看清自己真正的答案。" },
        { id: "b", text: "牠披著灰色斗篷，代表心情很憂鬱，這件事一定不會有好結果。" },
        { id: "c", text: "牠拄著手杖，代表身體需要休息，可能有健康問題。" },
      ],
    },
  },
  "minor-wands-03-a": {
    1: {
      scenario: null,
      options: [
        { id: "a", text: "牠背對畫面、望向海上的帆船，代表努力已經送出去，現在是等待回響、看向更遠的階段。" },
        { id: "b", text: "牠背對畫面，代表對方在迴避妳。" },
        { id: "c", text: "三根權杖代表三個人，有第三者。" },
      ],
    },
  },
  "court-cups-12-a": {
    1: {
      scenario: null,
      options: [
        { id: "a", text: "緩緩騎馬、雙爪捧著金杯，是帶著心意靠近的人，但還要觀察浪漫能不能落實。" },
        { id: "b", text: "騎士一定是男生。" },
        { id: "c", text: "牠捧著杯子，代表一定會求婚。" },
      ],
    },
  },
  "practice-swords-05-a": {
    1: {
      scenario: "「我和朋友吵架後一直沒聯絡，我該先開口嗎？」",
      options: [
        { id: "a", text: "萊恩抱著寶劍回頭看，蝦蝦和小貓背對牠走開；就算妳覺得自己沒錯，這場輸贏也讓關係付出了代價。先問自己想要「贏」還是想要「和好」，再決定怎麼開口。" },
        { id: "b", text: "寶劍五是不好的牌，這段友情已經結束了。" },
        { id: "c", text: "走開的是對方，所以是對方的錯。" },
      ],
    },
  },
  "body-pentacles-04-a": {
    1: {
      scenario: null,
      options: [
        { id: "a", text: "緊抱一枚、頭頂一枚、腳踩兩枚，全身都在「守住」金幣，姿勢是收緊的；重點不是有沒有錢，而是用控制換安全感。" },
        { id: "b", text: "牠戴著小金冠，代表很有錢、財運很好。" },
        { id: "c", text: "蝦蝦在旁邊看著，代表有人想搶牠的錢。" },
      ],
    },
  },
  "reversed-pentacles-04-a": {
    1: {
      scenario: "「我最近一直存不了錢，明明很省了。」",
      options: [
        { id: "a", text: "守住的力量用錯了方向：越想省、越緊張，反而把力氣花在擔心上，看不見錢真正流去哪裡。先記一週的花費，再決定哪裡要守。" },
        { id: "b", text: "逆位就是正位的相反，所以妳會變得很會花錢。" },
        { id: "c", text: "逆位是壞牌，代表妳的財運很差。" },
      ],
    },
  },
};
