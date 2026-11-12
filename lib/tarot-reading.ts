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


const RECOMMENDED: Record<string, SpreadId> = {
  感情: "relationship",
  人際: "relationship",
  工作: "timeline",
  金錢: "timeline",
  創業: "timeline",
  今日指引: "healing",
};

/** Every topic offers every spread (owner decision, Issue #12); the recommendation differs per topic. */
export function spreadsForTopic(topic: string): Spread[] {
  void topic;
  return SPREADS;
}

/**
 * The relationship spread is offered for every topic, so its positions are named per topic:
 * money or a business question has no "對方", and the reading must not imply one (spec v2, #12).
 */
const RELATIONSHIP_POSITIONS: Record<string, [string, string, string]> = {
  感情: ["我的狀態", "對方的狀態", "關係課題"],
  人際: ["我的狀態", "對方的狀態", "關係課題"],
  工作: ["我的立場", "相關人物或環境", "合作課題"],
  金錢: ["我的資源與選擇", "外部條件", "資源平衡課題"],
  創業: ["我的準備", "市場與合作因素", "發展課題"],
  今日指引: ["我的內在狀態", "外界的影響", "今天的核心課題"],
};

/** What a spread looks like for this topic: same id, topic-specific position names and subtitle. */
export function spreadForTopic(spreadId: SpreadId, topic: string): Spread {
  const base = SPREADS.find((spread) => spread.id === spreadId) ?? SPREADS[0];
  if (base.id !== "relationship") return base;
  const positions = RELATIONSHIP_POSITIONS[topic] ?? RELATIONSHIP_POSITIONS["今日指引"];
  return { ...base, positions: [...positions], sub: positions.join("・") };
}

/** Reading line for each position of the relationship spread, per topic. Never claims what someone else thinks. */
const RELATIONSHIP_LENS: Record<string, [string, string, string]> = {
  感情: ["這張牌映照出妳帶進關係裡的需要與反應。", "牌面呈現的是對方目前可觀察到的狀態，我們不替對方斷言還沒說出口的心意。", "這是雙方可以一起看見的關係課題，理解之後，才有機會走出原本的循環。"],
  人際: ["這張牌映照出妳在這段互動裡的需要與反應。", "牌面呈現的是對方目前可觀察到的狀態，我們不替對方斷言還沒說出口的想法。", "這是這段互動值得一起看見的課題，理解之後，相處才有機會調整。"],
  工作: ["這張牌映照出妳在這件事裡的立場與做法。", "這張牌呈現相關人物或環境目前可觀察到的狀態，不代表任何人的真實想法。", "這是合作中值得先看清的課題，理解之後，分工與溝通才容易對齊。"],
  金錢: ["這張牌映照出妳手上的資源與可以做的選擇。", "這張牌呈現目前的外部條件與限制。", "這是資源分配與平衡值得留意的課題。"],
  創業: ["這張牌映照出妳目前的準備程度。", "這張牌呈現市場與合作夥伴等外部因素目前的狀態。", "這是事業現階段最值得先處理的發展課題。"],
  今日指引: ["這張牌映照出妳今天的內在狀態。", "這張牌呈現今天外界帶來的影響。", "這是今天值得溫柔留意的核心課題。"],
};

export function relationshipLens(topic: string, index: number) {
  return (RELATIONSHIP_LENS[topic] ?? RELATIONSHIP_LENS["今日指引"])[index] ?? "";
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
  spread_id?: SpreadId;
  cards: TarotRecordCard[];
  created_at: string;
};

export function newRecordId(now: number, random: () => number = Math.random) {
  return `tarot-${now.toString(36)}-${Math.floor(random() * 36 ** 6).toString(36).padStart(6, "0")}`;
}

export function tarotRecord(input: { question: string; topic: string; spread: string; spreadId?: SpreadId; cards: TarotRecordCard[] }, now: number, random?: () => number): TarotRecord {
  return {
    id: newRecordId(now, random),
    question: cleanQuestion(input.question),
    topic: input.topic,
    spread: input.spread,
    ...(input.spreadId ? { spread_id: input.spreadId } : {}),
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
