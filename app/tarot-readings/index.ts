import type { CardReading } from "@/lib/tarot-synthesis";
import major0012 from "./major-00-12.json";
import major1321 from "./major-13-21.json";
import wands from "./wands.json";
import cups from "./cups.json";
import swords from "./swords.json";
import pentacles from "./pentacles.json";

/**
 * Reading v4 texts, written with ChatGPT in batches of 13–14 cards (spec 2026-11-13):
 * per card an energy note, an outward line, and three sentences for each of the six topics.
 * Loaded on demand by the draw section; tests/tarot-readings.test.mjs checks every card and length.
 */
export const allReadings = [...major0012, ...major1321, ...wands, ...cups, ...swords, ...pentacles] as unknown as CardReading[];

export const readingsById: ReadonlyMap<string, CardReading> = new Map(allReadings.map((reading) => [reading.id, reading]));
