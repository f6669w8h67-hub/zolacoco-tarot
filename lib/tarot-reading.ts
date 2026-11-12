// Pure rules for the tarot draw (Issue #9): spreads per topic, the LINE consult
// message, saved records and the member banner date. No React, so node:test can
// cover them directly.

export const TAROT_TOPICS = ["感情", "工作", "人際", "金錢", "創業", "今日指引"] as const;
export type TarotTopic = (typeof TAROT_TOPICS)[number];

export type SpreadId = "healing" | "timeline" | "relationship";
export type Spread = { id: SpreadId; name: string; sub: string; positions: string[] };

export const SPREADS: Spread[] = [
  { id: "healing", name: "單張療癒牌", sub: "此刻的內在訊息", positions: ["此刻的療癒訊息"] },
  { id: "timeline", name: "三張時間流", sub: "過去・現在・下一步", positions: ["過去留下的影響", "現在需要看見的事", "接下來可以走的一步"] },
  { id: "relationship", name: "關係探索牌陣", sub: "我・對方・關係課題", positions: ["我的內在狀態", "對方目前的狀態", "這段關係的核心課題"] },
];

/** The relationship spread only makes sense when there is another person in the question. */
const RELATIONSHIP_TOPICS: readonly string[] = ["感情", "人際"];

const RECOMMENDED: Record<string, SpreadId> = {
  感情: "relationship",
  人際: "relationship",
  工作: "timeline",
  金錢: "timeline",
  創業: "timeline",
  今日指引: "healing",
};

export function spreadsForTopic(topic: string): Spread[] {
  return SPREADS.filter((spread) => spread.id !== "relationship" || RELATIONSHIP_TOPICS.includes(topic));
}

export function recommendedSpread(topic: string): SpreadId {
  return RECOMMENDED[topic] ?? "healing";
}

/** Keep the member's spread if it is still offered for the new topic; otherwise use the recommendation. */
export function spreadAfterTopicChange(topic: string, current: SpreadId, chosenByMember: boolean): SpreadId {
  const offered = spreadsForTopic(topic).some((spread) => spread.id === current);
  return chosenByMember && offered ? current : recommendedSpread(topic);
}

export const QUESTION_LIMIT = 200;

/** Trim and cap the optional question; never rewrite what the member typed. */
export function cleanQuestion(value: string) {
  return [...value.trim()].slice(0, QUESTION_LIMIT).join("");
}

export type DrawnCard = { id: string; name: string; position: string };

/** Message ChatGPT specified for booking a full reading. No member ID, phone or email. */
export function consultMessage({ topic, spreadName, question, cards }: {
  topic: string;
  spreadName: string;
  question: string;
  cards: DrawnCard[];
}) {
  return [
    "你好 Zola ✨",
    "",
    "我剛剛在 Zolacoco Tarot 完成了一次塔羅抽牌，想預約更完整的一對一解讀。",
    "",
    "這次的抽牌資訊",
    `主題：${topic}`,
    `牌陣：${spreadName}`,
    `我的問題：${cleanQuestion(question) || "尚未填寫"}`,
    "",
    "抽到的牌：",
    ...cards.map((card) => `${card.position}｜${card.name}`),
    "",
    "想請妳幫我進一步了解這些牌所呈現的方向，以及我接下來可以怎麼做。",
    "",
    "請問目前可以如何預約呢？",
  ].join("\n");
}

export type TarotRecordCard = DrawnCard & { keywords: string; truth: string; action: string };

export type TarotRecord = {
  id: string;
  question: string;
  topic: string;
  spread: string;
  cards: TarotRecordCard[];
  created_at: string;
};

export function newRecordId(now: number, random: () => number = Math.random) {
  return `tarot-${now.toString(36)}-${Math.floor(random() * 36 ** 6).toString(36).padStart(6, "0")}`;
}

export function tarotRecord(input: { question: string; topic: string; spread: string; cards: TarotRecordCard[] }, now: number, random?: () => number): TarotRecord {
  return {
    id: newRecordId(now, random),
    question: cleanQuestion(input.question),
    topic: input.topic,
    spread: input.spread,
    cards: input.cards,
    created_at: new Date(now).toISOString(),
  };
}

/** YYYY/MM/DD in Taipei, the same calendar day the member center shows. */
export function memberExpiryLabel(value: string | null | undefined) {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(time)
    .replaceAll("-", "/");
}
