// 七日塔羅筆記: every round draws its own seven different cards (Zola 2026-11-22: 「七日塔羅日記記得要換牌
// 不要都一樣」). A round keeps its seven for all seven days: a synced round's cards come from the round's id,
// a device's from a seed kept on that device. Rounds begun before this change keep the original seven, so
// what was already written still sits beside the card it was written with.
import { JOURNAL_DAYS, journalCardIds } from "./journal-prompts";

export const JOURNAL_DECK_KEY = "zolacoco-journal-deck-v1";
/** The seed of the original seven cards (聖杯皇后, 寶劍八, 力量, 聖杯六, 錢幣四, 星星, 世界). */
export const ORIGINAL_DECK = "original";
/** Synced rounds begun from this moment on draw their own cards. It must not be earlier than the deploy, or a
 *  round begun in between (shown the original seven) would switch cards under its notes. */
export const DRAWN_CARDS_FROM = Date.parse("2026-11-23T00:00:00+08:00");

function hash(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function sequence(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seven different card ids for one round. The same seed always gives the same seven, in the same order. */
export function drawJournalCards(seed: string, allIds: readonly string[]): string[] {
  if (seed === ORIGINAL_DECK || allIds.length < JOURNAL_DAYS) return [...journalCardIds];
  const next = sequence(hash(seed));
  const pool = [...allIds];
  const cards: string[] = [];
  while (cards.length < JOURNAL_DAYS) cards.push(pool.splice(Math.floor(next() * pool.length), 1)[0]);
  return cards;
}

/** The seed for a synced round. */
export function roundDeckSeed(round: { id: string; startedAt: string | null }) {
  const started = round.startedAt ? Date.parse(round.startedAt) : Number.NaN;
  // no readable start time: keep the original seven rather than risk moving cards under written notes
  return !Number.isFinite(started) || started < DRAWN_CARDS_FROM ? ORIGINAL_DECK : `round:${round.id}`;
}

/** A fresh seed for a new round kept on this device. */
export function newDeviceDeckSeed() {
  return `device:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
}

type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type DeviceRoundKeys = { notes: string; review: string; deck: string };

/**
 * Start a new round on this device: the seven notes and this device's 七日回顧 go, and the new seed is kept.
 * All or nothing: if any step fails (storage full, blocked, or the result does not read back), every key is put
 * back as it was and false is returned, so old notes never end up under new cards.
 */
export function restartDeviceRound(store: KeyValueStore, seed: string, keys: DeviceRoundKeys): boolean {
  const order = [keys.notes, keys.review, keys.deck];
  let before: (string | null)[];
  try { before = order.map((key) => store.getItem(key)); } catch { return false; }
  let review = before[1];
  try {
    const all = review ? JSON.parse(review) : null;
    if (all && typeof all === "object" && !Array.isArray(all) && "local" in all) { delete all.local; review = JSON.stringify(all); }
  } catch { /* an unreadable 回顧 store is left as it is: the page already reads it as empty */ }
  try {
    store.removeItem(keys.notes);
    if (review !== before[1] && review !== null) store.setItem(keys.review, review);
    store.setItem(keys.deck, seed);
    if (store.getItem(keys.notes) !== null || store.getItem(keys.deck) !== seed || store.getItem(keys.review) !== review) throw new Error("not kept");
    return true;
  } catch {
    order.forEach((key, index) => {
      try { if (before[index] === null) store.removeItem(key); else store.setItem(key, before[index] as string); } catch { /* best effort */ }
    });
    return false;
  }
}

/** The day's first reply speaks about the original card by name, so it only fits when that card was drawn. */
export function isOriginalCard(day: number, cardId: string | undefined) {
  return journalCardIds[day - 1] === cardId;
}
