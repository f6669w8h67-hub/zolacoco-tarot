"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "./astro-dice.css";

type AstroItem = { key:string; symbol:string; name:string; en:string; meaning:string; prompt:string };
type Roll = { planet:AstroItem; sign:AstroItem; house:AstroItem };
type Viewer = { displayName:string; email:string; isAdmin:boolean } | null;
type HistoryItem = { id:number; question:string; category:string; planet_name:string; sign_name:string; house_name:string; note:string; created_at:string };

type DetailedReading = { current:string; friction:string; action:string; reflection:string };

const planets:AstroItem[] = [
  {key:"sun",symbol:"☉",name:"太陽",en:"SUN",meaning:"核心意志、被看見與主動創造",prompt:"如果不再縮小自己，你真正想表達什麼？"},
  {key:"moon",symbol:"☽",name:"月亮",en:"MOON",meaning:"情緒需求、安全感與本能反應",prompt:"這件事碰觸了你哪一種深層需要？"},
  {key:"mercury",symbol:"☿",name:"水星",en:"MERCURY",meaning:"思考、訊息、溝通與理解方式",prompt:"還有哪些話需要說清楚，或資訊需要確認？"},
  {key:"venus",symbol:"♀",name:"金星",en:"VENUS",meaning:"關係、吸引力、價值感與享受",prompt:"怎樣的選擇更符合你的價值與被愛方式？"},
  {key:"mars",symbol:"♂",name:"火星",en:"MARS",meaning:"行動、慾望、界線與衝突處理",prompt:"你需要向前一步，還是先立下一條界線？"},
  {key:"jupiter",symbol:"♃",name:"木星",en:"JUPITER",meaning:"擴展、信念、機會與長期視野",prompt:"哪一種可能值得你多給一點空間？"},
  {key:"saturn",symbol:"♄",name:"土星",en:"SATURN",meaning:"責任、限制、承諾與成熟課題",prompt:"現在真正需要承擔的是什麼，又有哪些不必全扛？"},
  {key:"uranus",symbol:"♅",name:"天王星",en:"URANUS",meaning:"改變、突破、自由與意外轉折",prompt:"若允許自己換一種做法，你最想改變哪裡？"},
  {key:"neptune",symbol:"♆",name:"海王星",en:"NEPTUNE",meaning:"想像、直覺、投射與模糊界線",prompt:"什麼是你的感受，什麼仍需要現實證據？"},
  {key:"pluto",symbol:"♇",name:"冥王星",en:"PLUTO",meaning:"深層轉化、控制、失去與重生",prompt:"這件事邀請你放下哪個已不再適合的模式？"},
  {key:"north-node",symbol:"☊",name:"北交點",en:"NORTH NODE",meaning:"陌生但值得發展的新方向",prompt:"哪一步雖然不熟悉，卻更靠近想成為的自己？"},
  {key:"south-node",symbol:"☋",name:"南交點",en:"SOUTH NODE",meaning:"熟悉慣性、既有能力與需要鬆開的依賴",prompt:"你正在重複哪一種熟悉、卻不一定有幫助的反應？"},
];

const signs:AstroItem[] = [
  {key:"aries",symbol:"♈",name:"牡羊座",en:"ARIES",meaning:"直接、迅速、勇於開始",prompt:"先做一個小行動，而不是等到完全不害怕。"},
  {key:"taurus",symbol:"♉",name:"金牛座",en:"TAURUS",meaning:"穩定、務實、重視感受與價值",prompt:"回到身體與現實資源，確認什麼能長久。"},
  {key:"gemini",symbol:"♊",name:"雙子座",en:"GEMINI",meaning:"交流、比較、彈性與多元觀點",prompt:"多問一個問題，也允許答案不是只有一種。"},
  {key:"cancer",symbol:"♋",name:"巨蟹座",en:"CANCER",meaning:"保護、照顧、情感記憶與歸屬",prompt:"先照顧安全感，再決定要靠近還是退開。"},
  {key:"leo",symbol:"♌",name:"獅子座",en:"LEO",meaning:"自信、創造、真心與自我表達",prompt:"誠實說出你的在意，不用把光交給別人定義。"},
  {key:"virgo",symbol:"♍",name:"處女座",en:"VIRGO",meaning:"整理、辨別、改善與具體細節",prompt:"把問題拆小，先完成最可處理的一件事。"},
  {key:"libra",symbol:"♎",name:"天秤座",en:"LIBRA",meaning:"協調、公平、關係與雙方立場",prompt:"同時看見彼此，但別用和諧交換自己的需要。"},
  {key:"scorpio",symbol:"♏",name:"天蠍座",en:"SCORPIO",meaning:"深入、信任、強烈情感與真相",prompt:"別只停在表面反應，看看你最害怕失去什麼。"},
  {key:"sagittarius",symbol:"♐",name:"射手座",en:"SAGITTARIUS",meaning:"探索、誠實、信念與更大視野",prompt:"把鏡頭拉遠，這段經驗正在教會你什麼？"},
  {key:"capricorn",symbol:"♑",name:"摩羯座",en:"CAPRICORN",meaning:"規劃、責任、成果與長期建設",prompt:"設定可衡量的下一步，讓承諾落到時間表上。"},
  {key:"aquarius",symbol:"♒",name:"水瓶座",en:"AQUARIUS",meaning:"獨立、創新、群體與客觀看待",prompt:"先拉開一點距離，看看是否有不同的解法。"},
  {key:"pisces",symbol:"♓",name:"雙魚座",en:"PISCES",meaning:"共感、想像、接納與界線流動",prompt:"相信感受，同時替直覺補上一項現實確認。"},
];

const houses:AstroItem[] = [
  {key:"1",symbol:"Ⅰ",name:"第一宮",en:"SELF",meaning:"自我狀態、外在呈現與新的開始",prompt:"焦點先回到你如何選擇成為自己。"},
  {key:"2",symbol:"Ⅱ",name:"第二宮",en:"VALUE",meaning:"金錢、資源、能力與自我價值",prompt:"留意投入是否符合你的價值與可用資源。"},
  {key:"3",symbol:"Ⅲ",name:"第三宮",en:"VOICE",meaning:"溝通、學習、手足與日常訊息",prompt:"一段對話或一項新資訊可能是關鍵。"},
  {key:"4",symbol:"Ⅳ",name:"第四宮",en:"ROOTS",meaning:"家庭、內在安全感、居所與根源",prompt:"這件事需要先安頓情緒與歸屬感。"},
  {key:"5",symbol:"Ⅴ",name:"第五宮",en:"JOY",meaning:"戀愛、創作、玩心與真誠表達",prompt:"問問自己：什麼讓你重新有生命力？"},
  {key:"6",symbol:"Ⅵ",name:"第六宮",en:"RITUAL",meaning:"工作日常、健康習慣、服務與調整",prompt:"答案藏在可重複執行的小習慣裡。"},
  {key:"7",symbol:"Ⅶ",name:"第七宮",en:"PARTNERSHIP",meaning:"伴侶、合作、承諾與互相映照",prompt:"觀察雙方是否都有回應與調整的意願。"},
  {key:"8",symbol:"Ⅷ",name:"第八宮",en:"BOND",meaning:"深層連結、共享資源、危機與轉化",prompt:"需要談清楚信任、交換或權力的界線。"},
  {key:"9",symbol:"Ⅸ",name:"第九宮",en:"HORIZON",meaning:"遠行、進修、信念與人生視野",prompt:"先確認你想走向哪一個更大的方向。"},
  {key:"10",symbol:"Ⅹ",name:"第十宮",en:"CALLING",meaning:"事業、名聲、目標與社會角色",prompt:"這次選擇會如何影響你想建立的長期位置？"},
  {key:"11",symbol:"Ⅺ",name:"第十一宮",en:"COMMUNITY",meaning:"朋友、社群、願景與未來計畫",prompt:"哪些人或資源能支持這個未來版本的你？"},
  {key:"12",symbol:"Ⅻ",name:"第十二宮",en:"INNER WORLD",meaning:"潛意識、休息、隱藏模式與放下",prompt:"先沉澱，不必逼自己在模糊時立刻定案。"},
];

const categories = ["感情關係","工作與方向","金錢與資源","人際互動","今日指引"];
const questionIdeas:Record<string,string[]> = {
  "感情關係":["這段關係目前最需要我看見什麼？","我該如何調整現在的互動方式？","我在這段關係裡真正需要的是什麼？"],
  "工作與方向":["目前的工作方向最需要我留意什麼？","下一步應該優先累積哪一種能力？","面對現在的選擇，我忽略了什麼？"],
  "金錢與資源":["現在最需要重新整理哪一項資源？","這次投入前，我應該先確認什麼？","我該如何更穩定地運用現有資源？"],
  "人際互動":["這段互動真正卡住的地方是什麼？","我需要說清楚哪一個界線？","面對這個人，我可以調整什麼？"],
  "今日指引":["今天最值得我留意的方向是什麼？","今天適合把力量放在哪裡？","此刻的我最需要看見什麼？"],
};
const categoryLead:Record<string,string> = {
  "感情關係":"把焦點放在關係裡的互動、需求與可觀察的行動，不替對方斷言心意。",
  "工作與方向":"把訊息對照目前的能力、資源、時程與真正想累積的方向。",
  "金錢與資源":"把象徵帶回收支、風險與可用資源，重要決策仍以現實資料為準。",
  "人際互動":"看看彼此的界線、溝通方式與你能主動調整的部分。",
  "今日指引":"把結果當成今天的觀察角度，選一個小行動帶回生活。",
};

const categoryContext:Record<string,{scene:string;evidence:string;step:string}> = {
  "感情關係":{scene:"互動節奏、情感需要與彼此是否願意回應",evidence:"對方實際說過的話、聯絡頻率與是否有一致行動",step:"先說清楚一個需要或界線，再觀察對方是否願意接住"},
  "工作與方向":{scene:"目前的職責、能力累積與下一階段的職涯方向",evidence:"工作內容、資源、時程、報酬與能否累積可帶走的能力",step:"列出一項本週能完成的工作驗證，不只停在想像結果"},
  "金錢與資源":{scene:"收入安全感、資源分配與你如何衡量自身價值",evidence:"實際收支、風險承受度、合約條件與現有資源",step:"先核對一個關鍵數字或條件，再決定是否投入"},
  "人際互動":{scene:"溝通方式、角色期待與雙方界線",evidence:"對方可觀察的回應、事件前後差異與你是否能自在表達",step:"把猜測改成一個可以被回答的具體問題"},
  "今日指引":{scene:"今天最容易被觸發的狀態與可主動調整的重心",evidence:"身體感受、情緒變化與今天確實發生的小事",step:"選一個十分鐘內能完成的小行動，讓訊息落地"},
};

const planetFriction:Record<string,string> = {
  sun:"過度在意是否被肯定，可能讓你把真正想要的方向交給外界決定",
  moon:"情緒與安全感被觸動時，容易把當下感受直接當成全部事實",
  mercury:"資訊不足或話沒有說清楚，反覆猜測會比事件本身更消耗你",
  venus:"為了維持喜歡與和諧，可能降低自己的標準或忽略交換是否平衡",
  mars:"急著推進或證明立場，容易讓必要的行動變成衝突",
  jupiter:"期待放大得太快時，容易高估機會、低估現實條件",
  saturn:"責任感可能變成過度自我要求，讓你只看見限制而忘了可調整之處",
  uranus:"想立刻擺脫舊狀態，可能在還沒看清代價前做出劇烈改變",
  neptune:"直覺、期待與投射混在一起時，容易忽略需要驗證的現實線索",
  pluto:"越害怕失去控制，越可能緊抓一個其實已需要轉化的模式",
  "north-node":"因為陌生而退回熟悉選項，會錯過真正需要練習的新能力",
  "south-node":"熟悉的反應雖然讓你暫時安心，卻可能把你帶回同一個循環",
};

function detailedReading(roll:Roll,category:string):DetailedReading{
  const context=categoryContext[category]??categoryContext["今日指引"];
  return {
    current:`這組骰子把焦點放在${context.scene}。${roll.planet.name}是正在推動事情的核心，${roll.sign.name}說明你會用「${roll.sign.meaning}」的方式回應，而${roll.house.name}指出真正需要處理的場域是${roll.house.meaning}。這不是三個分開的標籤，而是在提醒你：先在這個生活領域辨認核心需要，再決定怎麼表達。`,
    friction:`需要留意的是：${planetFriction[roll.planet.key]}。當它透過${roll.sign.name}表現時，優點是${roll.sign.meaning}；但如果用力過度，也可能只依照慣性反應。請回頭核對${context.evidence}，不要只用想像補完未知的部分。`,
    action:`今天先做一件能驗證方向的事：${context.step}。進行時採用${roll.sign.name}的節奏——${roll.sign.prompt} 同時把注意力放回${roll.house.name}：${roll.house.prompt}`,
    reflection:`在「${roll.house.name}」這個領域裡，我真正想透過${roll.planet.name}得到什麼？我可以如何用${roll.sign.name}的成熟方式表達，而不是重複原本的反應？`,
  };
}

function randomItem<T>(items:T[]){ return items[Math.floor(Math.random()*items.length)]!; }
function Die({item,type,rolling}:{item:AstroItem|null;type:"planet"|"sign"|"house";rolling:boolean}){
  const labels={
    planet:{name:"行星能量骰",role:"正在發生什麼",en:"PLANET · WHAT"},
    sign:{name:"星座表現骰",role:"事情如何展開",en:"SIGN · HOW"},
    house:{name:"宮位領域骰",role:"影響哪個生活領域",en:"HOUSE · WHERE"},
  } as const;
  const label=labels[type];
  return <div className={`ad-die-wrap ${rolling?"is-rolling":""}`}><div className="ad-die-label"><small>{label.en}</small><b>{label.name}</b><span>{label.role}</span></div><div className="ad-die"><div className="ad-die-face"><span className="astro-symbol">{item?`${item.symbol}\uFE0E`:"·"}</span><b>{item?.name??"等待擲骰"}</b><em>{item?.meaning??label.role}</em></div></div></div>;
}

export default function AstroDicePage(){
  const [viewer,setViewer]=useState<Viewer>(null); const [checked,setChecked]=useState(false);
  const [category,setCategory]=useState(categories[0]); const [question,setQuestion]=useState(""); const [roll,setRoll]=useState<Roll|null>(null);
  const [rolling,setRolling]=useState(false); const [note,setNote]=useState(""); const [saved,setSaved]=useState<"idle"|"saved"|"error">("idle");
  const [history,setHistory]=useState<HistoryItem[]>([]); const [historyOpen,setHistoryOpen]=useState(false);
  useEffect(()=>{fetch("/api/me").then(r=>r.json()).then(async d=>{setViewer(d.user??null);setChecked(true);if(d.user){const h=await fetch("/api/astro-dice");if(h.ok)setHistory((await h.json()).entries??[])}}).catch(()=>setChecked(true))},[]);
  const synthesis=useMemo(()=>roll?`你問的是「${question.trim()}」。${roll.planet.name}顯示此刻真正推動事情的是「${roll.planet.meaning}」；它會透過${roll.sign.name}的「${roll.sign.meaning}」呈現，並在${roll.house.name}所代表的「${roll.house.meaning}」裡最明顯。先處理這個領域裡可由你選擇的部分，事情才會開始有新的變化。`:"",[roll,question]);
  const specific=useMemo(()=>roll?detailedReading(roll,category):null,[roll,category]);
  function cast(){if(!question.trim()||rolling)return;setRolling(true);setRoll(null);setSaved("idle");setNote("");window.setTimeout(()=>{setRoll({planet:randomItem(planets),sign:randomItem(signs),house:randomItem(houses)});setRolling(false);window.setTimeout(()=>document.getElementById("astro-result")?.scrollIntoView({behavior:"smooth",block:"start"}),100)},1550)}
  async function save(){if(!roll)return;if(!viewer){window.location.href=`/signin-with-chatgpt?return_to=${encodeURIComponent("/astro-dice")}`;return}setSaved("idle");const response=await fetch("/api/astro-dice",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({question:question.trim(),category,planet:roll.planet.name,sign:roll.sign.name,house:roll.house.name,note})});if(!response.ok){setSaved("error");return}setSaved("saved");const h=await fetch("/api/astro-dice");if(h.ok)setHistory((await h.json()).entries??[])}
  function reset(){setRoll(null);setQuestion("");setNote("");setSaved("idle");window.scrollTo({top:0,behavior:"smooth"})}
  return <main className="astro-dice-page">
    <nav className="ad-nav"><Link className="ad-brand" href="/">ZOLACOCO <span>TAROT</span></Link><div><Link href="/">最初選單</Link><Link href="/#draw">塔羅抽牌</Link><Link href="/pendulum">靈擺</Link>{viewer?.isAdmin&&<Link href="/admin">查看後台</Link>}{checked&&(viewer?<a href="/signout-with-chatgpt?return_to=/astro-dice">登出</a>:<a className="ad-login" href="/signin-with-chatgpt?return_to=/astro-dice">登入／註冊</a>)}</div></nav>
    <header className="ad-hero"><div className="ad-sky" aria-hidden="true"/><div className="ad-hero-copy"><small>ASTRO DICE · A SYMBOLIC COMPASS</small><h1><span>星骰占星</span><em>此刻方向指引</em></h1><p>透過三顆不同用途的占星骰，把一個問題拆成「核心能量、表現方式、生活領域」，幫助你看懂此刻最值得留意的方向。</p><a href="#astro-intro">跟著引導往下走 <b>↓</b></a></div><aside><span>三顆星骰怎麼看</span><b>行星能量骰</b><p>正在發生什麼、核心動力是什麼</p><b>星座表現骰</b><p>這股能量會用什麼方式展開</p><b>宮位領域骰</b><p>事情主要落在哪個生活領域</p></aside></header>
    <nav className="ad-journey" aria-label="星骰使用流程"><a href="#astro-intro"><i>01</i><b>整理問題</b><span>先聚焦一件事</span></a><a href="#astro-ritual"><i>02</i><b>擲出星骰</b><span>讀取三個線索</span></a><a href="#astro-result"><i>03</i><b>理解訊息</b><span>帶回真實生活</span></a></nav>
    <section className="ad-intro" id="astro-intro"><p className="ad-eyebrow">BEFORE YOU CAST</p><h2>一次，只把一件事放進星空</h2><p>星骰不是替你宣判未來，而是把問題拆成三個象徵線索。問題越聚焦，越容易把結果帶回真實生活。</p><div><article><i>01</i><b>先說清楚你想整理什麼</b><p>例如：「我在這段關係裡，現在最需要看見什麼？」</p></article><article><i>02</i><b>把定論改成可理解的問題</b><p>與其問「他一定會回來嗎」，更適合問「這段互動目前的課題是什麼？」</p></article><article><i>03</i><b>最後回到現實選擇</b><p>結果提供觀察角度，不代替事實、界線與你真正要做的決定。</p></article></div><a className="ad-next-step" href="#astro-ritual">問題準備好了，進入擲骰桌 <b>↓</b></a></section>
    <section className="ad-ritual" id="astro-ritual"><div className="ad-ritual-heading"><small>THE CASTING TABLE</small><h2>今晚，你想問哪一件事？</h2><p>先選主題，再寫下一個此刻真正想整理的問題。</p></div><div className="ad-workspace"><div className="ad-form"><label>01 · 選擇問題主題</label><div className="ad-categories">{categories.map(item=><button key={item} className={category===item?"active":""} onClick={()=>setCategory(item)}>{item}</button>)}</div><label htmlFor="astro-question">02 · 寫下你的問題</label><textarea id="astro-question" maxLength={180} value={question} disabled={rolling} onChange={e=>setQuestion(e.target.value)} placeholder="例如：我在目前的工作方向裡，最需要留意什麼？"/><div className="ad-question-help"><span>不知道怎麼問？可以直接選一句</span>{questionIdeas[category].map(idea=><button type="button" key={idea} onClick={()=>setQuestion(idea)}>{idea}</button>)}</div><small>{question.length} / 180</small><button className="ad-cast" disabled={!question.trim()||rolling} onClick={cast}>{rolling?"星骰正在轉動……":"擲出三顆星骰"}<b aria-hidden="true">◇</b></button></div><div className={`ad-table ${rolling?"is-rolling":""}`}><div className="ad-table-rings"/><p>{rolling?"讓問題在心裡停留一下":"依序讀取：核心能量 → 表現方式 → 生活領域"}</p><div className="ad-dice"><Die item={roll?.planet??null} type="planet" rolling={rolling}/><Die item={roll?.sign??null} type="sign" rolling={rolling}/><Die item={roll?.house??null} type="house" rolling={rolling}/></div></div></div></section>
    {roll&&specific&&<section className="ad-result" id="astro-result"><div className="ad-result-title"><small>YOUR ASTRO DICE MESSAGE · {category}</small><h2>{roll.planet.name} × {roll.sign.name} × {roll.house.name}</h2><p>{question}</p></div><blockquote><small>整體訊息</small><p>{synthesis}</p><em>{categoryLead[category]}</em></blockquote><div className="ad-reading-grid"><article><span>{roll.planet.symbol}{"\uFE0E"}</span><small>WHAT · 核心動力</small><h3>{roll.planet.name}</h3><p>{roll.planet.meaning}</p><b>{roll.planet.prompt}</b></article><article><span>{roll.sign.symbol}{"\uFE0E"}</span><small>HOW · 表現方式</small><h3>{roll.sign.name}</h3><p>{roll.sign.meaning}</p><b>{roll.sign.prompt}</b></article><article><span>{roll.house.symbol}{"\uFE0E"}</span><small>WHERE · 生活場域</small><h3>{roll.house.name}</h3><p>{roll.house.meaning}</p><b>{roll.house.prompt}</b></article></div><div className="ad-specific-reading"><article><small>01 · 此刻在說什麼</small><h3>把三顆骰子合起來看</h3><p>{specific.current}</p></article><article><small>02 · 可能卡在哪裡</small><h3>留意能量用力過度</h3><p>{specific.friction}</p></article><article><small>03 · 今天能怎麼做</small><h3>讓訊息回到現實</h3><p>{specific.action}</p></article></div><div className="ad-reflection"><div><small>INTEGRATION QUESTION</small><h3>把星骰帶回你真正的生活</h3><p>{specific.reflection}</p></div><div><label htmlFor="astro-note">寫下此刻浮現的答案</label><textarea id="astro-note" maxLength={600} value={note} onChange={e=>setNote(e.target.value)} placeholder="我第一個想到的是……"/><button onClick={save}>{viewer?"儲存這次星骰紀錄":"登入後儲存完整紀錄"}</button>{saved==="saved"&&<small>已收藏到你的星骰紀錄，也會出現在 Zola 後台。</small>}{saved==="error"&&<small>目前未能儲存，請稍後再試。</small>}</div></div><div className="ad-result-actions"><button onClick={reset}>重新整理一個問題</button><Link href="/#draw">搭配塔羅再深入一步 →</Link></div><p className="ad-disclaimer">星骰提供象徵式自我探索，不是科學測量或確定預言；健康、法律、投資、安全與生死相關事項，請以專業資訊為準。</p></section>}
    {viewer&&<section className="ad-history"><button className="ad-history-toggle" onClick={()=>setHistoryOpen(v=>!v)}><span><small>MY ASTRO DICE JOURNAL</small><b>我的星骰紀錄</b></span><em>{history.length} 筆 {historyOpen?"−":"＋"}</em></button>{historyOpen&&(history.length?<div className="ad-history-list">{history.map(item=><article key={item.id}><div><span>{item.category}</span><time>{new Date(item.created_at).toLocaleString("zh-TW")}</time></div><h3>{item.question}</h3><b>{item.planet_name} × {item.sign_name} × {item.house_name}</b>{item.note&&<p>{item.note}</p>}</article>)}</div>:<p className="ad-empty">完成並儲存第一次星骰後，紀錄會出現在這裡。</p>)}</section>}
    <footer><Link className="ad-brand" href="/">ZOLACOCO <span>TAROT</span></Link><p>不是把答案交給星空，而是借一點星光，看清自己的下一步。</p><small>僅供自我探索與娛樂參考</small></footer>
  </main>;
}
