// 探索妳的星盤 → LINE: the message put in the LINE input box (she still presses send herself).
// Birth data goes in only when she ticks 「附上我的出生資料」 (ChatGPT review B4); she sees the text first.
export function bookingMessage(birth: { date: string; time: string | null; place: string }, attach: boolean) {
  const lines = ["Zola 妳好 ✨", "我剛剛在 Zolacoco Tarot 看了自己的出生星盤，想了解個人星盤解析的內容與預約方式。", "目前最想深入了解的主題："];
  if (attach) {
    lines.push("", "我的出生資料：", `出生日期：${birth.date}`, `出生時間：${birth.time ?? "不確定"}`, `出生地點：${birth.place}`);
  }
  lines.push("", "謝謝妳。");
  return lines.join("\n");
}
