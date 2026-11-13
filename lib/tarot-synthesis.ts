/**
 * Reading v4 (ChatGPT spec, 2026-11-13): every card has a written reading per topic, in three
 * sentences that each stand on their own — situation, the lesson, the next step — plus an
 * "energy" note, and two lines for when the card speaks for someone or something else: "other"
 * (what can be seen of the other person) and "outward" (outside conditions). Neither says what
 * anyone feels.
 * The three-card message is built from whole sentences picked by position, never cut by length.
 */
export const READING_TOPICS = ["感情", "工作", "人際", "金錢", "創業", "今日指引"] as const;
export type ReadingTopic = (typeof READING_TOPICS)[number];

export type CardReading = {
  id: string;
  energy: string;
  /** the second card of the relationship spread when it stands for the other person or the people involved */
  other: string;
  /** the second card of the relationship spread when it stands for outside conditions, the market or the day */
  outward: string;
  topicReadings: Record<ReadingTopic, [string, string, string]>;
};

export type SynthesisPart = { label: string; card: string; text: string };

const OPENING: Record<string, string> = {
  感情: "在這段感情裡",
  工作: "在工作上",
  人際: "在人際互動裡",
  金錢: "在金錢與資源上",
  創業: "在創業這條路上",
  今日指引: "今天",
};

function topicOf(topic: string): ReadingTopic {
  return (READING_TOPICS as readonly string[]).includes(topic) ? (topic as ReadingTopic) : "今日指引";
}

/** The full reading for one card in one topic: the three sentences read as one paragraph. */
export function topicReading(reading: CardReading, topic: string) {
  return reading.topicReadings[topicOf(topic)].join("");
}

/** One line that opens the three-card message, so it reads as one reading, not three notes. */
export function synthesisOpening(topic: string, spreadId: string) {
  const opening = OPENING[topic] ?? "此刻";
  return spreadId === "relationship"
    ? `${opening}，三張牌分別照見妳、身邊的人事，以及兩者之間的課題。`
    : `${opening}，三張牌串起來，是一段從過去走到下一步的故事。`;
}

/**
 * The three-card message, one short paragraph per position.
 * - Time flow: the first card's situation, the second card's lesson, the third card's next step.
 * - Relationship: her own state, then what can be seen of the other person or of the outside
 *   conditions (never what anyone feels), then the lesson and the next step of the third card.
 */
export function synthesisParts(
  cards: Array<{ name: string; reading: CardReading }>,
  spreadId: string,
  topic: string,
  positions: string[],
): SynthesisPart[] {
  if (cards.length < 3) return [];
  const t = topicOf(topic);
  const [first, second, third] = cards;
  if (spreadId === "relationship") {
    return [
      { label: positions[0], card: first.name, text: first.reading.topicReadings[t][0] },
      { label: positions[1], card: second.name, text: othersLine(second.reading, t) },
      { label: positions[2], card: third.name, text: third.reading.topicReadings[t][1] + third.reading.topicReadings[t][2] },
    ];
  }
  return [
    { label: positions[0], card: first.name, text: first.reading.topicReadings[t][0] },
    { label: positions[1], card: second.name, text: second.reading.topicReadings[t][1] },
    { label: positions[2], card: third.name, text: third.reading.topicReadings[t][2] },
  ];
}

/** In the relationship spread the second card stands for someone or something else. */
export function speaksForOthers(spreadId: string, index: number) {
  return spreadId === "relationship" && index === 1;
}

/** 感情・人際・工作 name a person there (對方／相關人物); money, business and the day name conditions. */
const PERSON_TOPICS = new Set(["感情", "人際", "工作"]);
export function othersLine(reading: CardReading, topic: string) {
  return PERSON_TOPICS.has(topic) ? reading.other : reading.outward;
}
