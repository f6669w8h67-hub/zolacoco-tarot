// Line breaking for Zolacoco 覺察卡 sentences (card face, share image). No data imports, so tests can load it.

/** Splits a sentence after its commas so lines only break between phrases. */
export function phrases(text: string) {
  return text.match(/[^，、：；？]+[，、：；？]?/g) ?? [text];
}

const CLOSING = "，、。：；？！」』）";
const PHRASE_END = /[，、。：；？！]$/;

/** Atoms that never split: a 「quote」 with what follows it, or one character with its closing punctuation. */
function atoms(text: string) {
  const out: string[] = [];
  for (let i = 0; i < text.length;) {
    let atom: string;
    if (text[i] === "「") {
      const end = text.indexOf("」", i);
      atom = end < 0 ? text.slice(i) : text.slice(i, end + 1);
    } else atom = text[i];
    i += atom.length;
    while (i < text.length && CLOSING.includes(text[i])) { atom += text[i]; i += 1; }
    out.push(atom);
  }
  return out;
}

// A break before one of these little words reads naturally (「…是為了 / 對真正重要的事…」);
// anywhere else inside a phrase it splits a word, so it costs much more.
const SOFT_BEFORE = "是就也都而在把對讓比給跟和從往才又還但卻只為會由怎什";

function breakCost(parts: string[], i: number) {
  if (i === parts.length || PHRASE_END.test(parts[i - 1])) return 0;
  // …but not right after an adverb that belongs to it (都｜是, 就｜是).
  if (SOFT_BEFORE.includes(parts[i][0]) && !"都就也還只才又總".includes(parts[i - 1].slice(-1))) return 12;
  if (parts[i - 1].endsWith("的")) return 16;
  return 40;
}

/**
 * Breaks a card sentence into balanced lines of at most `max` characters: lines end after a comma
 * where possible, otherwise before a little word like 是 or 對; a 「quote」 is never split and no
 * line starts with closing punctuation. One more line is allowed when it avoids splitting a word.
 */
export function breakLines(text: string, max: number) {
  const parts = atoms(text);
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  if (total <= max) return [text];
  const prefix = [0];
  for (const part of parts) prefix.push(prefix[prefix.length - 1] + part.length);
  const fewest = Math.ceil(total / max);
  let chosen: { cost: number; lines: string[] } | null = null;
  for (let lines = fewest; lines <= Math.min(fewest + 1, parts.length); lines += 1) {
    const target = total / lines;
    // best[j][i]: lowest cost for the first i atoms in j lines; from[j][i]: where line j starts.
    const best = Array.from({ length: lines + 1 }, () => new Array(parts.length + 1).fill(Infinity));
    const from = Array.from({ length: lines + 1 }, () => new Array(parts.length + 1).fill(-1));
    best[0][0] = 0;
    for (let j = 1; j <= lines; j += 1) {
      for (let i = 1; i <= parts.length; i += 1) {
        for (let k = j - 1; k < i; k += 1) {
          const length = prefix[i] - prefix[k];
          if (length > max || best[j - 1][k] === Infinity) continue;
          const cost = best[j - 1][k] + (length - target) ** 2 + breakCost(parts, i);
          if (cost < best[j][i]) { best[j][i] = cost; from[j][i] = k; }
        }
      }
    }
    const cost = best[lines][parts.length] + (lines - fewest) * 10;
    if (cost === Infinity || (chosen && chosen.cost <= cost)) continue;
    const result: string[] = [];
    for (let j = lines, i = parts.length; j > 0; j -= 1) {
      const k = from[j][i];
      result.unshift(parts.slice(k, i).join(""));
      i = k;
    }
    chosen = { cost, lines: result };
  }
  return chosen?.lines ?? [text];
}
