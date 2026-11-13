// Pendulum question check (靈擺互動 v1 §5): only an empty question is blocked;
// everything else may be asked, with a gentle hint and an optional switch.
export type QualityTool = "yesno" | "custom" | string;
export type Quality = { canAsk: boolean; tone: "block" | "hint" | "good"; text: string; suggest: "choices" | "custom" | null };

export const QUALITY_TEXT = {
  empty: "先寫下一個想問的問題。",
  ready: "問題已準備好，可以開始。",
  options: "這題有幾個選項，妳也可以改用多選一模式。",
  open: "這題比較適合深入探索，也可以繼續，或改用自訂問題模式。",
  double: "這裡好像有兩個問題，一次問一件事會更清楚，也可以直接開始。",
} as const;

export function questionQuality(question: string, tool: QualityTool): Quality {
  const q = question.trim();
  if (q.replace(/[\s\p{P}\p{S}]/gu, "").length < 2) return { canAsk: false, tone: "block", text: QUALITY_TEXT.empty, suggest: null };
  if (tool === "custom") return { canAsk: true, tone: "good", text: QUALITY_TEXT.ready, suggest: null };
  if (/還是|或是|或者|二選一/.test(q)) return { canAsk: true, tone: "hint", text: QUALITY_TEXT.options, suggest: "choices" };
  if (/為什麼|為何|怎麼|怎樣|如何|何時|什麼|多久|哪裡|哪一|哪個|誰/.test(q)) return { canAsk: true, tone: "hint", text: QUALITY_TEXT.open, suggest: "custom" };
  if ((q.match(/[?？]/g)?.length ?? 0) > 1 || /嗎.*[，,；;].*嗎/.test(q)) return { canAsk: true, tone: "hint", text: QUALITY_TEXT.double, suggest: null };
  return { canAsk: true, tone: "good", text: QUALITY_TEXT.ready, suggest: null };
}

// "我該去台北還是台中" → ["A 我該去台北", "B 台中"], so switching to 多選一 keeps what she typed.
export function choicesFromQuestion(question: string): string[] {
  const parts = question.replace(/[?？。！!]+$/, "").split(/還是|或是|或者/).map((item) => item.trim()).filter(Boolean);
  return parts.length >= 2 ? parts.slice(0, 6).map((item, index) => `${String.fromCharCode(65 + index)} ${item}`) : [];
}
