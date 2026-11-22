// 會員年費: the three yearly prices in order and the question read by Zola that comes with each.
// Shown next to every 「申請成為會員」: the card when the three free tries are used up, the screen for an
// account that isn't activated yet, and 會員中心 while waiting. No places-left count (Zola, 2026-11-22).
import { useId } from "react";
import { MEMBERSHIP_GIFT_DAYS, MEMBERSHIP_TIERS, formatTwd } from "@/lib/membership-prices";
import "./styles/member-prices.css";

export default function MemberPrices({ className = "" }: { className?: string }) {
  const titleId = useId();
  return <div className={`member-prices ${className}`.trim()} role="group" aria-labelledby={titleId}>
    <p className="member-prices-title" id={titleId}><span aria-hidden="true">✦</span>會員年費<span aria-hidden="true">✦</span></p>
    <ol className="member-prices-tiers">
      {MEMBERSHIP_TIERS.map((tier) => <li key={tier.name}>
        <span className="member-prices-tier">
          <span className="member-prices-name">{tier.name}</span>
          {tier.limit ? <span className="member-prices-limit">限量 {tier.limit} 名</span> : null}
        </span>
        <span className="member-prices-price">{formatTwd(tier.price)}<small>／年</small></span>
      </li>)}
    </ol>
    {/* Lines only break at <wbr>, never inside a phrase (word-break: keep-all, and no-break spaces around Zola). */}
    <p className="member-prices-gift">
      <b>三種方案都送<wbr />一題&nbsp;Zola&nbsp;親自占卜</b>
      <span>開通後&nbsp;{MEMBERSHIP_GIFT_DAYS}&nbsp;天內，<wbr />私訊&nbsp;Zola&nbsp;使用</span>
    </p>
    <p className="member-prices-note"><small>名額依開通順序，<wbr />額滿就進入下一階。</small></p>
  </div>;
}
