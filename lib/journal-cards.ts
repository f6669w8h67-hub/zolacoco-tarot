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

/** This device's seven notes. The original round keeps the key it always had; every newer round has its own. */
export const JOURNAL_NOTES_KEY = "zolacoco-journal-notes-v1";
export function notesKeyFor(seed: string) {
  return seed === ORIGINAL_DECK ? JOURNAL_NOTES_KEY : `${JOURNAL_NOTES_KEY}:${seed}`;
}
/** Where this device's 七日回顧 is kept inside the 回顧 store, per round in the same way. */
export function reviewSlotFor(seed: string) {
  return seed === ORIGINAL_DECK ? "local" : `local:${seed}`;
}

/**
 * The round this device is on. Someone already part-way through (notes under the original key, no round kept yet)
 * stays on the original seven; anyone else starts with a fresh seed. If the seed cannot be kept, the original seven.
 */
export function deviceDeckSeed(store: KeyValueStore, makeSeed: () => string = newDeviceDeckSeed): string {
  try {
    const saved = store.getItem(JOURNAL_DECK_KEY);
    if (saved) return saved;
    let started = false;
    try {
      const notes = JSON.parse(store.getItem(JOURNAL_NOTES_KEY) ?? "{}");
      started = Boolean(notes) && typeof notes === "object" && Object.values(notes).some((text) => typeof text === "string" && text.trim() !== "");
    } catch { started = false; }
    const seed = started ? ORIGINAL_DECK : makeSeed();
    store.setItem(JOURNAL_DECK_KEY, seed);
    return seed;
  } catch {
    return ORIGINAL_DECK;
  }
}

/**
 * Start a new round on this device. Notes and 回顧 live under the round's own keys, so the switch is one write:
 * the round pointer. If it fails nothing has changed, on screen or after a reload. Only once the new round is
 * kept are the old round's notes and 回顧 tidied away; if that tidying fails, what is left is never shown.
 */
export function restartDeviceRound(store: KeyValueStore, previousSeed: string, seed: string, reviewKey: string): boolean {
  let kept = false;
  try {
    store.setItem(JOURNAL_DECK_KEY, seed);
    kept = store.getItem(JOURNAL_DECK_KEY) === seed;
  } catch {
    kept = false;
  }
  if (!kept) {
    // the pointer may or may not have been written: point it back at the old round (its notes were never touched)
    try { store.setItem(JOURNAL_DECK_KEY, previousSeed); } catch { /* the old notes are still under their own key */ }
    return false;
  }
  try { store.removeItem(notesKeyFor(previousSeed)); } catch { /* an unseen leftover */ }
  try {
    const all = JSON.parse(store.getItem(reviewKey) ?? "null");
    const slot = reviewSlotFor(previousSeed);
    if (all && typeof all === "object" && !Array.isArray(all) && slot in all) { delete all[slot]; store.setItem(reviewKey, JSON.stringify(all)); }
  } catch { /* an unseen leftover */ }
  return true;
}

/** The day's first reply speaks about the original card by name, so it only fits when that card was drawn. */
export function isOriginalCard(day: number, cardId: string | undefined) {
  return journalCardIds[day - 1] === cardId;
}
