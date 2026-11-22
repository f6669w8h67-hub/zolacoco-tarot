// 七日塔羅筆記: every round draws its own seven different cards (Zola 2026-11-22: 「七日塔羅日記記得要換牌
// 不要都一樣」). A round keeps its seven for all seven days: a synced round's cards come from the round's id,
// a device's from a seed kept on that device. Rounds begun before this change keep the original seven, so
// what was already written still sits beside the card it was written with.
import { JOURNAL_DAYS, journalCardIds } from "./journal-prompts";

export const JOURNAL_DECK_KEY = "zolacoco-journal-deck-v1";
/** The seed of the original seven cards (聖杯皇后, 寶劍八, 力量, 聖杯六, 錢幣四, 星星, 世界). */
export const ORIGINAL_DECK = "original";
/** Synced rounds begun from this moment on draw their own cards. */
export const DRAWN_CARDS_FROM = Date.parse("2026-11-22T14:00:00+08:00");

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
  return Number.isFinite(started) && started < DRAWN_CARDS_FROM ? ORIGINAL_DECK : `round:${round.id}`;
}

/** A fresh seed for a new round kept on this device. */
export function newDeviceDeckSeed() {
  return `device:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
}

/** The day's first reply speaks about the original card by name, so it only fits when that card was drawn. */
export function isOriginalCard(day: number, cardId: string | undefined) {
  return journalCardIds[day - 1] === cardId;
}
