// One bright card face and one card back for every place a tarot card appears
// (draw result, practice/archetype card, healing room). Spec v2, Issue #12:
// the label and the name sit outside the illustration, never on top of it.
import type { CSSProperties } from "react";
import { cardLabel, type TarotCard } from "./tarot-data";

export function TarotCardFace({ card, className = "", lazy = false }: { card: TarotCard; className?: string; lazy?: boolean }) {
  return <div className={`rc-card-face ${className}`.trim()}>
    <p className="rc-card-face__label">{cardLabel(card)}</p>
    <div className="rc-card-face__art">
      <img src={card.art} alt={card.scene} loading={lazy ? "lazy" : undefined} onError={(event) => { event.currentTarget.src = "/cat-tarot-master.png"; }} />
    </div>
    <p className="rc-card-face__name">{card.name}</p>
  </div>;
}

/** Bright card back (spec v2): ivory and blush, gold lattice, moon-and-stars medallion, no text. */
export function TarotCardBack({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <div className={className} style={style} aria-hidden="true"><div className="back-frame" /></div>;
}
