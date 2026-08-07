"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "./yuanchen.css";

type View = "door"|"theme"|"explore"|"result"|"card"|"records";
type Answers = Record<string,string>;
type HealingCard = {name:string;meaning:string;direction:string;action:string};
type Result = {climate:string;focus:string;relationship:string;work:string;need:string;power:string;actions:string[];message:string};
type RecordItem = {id:string;date:string;theme:string;answers:Answers;result:Result;card:HealingCard|null};
type Space = {id:string;no:string;name:string;symbol:string;question:string;options:string[];other:string;image:string;guide?:string;extraQ?:string;extra:string[];textQ?:string};

const PROGRESS="zolacoco-yuanchen-progress-v1", RECORDS="zolacoco-yuanchen-records-v1";
const themes=["整體生活狀態","感情與關係","工作與人生方向","金錢與安全感","情緒與內在狀態","我還不確定，想自由探索"];
const spaces:Space[]=[
 {id:"entrance",no:"第一站",name:"門與庭院",symbol:"面對生活的方式、行動力，以及與外在世界的距離。",question:"你第一眼看見的入口，比較接近哪一種狀態？",options:["門敞開著，光線明亮","門半開著，我有點猶豫","門關著，但可以找到鑰匙","門被植物或物品遮住","我看不清楚入口","我感受到其他畫面"],other:"我感受到其他畫面",guide:"入口沒有好壞，它比較像你此刻面對外界與新選擇的方式。",extra:[],image:"/yuanchen/door.webp"},
 {id:"living",no:"第二站",name:"客廳",symbol:"人際互動、對外呈現的自己，以及是否感受到被理解。",question:"這個客廳帶給你什麼感覺？",options:["溫暖，有人陪伴","整齊，但有點安靜","很多人，卻讓我感到疲累","堆滿東西，沒有休息空間","空蕩，像很久沒有人來","其他感受"],other:"其他感受",extraQ:"最近的你，在別人面前比較像哪一種狀態？",extra:["自然做自己","努力照顧每個人的感受","表面沒事，心裡其實很累","不太想被別人靠近","很希望有人真正理解我"],image:"/yuanchen/living.webp"},
 {id:"bedroom",no:"第三站",name:"臥室",symbol:"安全感、休息、親密關係與不容易被別人看見的情緒。",question:"走進臥室後，你最先注意到什麼？",options:["床與被子","窗戶與光線","鏡子","沒有收好的物品","緊閉的門","一個空著的位置","其他畫面"],other:"其他畫面",extraQ:"最近的你，有真正休息到嗎？",extra:["有，我能安心放鬆","身體休息了，腦袋沒有","很疲累，卻一直撐著","只有一個人時才敢表現情緒","我不知道怎麼讓自己停下來"],image:"/yuanchen/bedroom.webp"},
 {id:"kitchen",no:"第四站",name:"廚房",symbol:"日常照顧、能量來源、付出與接收。",question:"這個廚房目前比較接近什麼狀態？",options:["有溫暖的食物與香氣","材料很多，但不知道要做什麼","很乾淨，卻沒有生活感","堆著需要清理的東西","缺少需要的物品","有人在替我準備食物","其他畫面"],other:"其他畫面",extraQ:"你最近把最多能量放在哪裡？",extra:["照顧別人","工作與責任","感情關係","解決金錢問題","壓抑自己的情緒","重新照顧自己"],image:"/yuanchen/kitchen.webp"},
 {id:"study",no:"第五站",name:"書房",symbol:"思考、學習、工作方向、計畫與未完成的事情。",question:"書房裡哪個畫面最吸引你？",options:["一本打開的書","一封還沒拆開的信","堆滿文件的桌面","空白紙張與一支筆","上鎖的抽屜","通往外面的窗戶","其他畫面"],other:"其他畫面",textQ:"此刻最需要被釐清的是什麼？",extra:[],image:"/yuanchen/study.webp"},
 {id:"garden",no:"第六站",name:"花園與水源",symbol:"生命力、情緒流動、關係滋養與未來希望。",question:"你看見的花園比較接近哪一種狀態？",options:["花朵正在盛開","有新芽正在生長","土地乾燥，需要澆水","植物太茂密，需要整理","有一部分正在凋謝","看見水池、噴泉或流水","其他畫面"],other:"其他畫面",guide:"花園不是命運的結果，而是在提醒你，哪些部分需要澆水，哪些部分可以修剪。",extra:[],image:"/yuanchen/garden.webp"},
];
const cards:HealingCard[]=[
 {name:"打開窗戶",meaning:"讓停滯的感受有一個出口。",direction:"把沒有說完、也沒有被承認的感受寫下來。",action:"選一個房間開窗十分鐘，也替自己寫下三句真實感受。"},
 {name:"點亮燭火",meaning:"你不需要一次照亮整條路。",direction:"先看清楚最靠近自己的那一步。",action:"今晚關掉多餘通知，留十五分鐘完成一件最小的事。"},
 {name:"整理書桌",meaning:"清楚，常從減少眼前的雜訊開始。",direction:"把責任分成現在、稍後與不屬於你。",action:"整理一個桌面區域，並刪掉待辦清單上一件不必要的事。"},
 {name:"澆灌花園",meaning:"生命力需要穩定滋養，而不是勉強撐住。",direction:"把能量留給真正會回應你的地方。",action:"選一件讓身體舒服的小事，連續做七天，每次十分鐘。"},
 {name:"修復門鎖",meaning:"界線不是拒絕世界，而是決定如何讓人靠近。",direction:"重新確認一段關係或責任的範圍。",action:"練習說出一句清楚的界線：我現在能做到的是……。"},
 {name:"清理舊物",meaning:"有些東西完成過任務，現在可以放下。",direction:"辨認反覆消耗卻不再支持你的習慣。",action:"丟棄、捐出或封存三件不再需要的物品。"},
 {name:"留下空位",meaning:"空白不是失去，而是讓新安排有地方發生。",direction:"停止用忙碌填滿每一段時間。",action:"本週保留一個不安排任務的三十分鐘空檔。"},
 {name:"重新布置房間",meaning:"你可以改變與日常相處的方式。",direction:"從一個看得見的小改變找回主動感。",action:"移動一件家具或換一處擺設，讓空間更符合現在的你。"},
 {name:"坐下來休息",meaning:"休息不是等一切完成後才配得到。",direction:"先停止過度消耗，再決定下一步。",action:"安排一次二十分鐘、沒有手機也沒有任務的完整休息。"},
 {name:"歡迎新的光進來",meaning:"你仍有能力接住新的可能。",direction:"鬆開只有一種答案的想像。",action:"寫下三種可行選擇，並向一位可信任的人詢問現實資訊。"},
];
const dateLabel=()=>new Intl.DateTimeFormat("zh-TW",{year:"numeric",month:"long",day:"numeric"}).format(new Date());
const makeId=()=>globalThis.crypto?.randomUUID?.()??`yc-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
const includesAny=(value:string,words:string[])=>words.some(w=>value.includes(w));
const sceneSymbols:Record<string,{mark:string;label:string;meaning:string}[]>={
 entrance:[{mark:"龍",label:"龍紋",meaning:"守護與重新拿回主導權"},{mark:"門",label:"宮門",meaning:"你如何靠近新的選擇"},{mark:"蓮",label:"蓮燈",meaning:"在混亂裡仍保留清明"}],
 living:[{mark:"鳳",label:"鳳紋",meaning:"關係中的交流與回應"},{mark:"席",label:"座席",meaning:"你是否為自己留下位置"},{mark:"燈",label:"宮燈",meaning:"被理解時產生的溫度"}],
 bedroom:[{mark:"月",label:"月窗",meaning:"不容易說出口的感受"},{mark:"鏡",label:"銅鏡",meaning:"你如何看待此刻的自己"},{mark:"榻",label:"臥榻",meaning:"休息、安全感與親密需要"}],
 kitchen:[{mark:"火",label:"爐火",meaning:"維持日常的生命能量"},{mark:"穀",label:"穀甕",meaning:"可使用的資源與安全感"},{mark:"水",label:"清水",meaning:"最基本、卻容易忽略的照顧"}],
 study:[{mark:"卷",label:"書卷",meaning:"正在形成的方向與理解"},{mark:"筆",label:"紙筆",meaning:"可以重新書寫的選擇"},{mark:"印",label:"印匣",meaning:"尚未確認的承諾與計畫"}],
 garden:[{mark:"蓮",label:"蓮花",meaning:"穿過混亂後仍保有的生命力"},{mark:"水",label:"水源",meaning:"情緒能否自然流動"},{mark:"芽",label:"新芽",meaning:"還很小、但已經開始的希望"}],
};
function reflectionFor(id:string,answer:string){
 if(includesAny(answer,["敞開","明亮","溫暖","盛開","新芽","流水","食物與香氣"]))return "這份明亮目前由什麼支持？想一想，你可以怎麼繼續保留它，而不是等到耗盡才注意。";
 if(includesAny(answer,["半開","猶豫","看不清","不知道","不確定"]))return "你不需要立刻做決定。此刻更值得問的是：還缺少哪一項現實資訊，或哪一份安全感？";
 if(includesAny(answer,["關","上鎖","緊閉","不想被"]))return "關上的地方不一定代表拒絕，也可能正在保護你。它需要的是更安全的靠近，還是一條更清楚的界線？";
 if(includesAny(answer,["堆","遮","茂密","沒收好"]))return "先別急著一次清空。若只能移開一樣東西，哪一件最能替你騰出呼吸的空間？";
 if(includesAny(answer,["空蕩","空著","缺少","乾燥","凋謝","沒有生活感"]))return "空缺不是壞預兆，而是需要的線索。你最希望補回的是陪伴、休息、資源，還是生活的溫度？";
 if(includesAny(answer,["疲累","撐著","壓抑","照顧別人","工作與責任"]))return "你已經付出很多。若今天少承擔一件事，哪一件最不會傷害真正重要的關係與責任？";
 return `先停在「${answer}」這個畫面。它讓你想到最近哪一件真實發生的事？`;
}
function makeResult(theme:string,a:Answers):Result{
 const entrance=a.entrance||"", living=a.living||"", social=a["living-extra"]||"", bedroom=a.bedroom||"", rest=a["bedroom-extra"]||"", kitchen=a.kitchen||"", energy=a["kitchen-extra"]||"", study=a.study||"", clarity=a["study-text"]||"", garden=a.garden||"";
 const guarded=includesAny(entrance,["關","遮","看不清","猶豫"]), tired=includesAny(living+social+rest,["疲累","沒事","撐著","不想被","腦袋沒有","停下來"]), clutter=includesAny(kitchen+study,["堆","不知道","缺少","上鎖","沒收好"]), growing=includesAny(garden,["盛開","新芽","流水"]);
 const focus=tired?"臥室":clutter?"書房與廚房":guarded?"門與庭院":includesAny(garden,["乾燥","茂密","凋謝"])?"花園與水源":"客廳";
 return {
  climate:tired?`這次以「${theme}」走進房子，你的內在像一個仍亮著燈、但需要安靜下來的夜晚。你不是沒有力量，而是心與身體都在提醒：不能再只靠撐住。${a["bedroom-reflection"]?` 你也留下了：「${a["bedroom-reflection"]}」。這是值得被放進真實生活裡照顧的訊息。`:""}`:guarded?`這次的內在氣候帶著觀察與保留。入口呈現「${entrance}」，像是你正在確認安全、時機與方向；慢一點並不是退縮，而是需要更清楚的選擇。${a["entrance-reflection"]?` 你想到的「${a["entrance-reflection"]}」，可以成為下一步判斷的線索。`:""}`:`這座房子仍有流動的光。你看見「${entrance}」，也在花園感受到「${garden}」，顯示你正準備用更貼近自己的方式重新安排生活。`,
  focus:`目前最值得先整理的是${focus}。${focus.includes("臥室")?`你提到「${rest}」，休息與安全感需要被排進真實行程，而不只是等忙完再說。`:focus.includes("書房")?`「${clarity||study}」是重要線索；先把問題縮成一個可處理的決定。`:focus.includes("門")?"先確認哪些門想打開、哪些界線仍需保留，不必同時回應所有邀請。":"從滋養與修剪開始，觀察什麼讓你恢復，什麼持續消耗。"}`,
  relationship:includesAny(living+social,["陪伴","做自己"])?`客廳裡的「${living}」提醒你：關係中仍有能被接住的部分。接下來可以更直接說出需要，而不是只靠對方猜。`:`客廳讓你感受到「${living}」，而你在人前較像「${social}」。這不是關係好壞的預言，而是在提醒你：被理解之前，也需要讓真實狀態有機會被看見。`,
  work:`書房最吸引你的是「${study}」。${clarity?`你想釐清的是：「${clarity}」。`:"目前不必一次完成所有計畫。"} 廚房同時顯示「${kitchen}」，工作方向需要和可用的時間、體力及資源一起評估。`,
  need:tired?"你可能忽略的不是更多方法，而是不用表現沒事的空間，以及真正不被打斷的休息。":energy?`你把許多能量放在「${energy}」。此刻需要補回的是能接收支持、也能保留自己份量的日常。`:"你可能需要更清楚的優先順序，讓重要的事有位置，也讓不必要的責任離開。",
  power:growing?`花園裡的「${garden}」是你仍然擁有的力量：你可以恢復、學習，也能讓新的選擇慢慢長出來。`:`即使花園呈現「${garden}」，你仍看見並說出了它。辨認需要整理之處，本身就是把主動權帶回來的開始。`,
  actions:[guarded?"選一件猶豫中的事，只蒐集一項能幫助判斷的現實資訊。":"替一個想開始的選擇安排二十分鐘。",tired?"本週固定一次二十分鐘無通知休息，休息前不需先完成工作。":`針對「${energy||"目前最消耗的事"}」刪減一項非必要付出。`,clutter?"清空一小塊桌面，將待辦分成今天、這週與可以放下。":"主動向一位可信任的人說出一個具體需要。"],
  message:a["garden-reflection"]?`你已經為自己說出：「${a["garden-reflection"]}」。接下來不用一次做到完美，只要讓這句話有一個小小的行動。`:tired?"你不必證明自己還能撐；讓真正的需要被看見，就是今晚推開的第一扇門。":guarded?"可以慢慢開門。先確認這一步尊重你的感受，也符合現實。":"房子裡仍有光，而你正在學會把它留給真正重要的地方。"
 };
}

export default function Yuanchen(){
 const [view,setView]=useState<View>("door"),[theme,setTheme]=useState(""),[index,setIndex]=useState(0),[answers,setAnswers]=useState<Answers>({}),[records,setRecords]=useState<RecordItem[]>([]),[result,setResult]=useState<Result|null>(null),[card,setCard]=useState<HealingCard|null>(null),[resume,setResume]=useState(false),[opening,setOpening]=useState(false),[selectedRecord,setSelectedRecord]=useState<RecordItem|null>(null);
 const [musicPlaying,setMusicPlaying]=useState(false);
 const musicFrame=useRef<HTMLIFrameElement|null>(null);
 const space=spaces[index];
 useEffect(()=>{try{setRecords(JSON.parse(localStorage.getItem(RECORDS)||"[]"));if(new URLSearchParams(window.location.search).get("records")==="1"){setView("records");return}const p=JSON.parse(localStorage.getItem(PROGRESS)||"null");if(p?.theme&&p?.view!=="result"&&p?.view!=="card")setResume(true)}catch{}},[]);
 useEffect(()=>{if(!theme||view==="result"||view==="card"||view==="records")return;try{localStorage.setItem(PROGRESS,JSON.stringify({view,theme,index,answers}))}catch{}},[view,theme,index,answers]);
 const canContinue=!!answers[space?.id]&&(!space?.extraQ||!!answers[`${space.id}-extra`])&&(!space?.textQ||!!answers[`${space.id}-text`]);
 function setMusic(playing:boolean){musicFrame.current?.contentWindow?.postMessage(JSON.stringify({event:"command",func:playing?"playVideo":"pauseVideo",args:[]}),"*");setMusicPlaying(playing)}
 function begin(){setMusic(true);setOpening(true);setTimeout(()=>{setOpening(false);setView("theme")},850)}
 function chooseTheme(t:string){setMusic(true);setTheme(t);setView("explore");setIndex(0)}
 function continueSaved(){try{const p=JSON.parse(localStorage.getItem(PROGRESS)||"null");if(p){setTheme(p.theme);setIndex(p.index||0);setAnswers(p.answers||{});setView("explore")}}catch{}setResume(false)}
 function restart(){if(view!=="door"&&!window.confirm("要重新開始這次探索嗎？目前尚未完成的內容會被清除。"))return;localStorage.removeItem(PROGRESS);setTheme("");setAnswers({});setIndex(0);setResult(null);setCard(null);setSelectedRecord(null);setResume(false);setView("door");window.scrollTo(0,0)}
 function next(){if(index<spaces.length-1){setIndex(index+1);window.scrollTo(0,0)}else{const r=makeResult(theme,answers);setResult(r);setView("result");localStorage.removeItem(PROGRESS);window.scrollTo(0,0)}}
 function drawCard(){const seed=Object.values(answers).join("").length+new Date().getMilliseconds();setCard(cards[seed%cards.length]);setView("card");window.scrollTo(0,0)}
 function saveRecord(){if(!result||!card)return;const item:RecordItem={id:makeId(),date:dateLabel(),theme,answers,result,card};const next=[item,...records];setRecords(next);localStorage.setItem(RECORDS,JSON.stringify(next));setSelectedRecord(item);setView("records");void fetch("/api/activity",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({type:"yuanchen",title:"元辰宮完整探索",summary:`${theme}・${result.focus}・${card.name}`,details:item})})}
 function removeRecord(id:string){if(!window.confirm("確定要刪除這一筆元辰宮紀錄嗎？刪除後無法復原。"))return;const next=records.filter(r=>r.id!==id);setRecords(next);localStorage.setItem(RECORDS,JSON.stringify(next));if(selectedRecord?.id===id)setSelectedRecord(null)}
 const display=selectedRecord?.result||result;
 return <main className={`yc-page yc-${view} ${opening?"is-opening":""}`}>
  <header><a className="yc-brand" href="/">ZOLACOCO <span>TAROT</span></a><nav><button className="yc-music-toggle" aria-pressed={musicPlaying} onClick={()=>setMusic(!musicPlaying)}>{musicPlaying?"暫停音樂":"播放音樂"}</button><a className="yc-home-return" href="/">← 回到最初選單</a><a href="/healing-room">療癒小房間</a><button onClick={()=>{setSelectedRecord(null);setView("records")}}>療癒紀錄 <i>{records.length}</i></button></nav></header>
  <div className="yc-audio-only" aria-hidden="true"><iframe ref={musicFrame} src="https://www.youtube-nocookie.com/embed/MRQsx1-_1jc?enablejsapi=1&playsinline=1&loop=1&playlist=MRQsx1-_1jc&controls=0&rel=0" title="元辰宮沉浸音樂" allow="autoplay; encrypted-media" referrerPolicy="strict-origin-when-cross-origin" tabIndex={-1}/></div>
  {resume&&<div className="yc-modal"><section><small>YOUR JOURNEY IS STILL HERE</small><h2>上次走到一半的房子，還替你留著燈。</h2><p>你可以從原本的空間繼續，也可以重新推開門。</p><div><button className="yc-primary" onClick={continueSaved}>繼續上次探索</button><button onClick={restart}>重新開始</button></div></section></div>}
  {view==="door"&&<section className="yc-door-screen"><div className="yc-door-art"><div className="yc-temple-gate" aria-hidden="true"><img className="yc-gate-scene" src="/yuanchen/gate-comic.png" alt=""/><span className="yc-gate-light"/><div className="yc-door-leaf yc-door-left"><img src="/yuanchen/gate-comic.png" alt=""/></div><div className="yc-door-leaf yc-door-right"><img src="/yuanchen/gate-comic.png" alt=""/></div></div></div><div className="yc-door-copy"><small>YUAN CHEN INNER HOUSE</small><h1>這座房子，<br/>映照著此刻的你</h1><p>不用急著尋找吉凶。慢慢走進去，看看哪個地方最吸引你的注意。</p><button className="yc-primary" onClick={begin}>準備好了，開啟宮門 <b>→</b></button><button className="yc-text" onClick={()=>setView("records")}>查看我的元辰宮紀錄</button></div></section>}
  {view==="theme"&&<section className="yc-paper"><button className="yc-back" onClick={()=>setView("door")}>← 回到門前</button><small>BEFORE WE ENTER</small><h1>這一次，你最想整理哪個部分？</h1><p>不用選最嚴重的，只要選此刻最想靠近的地方。</p><div className="yc-options">{themes.map((t,i)=><button key={t} onClick={()=>chooseTheme(t)}><i>{String(i+1).padStart(2,"0")}</i><span>{t}</span><b>→</b></button>)}</div></section>}
  {view==="explore"&&space&&<section key={space.id} className="yc-space"><div className="yc-scene" style={{backgroundImage:`url('${space.image}')`}}><div className="yc-scene-vignette"/><div className="yc-scene-copy"><small>{space.no} · {index+1} / {spaces.length}</small><h1>{space.name}</h1><p>{space.symbol}</p><div className="yc-symbol-row" aria-label={`${space.name}的象徵物件`}>{sceneSymbols[space.id].map(item=><span key={item.label}><i>{item.mark}</i><b>{item.label}</b><em>{item.meaning}</em></span>)}</div></div></div><div className="yc-question"><div className="yc-progress"><button onClick={()=>index?setIndex(index-1):setView("theme")}>← 上一個空間</button><span>{index+1} / {spaces.length}</span></div><div className="yc-line"><i style={{width:`${(index+1)/spaces.length*100}%`}}/></div><small>FOLLOW YOUR FIRST IMPRESSION</small><h2>{space.question}</h2><p className="yc-question-lead">先看畫面，再選最靠近第一直覺的一項。這裡沒有標準答案。</p><div className="yc-options">{space.options.map((o,i)=><button className={answers[space.id]===o?"active":""} key={o} onClick={()=>setAnswers({...answers,[space.id]:o})}><i>{String(i+1).padStart(2,"0")}</i><span>{o}</span><b>{answers[space.id]===o?"✓":""}</b></button>)}</div>{answers[space.id]&&<div className="yc-guided-reflection"><small>象徵提醒・不是吉凶判斷</small><p>{reflectionFor(space.id,answers[space.id])}</p><label htmlFor={`${space.id}-reflection`}>如果願意，再替自己留下一句</label><textarea id={`${space.id}-reflection`} value={answers[`${space.id}-reflection`]||""} onChange={e=>setAnswers({...answers,[`${space.id}-reflection`]:e.target.value})} placeholder="這個畫面讓我想到……（可略過）"/></div>}{answers[space.id]===space.other&&<textarea value={answers[`${space.id}-other`]||""} onChange={e=>setAnswers({...answers,[`${space.id}-other`]:e.target.value})} placeholder="把你看見或感受到的畫面寫下來……"/>}{space.extraQ&&<><h3>{space.extraQ}</h3><div className="yc-options compact">{space.extra.map((o,i)=><button className={answers[`${space.id}-extra`]===o?"active":""} key={o} onClick={()=>setAnswers({...answers,[`${space.id}-extra`]:o})}><i>{String(i+1).padStart(2,"0")}</i><span>{o}</span><b>{answers[`${space.id}-extra`]===o?"✓":""}</b></button>)}</div></>}{space.textQ&&<><h3>{space.textQ}</h3><textarea value={answers[`${space.id}-text`]||""} onChange={e=>setAnswers({...answers,[`${space.id}-text`]:e.target.value})} placeholder="不用寫得完整，先留下最想釐清的核心……"/></>}{space.guide&&<blockquote>{space.guide}</blockquote>}<div className="yc-actions"><button onClick={()=>index?setIndex(index-1):setView("theme")}>← 上一步</button><a className="yc-exit" href="/">回到最初選單</a><button className="yc-primary" disabled={!canContinue} onClick={next}>{index===5?"完成探索":"繼續探索"} →</button></div></div></section>}
  {view==="result"&&result&&<ResultView result={result} theme={theme}><button className="yc-primary yc-wide" onClick={drawCard}>抽取一張空間療癒牌 →</button></ResultView>}
  {view==="card"&&result&&card&&<><ResultView result={result} theme={theme}/><section className="yc-healing-card"><small>SPACE HEALING CARD</small><h2>你的空間療癒牌</h2><article><div><span>◆</span><h3>{card.name}</h3></div><dl><dt>象徵意義</dt><dd>{card.meaning}</dd><dt>此刻整理方向</dt><dd>{card.direction}</dd><dt>七天內的小行動</dt><dd>{card.action}</dd></dl></article><p className="yc-card-guide">儲存後會直接開啟這次的完整紀錄。之後也能從頁面上方的「療癒紀錄」再次找到。</p><button className="yc-primary yc-wide" onClick={saveRecord}>儲存並查看這次療癒紀錄</button><div className="yc-card-routes"><button onClick={()=>setView("records")}>查看過往療癒紀錄</button><a href="/healing-room">回到療癒小房間</a></div></section><ServiceCard/></>}
  {view==="records"&&<section className="yc-records"><button className="yc-back light" onClick={()=>setView("door")}>← 回到元辰宮</button><small>MY HEALING RECORDS</small><h1>我的療癒紀錄</h1><p>完整探索會保存在這個裝置上，重新整理後仍然可以回來查看。</p>{selectedRecord?<><div className="yc-answer-log"><small>{selectedRecord.date} · {selectedRecord.theme}</small><h2>六個空間的探索選擇</h2>{spaces.map(s=><article key={s.id}><b>{s.name}</b><p>{selectedRecord.answers[s.id]||"—"}{selectedRecord.answers[`${s.id}-other`]? `｜${selectedRecord.answers[`${s.id}-other`]}`:""}</p>{selectedRecord.answers[`${s.id}-extra`]&&<p>延伸感受｜{selectedRecord.answers[`${s.id}-extra`]}</p>}{selectedRecord.answers[`${s.id}-text`]&&<p>寫下的內容｜{selectedRecord.answers[`${s.id}-text`]}</p>}</article>)}</div><ResultView result={selectedRecord.result} theme={selectedRecord.theme}/>{selectedRecord.card&&<div className="yc-record-card"><b>空間療癒牌｜{selectedRecord.card.name}</b><p>{selectedRecord.card.meaning}</p><p>七天行動｜{selectedRecord.card.action}</p></div>}<div className="yc-actions"><button onClick={()=>setSelectedRecord(null)}>← 返回紀錄列表</button><button onClick={()=>removeRecord(selectedRecord.id)}>刪除紀錄</button></div></>:records.length?<div className="yc-record-list">{records.map(r=><article key={r.id}><small>{r.date}</small><h2>{r.theme}</h2><p>最需要整理｜{r.result.focus}</p><b>{r.card?.name||"尚未抽牌"}</b><div><button onClick={()=>setSelectedRecord(r)}>查看完整紀錄</button><button onClick={()=>{setTheme(r.theme);setAnswers({});setIndex(0);setView("explore")}}>重新探索</button><button onClick={()=>removeRecord(r.id)}>刪除</button></div></article>)}</div>:<div className="yc-empty"><span>⌂</span><h2>還沒有元辰宮紀錄</h2><p>完成六個空間與療癒牌後，紀錄會收藏在這裡。</p><button className="yc-primary" onClick={()=>setView("door")}>開始第一次探索</button></div>}</section>}
  <aside className="yc-disclaimer">元辰宮內容屬於象徵式內在探索，幫助你整理感受與生活狀態，不取代醫療、心理、法律或財務等專業建議。</aside>
 </main>
}

function ResultView({result,theme,children}:{result:Result;theme:string;children?:React.ReactNode}){const items=[["01","此刻整體的內在氣候",result.climate],["02","目前最需要整理的空間",result.focus],["03","感情與關係狀態的象徵提醒",result.relationship],["04","工作與生活能量的象徵提醒",result.work],["05","目前可能被忽略的需要",result.need],["06","現在仍然擁有的力量",result.power]];return <section className="yc-result-sheet"><small>MY YUAN CHEN INNER HOUSE · {theme}</small><h1>你看見的不是吉凶，<br/>而是此刻的心正在說話</h1><div className="yc-result-grid">{items.map(x=><article key={x[0]}><i>{x[0]}</i><div><h2>{x[1]}</h2><p>{x[2]}</p></div></article>)}</div><article className="yc-seven"><span>07</span><div><h2>接下來七天可以完成的三個小行動</h2><ol>{result.actions.map(a=><li key={a}>{a}</li>)}</ol></div></article><blockquote>「{result.message}」</blockquote><footer><p>房子不需要一次整理完。<br/>先從最讓你在意的地方，替自己騰出一點空間。</p>{children}</footer></section>}
function ServiceCard(){return <section className="yc-service"><small>DEEPER PERSONAL EXPLORATION</small><h2>想更深入走進自己的元辰宮？</h2><p>如果你正處於感情拉扯、工作停滯、情緒混亂或人生轉換期，可以預約 Zola 的「元辰宮深度探索」，依照你的真實狀況，陪你整理每個空間的象徵與目前需要面對的課題。</p><div className="yc-service-columns"><article><h3>元辰宮深度探索｜60分鐘</h3><ul><li>探索元辰宮整體氛圍與六個空間</li><li>整理一項最需要面對的核心課題</li><li>提供未來七天可實行的調整方向</li><li>服務後提供一份簡短文字摘要</li></ul></article><article><h3>適合現在的你，如果——</h3><ul><li>生活卡住，卻說不出問題在哪裡</li><li>在感情或工作中反覆消耗</li><li>正處於轉職、分手、搬家或人生轉換期</li><li>希望得到具體整理方向，而不只是吉凶答案</li></ul></article></div><p className="yc-service-note">本服務以象徵式引導與自我探索為主，不保證改運、招財、復合或任何特定結果，也不取代醫療及心理專業服務。</p><a className="yc-primary" href="https://www.instagram.com/zolacoco_tarot" target="_blank" rel="noreferrer">預約元辰宮深度探索 ↗</a></section>}
