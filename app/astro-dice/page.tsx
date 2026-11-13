"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import "../styles/pearl-page.css";
import "./astro-dice-v1.css";

type AstroItem = { key:string; symbol:string; name:string; en:string; meaning:string; prompt:string };
type Roll = { planet:AstroItem; sign:AstroItem; house:AstroItem };
type HistoryItem = { id:number; question:string; category:string; planet_name:string; sign_name:string; house_name:string; note:string; created_at:string };
const ASTRO_STORAGE_KEY = "zolacoco-astro-dice-records-v1";

type DetailedReading = { current:string; friction:string; action:string; reflection:string };

const planets:AstroItem[] = [
  {key:"sun",symbol:"☉",name:"太陽",en:"SUN",meaning:"核心意志、被看見與主動創造",prompt:"如果不再縮小自己，妳真正想表達什麼？"},
  {key:"moon",symbol:"☽",name:"月亮",en:"MOON",meaning:"情緒需求、安全感與本能反應",prompt:"這件事碰觸了妳哪一種深層需要？"},
  {key:"mercury",symbol:"☿",name:"水星",en:"MERCURY",meaning:"思考、訊息、溝通與理解方式",prompt:"還有哪些話需要說清楚，或資訊需要確認？"},
  {key:"venus",symbol:"♀",name:"金星",en:"VENUS",meaning:"關係、吸引力、價值感與享受",prompt:"怎樣的選擇更符合妳的價值與被愛方式？"},
  {key:"mars",symbol:"♂",name:"火星",en:"MARS",meaning:"行動、慾望、界線與衝突處理",prompt:"妳需要向前一步，還是先立下一條界線？"},
  {key:"jupiter",symbol:"♃",name:"木星",en:"JUPITER",meaning:"擴展、信念、機會與長期視野",prompt:"哪一種可能值得妳多給一點空間？"},
  {key:"saturn",symbol:"♄",name:"土星",en:"SATURN",meaning:"責任、限制、承諾與成熟課題",prompt:"現在真正需要承擔的是什麼，又有哪些不必全扛？"},
  {key:"uranus",symbol:"♅",name:"天王星",en:"URANUS",meaning:"改變、突破、自由與意外轉折",prompt:"若允許自己換一種做法，妳最想改變哪裡？"},
  {key:"neptune",symbol:"♆",name:"海王星",en:"NEPTUNE",meaning:"想像、直覺、投射與模糊界線",prompt:"什麼是妳的感受，什麼仍需要現實證據？"},
  {key:"pluto",symbol:"♇",name:"冥王星",en:"PLUTO",meaning:"深層轉化、控制、失去與重生",prompt:"這件事邀請妳放下哪個已不再適合的模式？"},
  {key:"north-node",symbol:"☊",name:"北交點",en:"NORTH NODE",meaning:"陌生但值得發展的新方向",prompt:"哪一步雖然不熟悉，卻更靠近想成為的自己？"},
  {key:"south-node",symbol:"☋",name:"南交點",en:"SOUTH NODE",meaning:"熟悉慣性、既有能力與需要鬆開的依賴",prompt:"妳正在重複哪一種熟悉、卻不一定有幫助的反應？"},
];

const signs:AstroItem[] = [
  {key:"aries",symbol:"♈",name:"牡羊座",en:"ARIES",meaning:"直接、迅速、勇於開始",prompt:"先做一個小行動，而不是等到完全不害怕。"},
  {key:"taurus",symbol:"♉",name:"金牛座",en:"TAURUS",meaning:"穩定、務實、重視感受與價值",prompt:"回到身體與現實資源，確認什麼能長久。"},
  {key:"gemini",symbol:"♊",name:"雙子座",en:"GEMINI",meaning:"交流、比較、彈性與多元觀點",prompt:"多問一個問題，也允許答案不是只有一種。"},
  {key:"cancer",symbol:"♋",name:"巨蟹座",en:"CANCER",meaning:"保護、照顧、情感記憶與歸屬",prompt:"先照顧安全感，再決定要靠近還是退開。"},
  {key:"leo",symbol:"♌",name:"獅子座",en:"LEO",meaning:"自信、創造、真心與自我表達",prompt:"誠實說出妳的在意，不用把光交給別人定義。"},
  {key:"virgo",symbol:"♍",name:"處女座",en:"VIRGO",meaning:"整理、辨別、改善與具體細節",prompt:"把問題拆小，先完成最可處理的一件事。"},
  {key:"libra",symbol:"♎",name:"天秤座",en:"LIBRA",meaning:"協調、公平、關係與雙方立場",prompt:"同時看見彼此，但別用和諧交換自己的需要。"},
  {key:"scorpio",symbol:"♏",name:"天蠍座",en:"SCORPIO",meaning:"深入、信任、強烈情感與真相",prompt:"別只停在表面反應，看看妳最害怕失去什麼。"},
  {key:"sagittarius",symbol:"♐",name:"射手座",en:"SAGITTARIUS",meaning:"探索、誠實、信念與更大視野",prompt:"把鏡頭拉遠，這段經驗正在教會妳什麼？"},
  {key:"capricorn",symbol:"♑",name:"摩羯座",en:"CAPRICORN",meaning:"規劃、責任、成果與長期建設",prompt:"設定可衡量的下一步，讓承諾落到時間表上。"},
  {key:"aquarius",symbol:"♒",name:"水瓶座",en:"AQUARIUS",meaning:"獨立、創新、群體與客觀看待",prompt:"先拉開一點距離，看看是否有不同的解法。"},
  {key:"pisces",symbol:"♓",name:"雙魚座",en:"PISCES",meaning:"共感、想像、接納與界線流動",prompt:"相信感受，同時替直覺補上一項現實確認。"},
];

const houses:AstroItem[] = [
  {key:"1",symbol:"Ⅰ",name:"第一宮",en:"SELF",meaning:"自我狀態、外在呈現與新的開始",prompt:"焦點先回到妳如何選擇成為自己。"},
  {key:"2",symbol:"Ⅱ",name:"第二宮",en:"VALUE",meaning:"金錢、資源、能力與自我價值",prompt:"留意投入是否符合妳的價值與可用資源。"},
  {key:"3",symbol:"Ⅲ",name:"第三宮",en:"VOICE",meaning:"溝通、學習、手足與日常訊息",prompt:"一段對話或一項新資訊可能是關鍵。"},
  {key:"4",symbol:"Ⅳ",name:"第四宮",en:"ROOTS",meaning:"家庭、內在安全感、居所與根源",prompt:"這件事需要先安頓情緒與歸屬感。"},
  {key:"5",symbol:"Ⅴ",name:"第五宮",en:"JOY",meaning:"戀愛、創作、玩心與真誠表達",prompt:"問問自己：什麼讓妳重新有生命力？"},
  {key:"6",symbol:"Ⅵ",name:"第六宮",en:"RITUAL",meaning:"工作日常、健康習慣、服務與調整",prompt:"答案藏在可重複執行的小習慣裡。"},
  {key:"7",symbol:"Ⅶ",name:"第七宮",en:"PARTNERSHIP",meaning:"伴侶、合作、承諾與互相映照",prompt:"觀察雙方是否都有回應與調整的意願。"},
  {key:"8",symbol:"Ⅷ",name:"第八宮",en:"BOND",meaning:"深層連結、共享資源、危機與轉化",prompt:"需要談清楚信任、交換或權力的界線。"},
  {key:"9",symbol:"Ⅸ",name:"第九宮",en:"HORIZON",meaning:"遠行、進修、信念與人生視野",prompt:"先確認妳想走向哪一個更大的方向。"},
  {key:"10",symbol:"Ⅹ",name:"第十宮",en:"CALLING",meaning:"事業、名聲、目標與社會角色",prompt:"這次選擇會如何影響妳想建立的長期位置？"},
  {key:"11",symbol:"Ⅺ",name:"第十一宮",en:"COMMUNITY",meaning:"朋友、社群、願景與未來計畫",prompt:"哪些人或資源能支持這個未來版本的妳？"},
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
  "人際互動":"看看彼此的界線、溝通方式與妳能主動調整的部分。",
  "今日指引":"把結果當成今天的觀察角度，選一個小行動帶回生活。",
};

const categoryContext:Record<string,{scene:string;evidence:string;step:string}> = {
  "感情關係":{scene:"互動節奏、情感需要與彼此是否願意回應",evidence:"對方實際說過的話、聯絡頻率與是否有一致行動",step:"先說清楚一個需要或界線，再觀察對方是否願意接住"},
  "工作與方向":{scene:"目前的職責、能力累積與下一階段的職涯方向",evidence:"工作內容、資源、時程、報酬與能否累積可帶走的能力",step:"列出一項本週能完成的工作驗證，不只停在想像結果"},
  "金錢與資源":{scene:"收入安全感、資源分配與妳如何衡量自身價值",evidence:"實際收支、風險承受度、合約條件與現有資源",step:"先核對一個關鍵數字或條件，再決定是否投入"},
  "人際互動":{scene:"溝通方式、角色期待與雙方界線",evidence:"對方可觀察的回應、事件前後差異與妳是否能自在表達",step:"把猜測改成一個可以被回答的具體問題"},
  "今日指引":{scene:"今天最容易被觸發的狀態與可主動調整的重心",evidence:"身體感受、情緒變化與今天確實發生的小事",step:"選一個十分鐘內能完成的小行動，讓訊息落地"},
};

const planetFriction:Record<string,string> = {
  sun:"過度在意是否被肯定，可能讓妳把真正想要的方向交給外界決定",
  moon:"情緒與安全感被觸動時，容易把當下感受直接當成全部事實",
  mercury:"資訊不足或話沒有說清楚，反覆猜測會比事件本身更消耗妳",
  venus:"為了維持喜歡與和諧，可能降低自己的標準或忽略交換是否平衡",
  mars:"急著推進或證明立場，容易讓必要的行動變成衝突",
  jupiter:"期待放大得太快時，容易高估機會、低估現實條件",
  saturn:"責任感可能變成過度自我要求，讓妳只看見限制而忘了可調整之處",
  uranus:"想立刻擺脫舊狀態，可能在還沒看清代價前做出劇烈改變",
  neptune:"直覺、期待與投射混在一起時，容易忽略需要驗證的現實線索",
  pluto:"越害怕失去控制，越可能緊抓一個其實已需要轉化的模式",
  "north-node":"因為陌生而退回熟悉選項，會錯過真正需要練習的新能力",
  "south-node":"熟悉的反應雖然讓妳暫時安心，卻可能把妳帶回同一個循環",
};

function detailedReading(roll:Roll,category:string):DetailedReading{
  const context=categoryContext[category]??categoryContext["今日指引"];
  return {
    current:`這組骰子把焦點放在${context.scene}。${roll.planet.name}是正在推動事情的核心，${roll.sign.name}說明妳會用「${roll.sign.meaning}」的方式回應，而${roll.house.name}指出真正需要處理的場域是${roll.house.meaning}。這不是三個分開的標籤，而是在提醒妳：先在這個生活領域辨認核心需要，再決定怎麼表達。`,
    friction:`需要留意的是：${planetFriction[roll.planet.key]}。當它透過${roll.sign.name}表現時，優點是${roll.sign.meaning}；但如果用力過度，也可能只依照慣性反應。請回頭核對${context.evidence}，不要只用想像補完未知的部分。`,
    action:`今天先做一件能驗證方向的事：${context.step}。進行時採用${roll.sign.name}的節奏——${roll.sign.prompt} 同時把注意力放回${roll.house.name}：${roll.house.prompt}`,
    reflection:`在「${roll.house.name}」這個領域裡，我真正想透過${roll.planet.name}得到什麼？我可以如何用${roll.sign.name}的成熟方式表達，而不是重複原本的反應？`,
  };
}

function randomItem<T>(items:T[]){ return items[Math.floor(Math.random()*items.length)]!; }
type DieType = "planet" | "sign" | "house";
const dieLabels:Record<DieType,{name:string;role:string;short:string}> = {
  planet:{name:"行星骰",role:"正在發生什麼",short:"核心能量"},
  sign:{name:"星座骰",role:"事情如何展開",short:"表現方式"},
  house:{name:"宮位骰",role:"落在哪個生活領域",short:"生活領域"},
};

// One porcelain die (ChatGPT art); the symbol is drawn by the page so every result shows the real roll.
function Die({item,type,rolling,index}:{item:AstroItem|null;type:DieType;rolling:boolean;index:number}){
  const label=dieLabels[type];
  return <figure className={`ad2-die ${rolling?"is-rolling":""} ${item?"has-value":""}`} style={{"--i":index} as React.CSSProperties}>
    <div className="ad2-die-body"><img src="/astro-dice/die.webp" alt="" draggable={false}/><span className="ad2-cartouche" aria-hidden="true">{item?<Glyph item={item} type={type}/>:<span className="ad2-glyph">✦</span>}</span></div>
    <figcaption><small>{label.name}</small><b>{item?.name??label.short}</b></figcaption>
  </figure>;
}

const ROLL_MS=1200;
const ROMAN=["","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
// Houses read as Latin numerals in Cormorant (骰面符號 v2); planets and signs use FreeSerif glyphs.
function Glyph({item,type}:{item:AstroItem;type:DieType}){
  return type==="house"?<span className="ad2-glyph roman">{ROMAN[Number(item.key)]??item.symbol}</span>:<span className="ad2-glyph">{`${item.symbol}︎`}</span>;
}

export default function AstroDicePage(){
  const [category,setCategory]=useState(categories[0]);
  const [question,setQuestion]=useState("");
  // One reading = one snapshot of question, topic and dice; the result and the saved record read only from it.
  const [reading,setReading]=useState<{roll:Roll;question:string;category:string}|null>(null);
  const roll=reading?.roll??null;
  const [busy,setBusy]=useState(false);
  const [rolling,setRolling]=useState(false);
  const busyRef=useRef(false);
  const [note,setNote]=useState("");
  const [savedId,setSavedId]=useState<number|null>(null);
  const [saveError,setSaveError]=useState(false);
  const [history,setHistory]=useState<HistoryItem[]>([]);
  const [historyOpen,setHistoryOpen]=useState(false);
  const [highlightId,setHighlightId]=useState<number|null>(null);
  const [ideasOpen,setIdeasOpen]=useState(false);
  const stageRef=useRef<HTMLDivElement|null>(null);
  const ritualRef=useRef<HTMLElement|null>(null);
  const resultRef=useRef<HTMLElement|null>(null);
  const questionRef=useRef<HTMLTextAreaElement|null>(null);
  const timersRef=useRef<number[]>([]);
  const scrollRef=useRef<number|null>(null);

  useEffect(()=>{try{setHistory(JSON.parse(localStorage.getItem(ASTRO_STORAGE_KEY)??"[]"))}catch{setHistory([])}},[]);
  useEffect(()=>()=>{timersRef.current.forEach(id=>window.clearTimeout(id));if(scrollRef.current)cancelAnimationFrame(scrollRef.current)},[]);

  const synthesis=useMemo(()=>{if(!reading)return "";const r=reading.roll;return `妳問的是「${reading.question}」。${r.planet.name}顯示此刻真正推動事情的是「${r.planet.meaning}」；它會透過${r.sign.name}的「${r.sign.meaning}」呈現，並在${r.house.name}所代表的「${r.house.meaning}」裡最明顯。先處理這個領域裡可由妳選擇的部分，事情才會開始有新的變化。`;},[reading]);
  const specific=useMemo(()=>reading?detailedReading(reading.roll,reading.category):null,[reading]);

  function later(run:()=>void,ms:number){const id=window.setTimeout(()=>{timersRef.current=timersRef.current.filter(item=>item!==id);run()},ms);timersRef.current.push(id)}
  function clearTimers(){timersRef.current.forEach(id=>window.clearTimeout(id));timersRef.current=[]}
  function reducedMotion(){return typeof window!=="undefined"&&window.matchMedia?.("(prefers-reduced-motion: reduce)").matches===true}
  function headerBottom(){const header=document.querySelector<HTMLElement>(".global-site-header");return header?Math.max(0,header.getBoundingClientRect().bottom):0}
  // 300 ms eased scroll; instant with reduced motion. Returns how long to wait.
  function scrollToTop(element:HTMLElement|null):number{
    if(!element)return 0;
    const target=Math.max(0,element.getBoundingClientRect().top+window.scrollY-headerBottom()-16);
    if(Math.abs(target-window.scrollY)<2)return 0;
    if(scrollRef.current)cancelAnimationFrame(scrollRef.current);
    if(reducedMotion()){window.scrollTo(0,target);return 0}
    const from=window.scrollY,started=performance.now(),span=300;
    const step=(now:number)=>{const t=Math.min(1,(now-started)/span);const eased=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;window.scrollTo(0,from+(target-from)*eased);scrollRef.current=t<1?requestAnimationFrame(step):null};
    scrollRef.current=requestAnimationFrame(step);
    return span;
  }
  function fullyVisible(element:HTMLElement|null){if(!element)return true;const rect=element.getBoundingClientRect();return rect.top>=headerBottom()&&rect.bottom<=window.innerHeight}

  function cast(){
    // lock at once, before any scrolling, so a second tap can never start another roll
    if(!question.trim()||busyRef.current)return;
    busyRef.current=true;setBusy(true);
    // 再擲一次 keeps the locked question and topic of the reading on screen
    const asked=reading?{question:reading.question,category:reading.category}:{question:question.trim(),category};
    clearTimers();setReading(null);setSavedId(null);setSaveError(false);setNote("");
    const snapshot={roll:{planet:randomItem(planets),sign:randomItem(signs),house:randomItem(houses)} as Roll,...asked};
    const show=()=>{setReading(snapshot);setRolling(false);busyRef.current=false;setBusy(false);navigator.vibrate?.(18);later(()=>{const heading=resultRef.current?.querySelector("h2") as HTMLElement|null;if(heading)scrollToTop(heading)},80)};
    const start=()=>{setRolling(true);later(show,reducedMotion()?200:ROLL_MS)};
    // Bring the whole stage on screen first, then roll (星骰互動 v1).
    const wait=fullyVisible(stageRef.current)?0:scrollToTop(stageRef.current);
    if(wait)later(start,wait+100);else start();
  }
  function save(){
    if(!reading||savedId!==null)return;
    try{const item:HistoryItem={id:Date.now(),question:reading.question,category:reading.category,planet_name:reading.roll.planet.name,sign_name:reading.roll.sign.name,house_name:reading.roll.house.name,note,created_at:new Date().toISOString()};const next=[item,...history].slice(0,80);localStorage.setItem(ASTRO_STORAGE_KEY,JSON.stringify(next));setHistory(next);setSavedId(item.id);setSaveError(false)}catch{setSaveError(true)}
  }
  function viewRecord(){
    if(savedId===null)return;
    setHistoryOpen(true);setHighlightId(savedId);
    later(()=>scrollToTop(document.getElementById(`astro-entry-${savedId}`)),60);
  }
  function newQuestion(){clearTimers();busyRef.current=false;setBusy(false);setRolling(false);setReading(null);setQuestion("");setNote("");setSavedId(null);setSaveError(false);later(()=>{scrollToTop(ritualRef.current);questionRef.current?.focus({preventScroll:true})},40)}
  function chooseIdea(idea:string){setQuestion(idea);setIdeasOpen(false);questionRef.current?.focus({preventScroll:true})}

  const locked=busy||reading!==null;
  const step=roll?(savedId!==null?3:2):question.trim()?1:0;
  const dice:Array<[DieType,AstroItem|null]>=[["planet",roll?.planet??null],["sign",roll?.sign??null],["house",roll?.house??null]];

  return <main className="astro-dice-page ad2-page pearl-page">
    <header className="ad2-hero">
      <picture className="ad2-hero-art" aria-hidden="true"><source media="(max-width: 700px)" srcSet="/astro-dice/hero-mobile.webp"/><img src="/astro-dice/hero-desktop.webp" alt=""/></picture>
      <div className="ad2-hero-panel">
        <span className="ad2-crest" aria-hidden="true"/>
        <p className="ad2-kicker">astro dice atelier</p>
        <h1>星骰占星</h1>
        <p>三顆星骰，把一個問題拆成「核心能量、表現方式、生活領域」，照見此刻最值得留意的方向。</p>
        <a href="#astro-ritual" className="ad2-cta">開始擲星骰 <span aria-hidden="true">↓</span></a>
      </div>
    </header>

    <section className="ad2-ritual" id="astro-ritual" ref={ritualRef} aria-labelledby="ad2-title">
      <div className="ad2-layout">
        <div className="ad2-form">
          <p className="ad2-kicker small">the casting table</p>
          <h2 id="ad2-title">這次想探索什麼？</h2>
          <ol className="ad2-steps" aria-label="星骰進度">
            {["選主題","寫問題","擲星骰","記錄感受"].map((label,index)=>{const state=index<step?"done":index===step?"current":"todo";return <li key={label} className={state} aria-current={state==="current"?"step":undefined}><span aria-hidden="true">{state==="done"?"✓":state==="current"?"●":"○"}</span>{label}</li>})}
          </ol>
          <div className="ad2-chips" role="group" aria-label="問題主題">{categories.map(item=><button key={item} type="button" className={category===item?"selected":""} aria-pressed={category===item} disabled={locked} onClick={()=>setCategory(item)}>{item}</button>)}</div>
          <label className="ad2-label" htmlFor="astro-question">寫下妳想問的問題</label>
          <textarea id="astro-question" ref={questionRef} rows={2} maxLength={180} value={question} disabled={locked} onChange={event=>setQuestion(event.target.value)} placeholder="例如：我在目前的工作方向裡，最需要留意什麼？"/>
          <div className="ad2-under-input"><span>{question.trim()?"問題已準備好，可以擲骰。":"先寫下一個想問的問題。"}</span><small>{question.length} / 180</small></div>
          {!locked&&<details className="ad2-ideas" open={ideasOpen} onToggle={event=>setIdeasOpen((event.currentTarget as HTMLDetailsElement).open)}>
            <summary>不知道怎麼問？選一個範例</summary>
            <div>{questionIdeas[category].map(idea=><button type="button" key={idea} onClick={()=>chooseIdea(idea)}>{idea}</button>)}</div>
          </details>}
          {reading&&<p className="ad2-locked-note">這次的問題已鎖定，想問別的事請按「換一個問題」。</p>}
        </div>

        <div className="ad2-stage-card">
          <div ref={stageRef} className={`ad2-stage ${rolling?"is-rolling":""}`}>
            <div className="ad2-dice">{dice.map(([type,item],index)=><Die key={type} type={type} item={item} rolling={rolling} index={index}/>)}</div>
          </div>
          <button type="button" className="ad2-cast" disabled={!question.trim()||busy} onClick={cast}>{busy?"星骰正在轉動…":roll?"再擲一次 ✦":"擲出三顆星骰 ✦"}</button>
          <p className="ad2-hint" aria-live="polite">{busy?"讓問題在心裡停留一下。":roll?`${roll.planet.name} × ${roll.sign.name} × ${roll.house.name}`:question.trim()?"依序讀取：核心能量 → 表現方式 → 生活領域":"先寫下問題，就可以擲骰。"}</p>
        </div>
      </div>
    </section>

    {reading&&roll&&specific&&<section className="ad2-result" id="astro-result" ref={resultRef} aria-labelledby="ad2-result-title">
      <span className="ad2-result-crest" aria-hidden="true"/>
      <p className="ad2-kicker small">your astro dice message · {reading.category}</p>
      <h2 id="ad2-result-title" tabIndex={-1}><span>{roll.planet.name}</span> × <span>{roll.sign.name}</span> × <span>{roll.house.name}</span></h2>
      <p className="ad2-question">「{reading.question}」</p>
      <div className="ad2-mini" aria-label="三顆星骰">{dice.map(([type,item])=><div key={type}><span className="ad2-cartouche" aria-hidden="true"><Glyph item={item!} type={type}/></span><small>{dieLabels[type].name}</small><b>{item!.name}</b></div>)}</div>
      <article className="ad2-block lead"><h3>整體訊息</h3><p>{synthesis}</p></article>
      <article className="ad2-block"><h3>目前狀況</h3><p>{specific.current}</p></article>
      <article className="ad2-block"><h3>需要留意</h3><p>{specific.friction}</p></article>
      <article className="ad2-block"><h3>今天可以做什麼</h3><p>{specific.action}</p></article>
      <details className="ad2-more">
        <summary>完整星骰解析</summary>
        <div className="ad2-more-body">
          {dice.map(([type,item])=><article key={type}><span className="ad2-cartouche" aria-hidden="true"><Glyph item={item!} type={type}/></span><div><small>{dieLabels[type].name} · {dieLabels[type].role}</small><h4>{item!.name}</h4><p>{item!.meaning}</p><b>{item!.prompt}</b></div></article>)}
          <p className="ad2-lead-note">{categoryLead[reading.category]}</p>
        </div>
      </details>
      <div className="ad2-reflect">
        <h3>給自己的覺察題</h3>
        <p>{specific.reflection}</p>
        <label htmlFor="astro-note">寫下此刻浮現的答案</label>
        <textarea id="astro-note" maxLength={600} value={note} disabled={savedId!==null} onChange={event=>setNote(event.target.value)} placeholder="我第一個想到的是……"/>
        <button type="button" className="ad2-save" disabled={savedId!==null} onClick={save}>{savedId!==null?"已儲存 ✓":"儲存這次星骰紀錄"}</button>
        {savedId!==null&&<div className="ad2-saved" role="status"><p>這次星骰結果已保存 ✨</p><button type="button" onClick={viewRecord}>查看我的星骰紀錄</button></div>}
        {saveError&&<p className="ad2-save-error" role="alert">目前未能儲存，請確認瀏覽器允許網站儲存資料；妳寫的內容都還在。</p>}
      </div>
      <div className="ad2-result-actions"><button type="button" onClick={newQuestion}>換一個問題</button><Link href="/#draw">搭配塔羅再深入一步 →</Link></div>
      <p className="ad2-disclaimer">星骰提供象徵式自我探索，不是科學測量或確定預言；健康、法律、投資、安全與生死相關事項，請以專業資訊為準。</p>
    </section>}

    <section className="ad2-folds">
      <details className="ad2-fold" id="astro-records" open={historyOpen} onToggle={event=>setHistoryOpen((event.currentTarget as HTMLDetailsElement).open)}>
        <summary><span>我的星骰紀錄</span><small>{history.length?`共 ${history.length} 筆`:"還沒有紀錄"}</small></summary>
        {history.length?<div className="ad2-history">{history.map(item=><article key={item.id} id={`astro-entry-${item.id}`} className={highlightId===item.id?"is-new":""}><div><span>{item.category}</span><time>{new Date(item.created_at).toLocaleString("zh-TW")}</time></div><h3>{item.question}</h3><b>{item.planet_name} × {item.sign_name} × {item.house_name}</b>{item.note&&<p>{item.note}</p>}</article>)}</div>:<p className="ad2-fold-note">完成並儲存第一次星骰後，紀錄會出現在這裡。紀錄只存在這台裝置。</p>}
      </details>
      <details className="ad2-fold">
        <summary><span>星骰怎麼看</span><small>使用指南</small></summary>
        <div className="ad2-guide">
          <article><b>行星骰</b><p>正在發生什麼、核心動力是什麼。</p></article>
          <article><b>星座骰</b><p>這股能量會用什麼方式展開。</p></article>
          <article><b>宮位骰</b><p>事情主要落在哪個生活領域。</p></article>
          <article><b>一次問一件事</b><p>與其問「他一定會回來嗎」，更適合問「這段互動目前的課題是什麼？」結果提供觀察角度，不代替事實、界線與妳真正要做的決定。</p></article>
        </div>
      </details>
    </section>
    <footer className="ad2-footer"><p>不是把答案交給星空，而是借一點星光，看清自己的下一步。</p><Link href="/">返回塔羅抽牌首頁</Link></footer>
  </main>;
}
