import { TarotCardBack, TarotCardFace } from "./tarot-card";
import type { TarotCard } from "./tarot-data";

// A small flipping tarot card for the home page practices (直覺練習, 七日塔羅筆記) and /journal.
export function PracticeCard({ card, hidden = false, flipped = true }: { card: TarotCard; hidden?: boolean; flipped?: boolean }) {
  return <div className={`practice-tarot-card ${flipped ? "is-flipped" : ""}`} aria-label={hidden ? "尚未翻開的塔羅練習牌" : `${card.name}塔羅牌`}>
    <div className="practice-tarot-inner">
      <TarotCardBack className="practice-tarot-back" />
      <TarotCardFace card={card} className="practice-tarot-front" />
    </div>
  </div>;
}
