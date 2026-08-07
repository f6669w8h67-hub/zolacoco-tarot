"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";

type Result = "yes" | "no" | "unclear";
type ModeKey = "general" | "higher" | "subconscious";
type CategoryKey = "love" | "work" | "people" | "self" | "today";
type Picker = "mode" | "category" | null;
type ToolKey = "yesno" | "choices" | "number" | "letter" | "percentage" | "energy" | "chakra" | "crystal" | "action" | "avoid" | "direction" | "color" | "luckyNumber" | "element" | "oil" | "meditation" | "message" | "custom" | "food" | "drink" | "outfit" | "outing" | "home";
type PendulumStyle = "teal" | "clear" | "rose" | "amethyst" | "citrine" | "aquamarine" | "moonstone" | "labradorite" | "obsidian" | "brass" | "silver" | "wood";
type Soundscape = "forest" | "cafe" | "meditation";
type Viewer = { displayName: string; email: string; isAdmin: boolean };
type Entry = { id:number; question:string; result:string; result_label:string; category:string; note:string; created_at:string };
type Outcome = { resultKey:Result; result:string; label:string; en:string; detail:string; reflection:string; accent?:string };

const modes = [
  { key:"general" as const, icon:"✦", label:"一般模式", en:"GENERAL", description:"用清楚、中性的方式整理當下方向。" },
  { key:"higher" as const, icon:"☉", label:"高靈模式", en:"HIGHER SELF", description:"依個人信念，將答案視為一段儀式性訊息。" },
  { key:"subconscious" as const, icon:"☾", label:"潛意識模式", en:"SUBCONSCIOUS", description:"觀察答案出現時，你最先浮現的真實反應。" },
];

const categories = [
  { key:"love" as const, icon:"♀", label:"感情關係", description:"互動、靠近與關係節奏", example:"我現在適合主動約對方談談嗎？" },
  { key:"work" as const, icon:"♄", label:"工作選擇", description:"轉職、合作與行動方向", example:"這週提出新的工作提案適合嗎？" },
  { key:"people" as const, icon:"☿", label:"人際界線", description:"溝通、距離與自我保護", example:"我需要先和這位朋友拉開距離嗎？" },
  { key:"self" as const, icon:"☾", label:"自我照顧", description:"休息、情緒與內在需要", example:"我現在適合先停下來休息嗎？" },
  { key:"today" as const, icon:"☉", label:"今日行動", description:"今天最需要確認的一小步", example:"我今天適合先完成手邊的計畫嗎？" },
];

const tools: Array<{key:ToolKey;icon:string;label:string;en:string;description:string;group:string}> = [
  {key:"yesno",icon:"↔",label:"Yes／No 快速占卜",en:"YES / NO",description:"六種回應，不只單純的是與否",group:"核心問答"},
  {key:"choices",icon:"Ⅲ",label:"多選一模式",en:"A — F",description:"輸入 2～6 個選項，讓靈擺停在其中一項",group:"核心問答"},
  {key:"custom",icon:"✎",label:"自訂問題模式",en:"CUSTOM QUESTION",description:"寫下你真正想確認的一件事",group:"核心問答"},
  {key:"number",icon:"№",label:"數字靈擺",en:"1 — 100",description:"自訂 1～10、30 或 100 的範圍",group:"數字符號"},
  {key:"letter",icon:"A",label:"字母模式",en:"A — Z",description:"為名稱、地點或靈感抽一個字母",group:"數字符號"},
  {key:"percentage",icon:"%",label:"百分比模式",en:"PERCENTAGE",description:"用娛樂與覺察角度看此刻狀態",group:"數字符號"},
  {key:"energy",icon:"☼",label:"能量檢測",en:"MIND · BODY · SOUL",description:"呈現心、身、靈三項覺察值",group:"能量探索"},
  {key:"chakra",icon:"◎",label:"脈輪模式",en:"7 CHAKRAS",description:"抽出今天可多關注的內在主題",group:"能量探索"},
  {key:"crystal",icon:"◇",label:"水晶推薦",en:"CRYSTAL",description:"依身心靈常見說法提供儀式靈感",group:"能量探索"},
  {key:"action",icon:"➝",label:"今日行動指引",en:"TODAY'S ACTION",description:"找出今天可以落地的一小步",group:"每日行動"},
  {key:"avoid",icon:"!",label:"今日避免事項",en:"PAUSE & NOTICE",description:"提醒今天適合放慢的地方",group:"每日行動"},
  {key:"meditation",icon:"☾",label:"今日冥想主題",en:"MEDITATION",description:"帶走一個今天適合練習的主題",group:"每日行動"},
  {key:"message",icon:"❝",label:"每日一句訊息",en:"DAILY MESSAGE",description:"一句溫柔但不替你做決定的提醒",group:"每日行動"},
  {key:"direction",icon:"✥",label:"今日幸運方向",en:"DIRECTION",description:"抽一個可作為儀式感的方位",group:"每日幸運"},
  {key:"color",icon:"◐",label:"今日幸運色",en:"COLOR",description:"用一個色彩陪伴今天的狀態",group:"每日幸運"},
  {key:"luckyNumber",icon:"#",label:"今日幸運數字",en:"LUCKY NUMBER",description:"抽出今天的象徵數字",group:"每日幸運"},
  {key:"element",icon:"△",label:"今日幸運元素",en:"ELEMENT",description:"花、水、太陽、月亮、森林、火或風",group:"每日幸運"},
  {key:"oil",icon:"♢",label:"今日幸運精油",en:"AROMA",description:"提供氣味與日常儀式靈感",group:"每日幸運"},
  {key:"food",icon:"♨",label:"今天適合吃什麼",en:"WHAT TO EAT",description:"從六種餐點風格找出今天想吃的方向",group:"日常生活"},
  {key:"drink",icon:"♧",label:"今天適合喝什麼",en:"WHAT TO DRINK",description:"熱飲、茶飲或清爽飲品的生活靈感",group:"日常生活"},
  {key:"outfit",icon:"♙",label:"今天適合怎麼穿",en:"WHAT TO WEAR",description:"抽出今天的穿搭氣氛與色系",group:"日常生活"},
  {key:"outing",icon:"⌖",label:"今天適合去哪裡",en:"WHERE TO GO",description:"為散步、約會或獨處找一個方向",group:"日常生活"},
  {key:"home",icon:"⌂",label:"今天適合整理什麼",en:"HOME RITUAL",description:"用一個小小家務讓生活重新流動",group:"日常生活"},
];

const toolGroups: Array<{name:string;en:string;description:string;keys:ToolKey[]}> = [
  {name:"核心問答",en:"I · QUESTIONS",description:"直接提問、比較選項，或整理一個自訂問題。",keys:["yesno","choices","custom"]},
  {name:"數字與符號",en:"II · NUMBERS & LETTERS",description:"用數字、字母與比例開啟聯想。",keys:["number","letter","percentage"]},
  {name:"能量探索",en:"III · INNER ENERGY",description:"從心身靈、脈輪與水晶象徵進行自我覺察。",keys:["energy","chakra","crystal"]},
  {name:"每日行動",en:"IV · DAILY GUIDANCE",description:"把訊息轉成今天可以實踐或暫緩的方向。",keys:["action","avoid","meditation","message"]},
  {name:"每日幸運",en:"V · DAILY RITUAL",description:"以色彩、方位、數字、元素與香氣增添儀式感。",keys:["direction","color","luckyNumber","element","oil"]},
  {name:"日常生活",en:"VI · EVERYDAY LIFE",description:"從吃喝、穿搭、出門到居家整理，快速解決今天的小選擇。",keys:["food","drink","outfit","outing","home"]},
];

const pendulumStyles = [
  {key:"teal" as const,no:"01",label:"祖母綠",en:"EMERALD",description:"古董黃銅雕花與深綠透明切面"},
  {key:"clear" as const,no:"02",label:"白水晶",en:"CLEAR QUARTZ",description:"通透折射與細緻虹光"},
  {key:"rose" as const,no:"03",label:"粉晶",en:"ROSE QUARTZ",description:"柔粉透明水晶與溫暖玫瑰光"},
  {key:"amethyst" as const,no:"04",label:"紫水晶",en:"AMETHYST",description:"紫羅蘭切面與深淺透明層次"},
  {key:"citrine" as const,no:"05",label:"黃水晶",en:"CITRINE",description:"蜜糖金色折射與日光質感"},
  {key:"aquamarine" as const,no:"06",label:"海藍寶",en:"AQUAMARINE",description:"清澈淺藍與水波般的折光"},
  {key:"moonstone" as const,no:"07",label:"月光石",en:"MOONSTONE",description:"乳白透明底色與藍紫虹彩"},
  {key:"labradorite" as const,no:"08",label:"拉長石",en:"LABRADORITE",description:"煙灰水晶與藍綠幻彩反光"},
  {key:"obsidian" as const,no:"09",label:"黑曜石",en:"OBSIDIAN",description:"黑色玻璃質地與透亮邊緣"},
  {key:"brass" as const,no:"10",label:"黃銅",en:"ANTIQUE BRASS",description:"溫暖、厚實的古董金屬質感"},
  {key:"silver" as const,no:"11",label:"銀製",en:"MOON SILVER",description:"冷銀月光與細緻舊化紋理"},
  {key:"wood" as const,no:"12",label:"木質",en:"DARK WALNUT",description:"深胡桃木與手作打磨質地"},
];

const chakraData = [
  ["海底輪","ROOT","穩定、安全感與身體感受","#b9534f"], ["臍輪","SACRAL","感受、創造力與關係流動","#d4824a"],
  ["太陽神經叢","SOLAR PLEXUS","行動、自信與個人界線","#d0a23b"], ["心輪","HEART","愛、接納與關係中的平衡","#5f9a72"],
  ["喉輪","THROAT","表達、傾聽與真實溝通","#4f89a5"], ["眉心輪","THIRD EYE","洞察、想像與內在觀察","#7767a4"],
  ["頂輪","CROWN","信念、意義與更大的視角","#c7b9d7"],
];

const crystalData = [
  ["紫水晶","沉澱思緒與安靜片刻"], ["粉晶","把注意力放回溫柔與自我接納"], ["白水晶","為今天設定一個清楚意圖"],
  ["黑曜石","整理界線與需要放下的負擔"], ["拉長石","在改變中保留直覺與彈性"], ["月光石","照顧情緒與內在節奏"],
  ["黃水晶","把想法轉成具體的小行動"], ["海藍寶","練習清楚而平和地表達"], ["綠幽靈","回到長期成長與穩定累積"],
];

const lifestylePools: Record<"food"|"drink"|"outfit"|"outing"|"home", Array<[string,string,string]>> = {
  food: [
    ["暖呼呼鍋物","SOUP & HOT POT","今天適合一份有湯、有溫度的料理，像是火鍋、湯麵或燉菜。"],
    ["飯食料理","RICE DISH","選一份踏實有飽足感的飯食，便當、丼飯、咖哩飯都很適合。"],
    ["麵食料理","NOODLES","讓麵食成為今天的答案，乾麵、義大利麵或拉麵都可以。"],
    ["清爽輕食","LIGHT MEAL","今天適合簡單一點，試試沙拉、三明治、粥品或蔬食料理。"],
    ["在地小吃","LOCAL BITES","不用想得太複雜，選一家熟悉的小吃店，吃一份很有生活感的味道。"],
    ["異國料理","WORLD CUISINE","今天的味蕾想換個場景，泰式、韓式、印度或墨西哥料理都值得考慮。"],
  ],
  drink: [
    ["溫熱茶飲","WARM TEA","選一杯溫熱的茶，讓今天的節奏稍微慢下來。"],
    ["咖啡香氣","COFFEE","今天適合用一杯咖啡陪你開始或完成一件事。"],
    ["清爽氣泡飲","SPARKLING","想要一點輕盈感，可以選無酒精氣泡飲或氣泡水。"],
    ["果香飲品","FRUIT DRINK","今天適合帶有自然果香、酸甜清爽的飲品。"],
    ["溫柔奶香","MILKY","選一杯奶茶、鮮奶或植物奶飲，給自己一點柔軟的照顧。"],
    ["先喝一杯水","PURE WATER","身體也許只是在提醒你補充水分，先喝水，再決定還想喝什麼。"],
  ],
  outfit: [
    ["奶杏柔光","CREAM & BEIGE","用奶油白、燕麥或杏色，穿出溫柔乾淨的氣氛。"],
    ["復古酒紅","VINTAGE WINE","加入酒紅、棕紅或一件復古配件，讓今天多一點存在感。"],
    ["清透藍綠","AQUA TONES","用藍色或綠色帶出清爽、安定又不費力的感覺。"],
    ["經典黑白","BLACK & WHITE","今天適合俐落簡單的黑白搭配，把重點留給自己。"],
    ["柔粉點綴","SOFT ROSE","不必全身粉色，用包包、飾品或一個小細節增加柔和感。"],
    ["舒適第一","COMFORT FIRST","今天不用勉強精緻，選透氣、自在、讓身體放鬆的衣服。"],
  ],
  outing: [
    ["熟悉的咖啡店","CAFÉ TIME","去一個能安靜坐下來的地方，讓思緒與心情慢慢沉澱。"],
    ["公園或河邊","GREEN WALK","今天適合接近綠意與自然，散步二十分鐘也很好。"],
    ["書店與展覽","BOOKS & ART","讓新的畫面和文字進來，替日常補充一點靈感。"],
    ["熱鬧的街區","CITY STROLL","今天可以去有店家與人群的地方走走，感受生活的流動。"],
    ["沒去過的小店","NEW PLACE","選一間收藏很久卻沒去過的店，給今天一點小小冒險。"],
    ["留在家裡休息","STAY HOME","今天的目的地就是家，整理一個舒服角落，好好恢復能量。"],
  ],
  home: [
    ["書桌與工作區","DESK RESET","清出桌面最常使用的區域，讓下一個行動更容易開始。"],
    ["衣櫃與穿搭區","WARDROBE","整理幾件不再適合的衣物，替真正喜歡的東西留位置。"],
    ["床鋪與休息區","RESTING SPACE","換洗寢具或整理床邊，讓今晚更容易進入休息狀態。"],
    ["浴室與洗手台","WATER SPACE","清理和水有關的小角落，讓日常重新有清爽感。"],
    ["包包與隨身物品","DAILY BAG","把每天帶著走的物品整理一次，減少不必要的重量。"],
    ["手機與數位空間","DIGITAL RESET","刪除幾張不需要的截圖或整理通知，替注意力留一點空白。"],
  ],
};

const quickAnswers: Array<Outcome> = [
  {resultKey:"yes",result:"yes",label:"是",en:"YES",detail:"此刻的方向比較靠近肯定，可以先從一個小而可驗證的行動開始。",reflection:"如果真的選擇前進，你願意先做哪一步？"},
  {resultKey:"no",result:"no",label:"否",en:"NO",detail:"此刻更適合暫緩、調整或重新確認界線；這個否不代表永遠不行。",reflection:"你現在最需要保護的是時間、情緒，還是資源？"},
  {resultKey:"unclear",result:"not-yet",label:"暫時不是時候",en:"NOT YET",detail:"先不用急著推動結果，讓資訊與情緒再沉澱一些。",reflection:"晚一點再決定，會讓你多看見什麼？"},
  {resultKey:"unclear",result:"rephrase",label:"問題需要重新描述",en:"REPHRASE",detail:"問題裡可能同時放進了多個條件，縮小範圍後會更容易覺察。",reflection:"如果一次只問一件事，真正核心的是哪一件？"},
  {resultKey:"no",result:"timing",label:"時機未到",en:"TIMING",detail:"方向未必錯，但現階段仍有條件尚未成熟。",reflection:"在行動前，你還缺哪一項現實資訊？"},
  {resultKey:"unclear",result:"unknown",label:"不建議現在知道答案",en:"LET IT UNFOLD",detail:"有些答案需要透過經驗慢慢浮現，現在先回到可以掌握的部分。",reflection:"如果暫時沒有答案，你仍能照顧好自己的哪一部分？"},
];

const soundscapes: Record<Soundscape,{icon:string;label:string;en:string;videoId:string}> = {
  forest:{icon:"♧",label:"森林鋼琴",en:"PIANO · FOREST WHITE NOISE",videoId:"_u95mLIAxvg"},
  cafe:{icon:"♫",label:"咖啡爵士",en:"SOFT JAZZ · BOSSA NOVA",videoId:"Uxz1ts_dRrQ"},
  meditation:{icon:"◇",label:"冥想淨化",en:"HEALING FREQUENCY · MEDITATION",videoId:"kqo9Z5Br63c"},
};

function pick<T>(items:T[]){ return items[Math.floor(Math.random()*items.length)]; }
function clamp(value:number,min:number,max:number){ return Math.min(max,Math.max(min,value)); }

export default function PendulumPage(){
  const [viewer,setViewer]=useState<Viewer|null>(null);
  const [checked,setChecked]=useState(false);
  const [tool,setTool]=useState<ToolKey>("yesno");
  const [mode,setMode]=useState<ModeKey>("general");
  const [category,setCategory]=useState<CategoryKey>("love");
  const [picker,setPicker]=useState<Picker>(null);
  const [question,setQuestion]=useState("");
  const [choices,setChoices]=useState("A 火鍋\nB 義大利麵\nC 拉麵\nD 壽司");
  const [numberRange,setNumberRange]=useState<10|30|100>(10);
  const [note,setNote]=useState("");
  const [outcome,setOutcome]=useState<Outcome|null>(null);
  const [motionTarget,setMotionTarget]=useState<Result|null>(null);
  const [moving,setMoving]=useState(false);
  const [calibrated,setCalibrated]=useState(false);
  const [calibrating,setCalibrating]=useState(false);
  const [saved,setSaved]=useState<"idle"|"saved"|"error">("idle");
  const [history,setHistory]=useState<Entry[]>([]);
  const [pendulumStyle,setPendulumStyle]=useState<PendulumStyle>("teal");
  const [soundEnabled,setSoundEnabled]=useState(false);
  const [soundscape,setSoundscape]=useState<Soundscape>("forest");
  const [dragging,setDragging]=useState(false);
  const [manualAngle,setManualAngle]=useState(0);
  const stageRef=useRef<HTMLDivElement|null>(null);
  const manualAngleRef=useRef(0);
  const dragRef=useRef({angle:0,time:0,velocity:0,active:false});
  const animationRef=useRef<number|null>(null);

  const selectedMode=modes.find(item=>item.key===mode)??modes[0];
  const selectedCategory=categories.find(item=>item.key===category)??categories[0];
  const selectedTool=tools.find(item=>item.key===tool)??tools[0];
  const selectedPendulum=pendulumStyles.find(item=>item.key===pendulumStyle)??pendulumStyles[0];
  const duration=4600;

  useEffect(()=>{ fetch("/api/me").then(r=>r.json()).then(async data=>{ setViewer(data.user??null); setChecked(true); if(data.user){ const h=await fetch("/api/pendulum"); if(h.ok) setHistory((await h.json()).entries??[]); } }).catch(()=>setChecked(true)); },[]);
  useEffect(()=>{ if(!picker)return; const close=(event:KeyboardEvent)=>{if(event.key==="Escape")setPicker(null)}; document.addEventListener("keydown",close); const previous=document.body.style.overflow; document.body.style.overflow="hidden"; return()=>{document.removeEventListener("keydown",close);document.body.style.overflow=previous}; },[picker]);
  useEffect(()=>()=>{ if(animationRef.current)cancelAnimationFrame(animationRef.current); },[]);

  const quality=useMemo(()=>{
    const q=question.trim();
    if(!q) return {ok:false,text:"先寫下一個問題"};
    if(q.length<8) return {ok:false,text:"問題可以再具體一點"};
    if(/[、，,]|還是|以及|又/.test(q)) return {ok:false,text:"一次只問一件事，會比較容易感受答案"};
    if(/為什麼|怎麼|何時|什麼時候|他.*想/.test(q)) return {ok:false,text:"請改成能用『是／否』回答的句子"};
    return {ok:true,text:"這是一個清楚的是非題，可以開始"};
  },[question]);

  const choiceList=useMemo(()=>choices.split("\n").map(item=>item.trim()).filter(Boolean).slice(0,6),[choices]);
  const monthCount=useMemo(()=>{const now=new Date();return history.filter(item=>{const date=new Date(item.created_at);return date.getFullYear()===now.getFullYear()&&date.getMonth()===now.getMonth()}).length},[history]);

  function toggleSoundscape(nextSoundscape:Soundscape){
    if(soundEnabled&&soundscape===nextSoundscape){setSoundEnabled(false);return}
    setSoundscape(nextSoundscape);
    setSoundEnabled(true);
  }

  function createOutcome():Outcome|null{
    if(tool==="yesno"||tool==="custom") return pick(quickAnswers);
    if(tool==="choices"){
      if(choiceList.length<2)return null;
      const chosen=pick(choiceList).replace(/^[A-Fa-f][\.、:\s-]*/,"");
      return {resultKey:pick<Result>(["yes","no"]),result:"choice",label:chosen,en:"SELECTED",detail:`靈擺這次停在「${chosen}」。把它當成觀察偏好的入口，再用距離、預算與現實條件確認。`,reflection:"看到這個選項時，你是放鬆、期待，還是有一點抗拒？"};
    }
    if(tool==="number"){
      const value=Math.floor(Math.random()*numberRange)+1;
      return {resultKey:pick<Result>(["yes","no"]),result:"number",label:String(value),en:`1 — ${numberRange}`,detail:`今天抽到的象徵數字是 ${value}。它適合用於排序、遊戲或儀式感，不代表機率預測。`,reflection:"這個數字讓你聯想到什麼人、時間或下一步？"};
    }
    if(tool==="letter"){
      const letter=String.fromCharCode(65+Math.floor(Math.random()*26));
      return {resultKey:pick<Result>(["yes","no"]),result:"letter",label:letter,en:"A — Z",detail:`這次停在字母 ${letter}。可作為名稱、地點、品牌或創作時的聯想起點。`,reflection:"先不要急著猜答案，這個字母最先讓你想到什麼？"};
    }
    if(tool==="percentage"){
      const value=Math.floor(Math.random()*61)+35;
      return {resultKey:value>70?"yes":value<50?"no":"unclear",result:"percentage",label:`${value}%`,en:"REFLECTION SCALE",detail:"這是娛樂與自我覺察式的呈現，不是對事件、關係或能量的客觀測量。",reflection:"如果由你自己評分，直覺會給幾分？為什麼？"};
    }
    if(tool==="energy"){
      const mind=Math.floor(Math.random()*46)+50,body=Math.floor(Math.random()*46)+45,soul=Math.floor(Math.random()*46)+50;
      const average=(mind+body+soul)/3;
      return {resultKey:average>75?"yes":average<58?"no":"unclear",result:"energy",label:average>75?"能量充足":average<58?"建議休息":"能量普通",en:`心 ${mind} · 身 ${body} · 靈 ${soul}`,detail:"數值只是一種覺察遊戲，不代表身心狀態的客觀檢測或健康判斷。",reflection:"三個數值中，你最想先照顧哪一項？"};
    }
    if(tool==="chakra"){
      const item=pick(chakraData);
      return {resultKey:"unclear",result:"chakra",label:`今天關注：${item[0]}`,en:item[1],detail:item[2],reflection:"今天能用哪個小行動，照顧這個內在主題？",accent:item[3]};
    }
    if(tool==="crystal"){
      const item=pick(crystalData);
      return {resultKey:pick<Result>(["yes","unclear"]),result:"crystal",label:item[0],en:"CRYSTAL RITUAL",detail:`${item[1]}。用途依身心靈領域常見說法整理，不取代醫療或專業建議。`,reflection:"即使手邊沒有這顆水晶，你仍能如何實踐它象徵的提醒？"};
    }
    if(tool==="food"||tool==="drink"||tool==="outfit"||tool==="outing"||tool==="home"){
      const item=pick(lifestylePools[tool]);
      const reflections={food:"看到這個答案時，你腦中第一個浮現的是哪一道料理？",drink:"這杯飲品符合你現在的身體感受與今天的天氣嗎？",outfit:"衣櫃裡哪一件單品最接近這個氣氛？",outing:"想到這個地方時，你是期待，還是其實更想休息？",home:"只花十分鐘，你最想先整理哪一小塊？"} as const;
      return {resultKey:pick<Result>(["yes","no","unclear"]),result:tool,label:item[0],en:item[1],detail:item[2],reflection:reflections[tool]};
    }
    const pools:Record<Exclude<ToolKey,"yesno"|"choices"|"number"|"letter"|"percentage"|"energy"|"chakra"|"crystal"|"custom"|"food"|"drink"|"outfit"|"outing"|"home">,Array<[string,string]>>={
      action:[["行動","完成一件已經拖延的小事"],["溝通","說清楚一個需要或界線"],["學習","留一段時間吸收新資訊"],["放鬆","刻意安排一段不追求效率的時間"],["休息","先恢復體力，再處理重要決定"],["整理","清出一個空間，也整理思緒"],["運動","用溫和活動讓身體重新流動"],["冥想","安靜三分鐘，聽見第一個念頭"]],
      avoid:[["衝動消費","先放入購物車，隔一天再決定"],["情緒化回覆","先離開對話幾分鐘再回來"],["熬夜","今天的清醒比多完成一件事重要"],["爭執","先確認彼此是在解決問題，還是在防衛"],["投資","重要財務決策請依專業與客觀資料評估"],["重大決定","資訊不足時，允許自己晚一點再選"]],
      direction:[["東方","象徵開始與新的視角"],["西方","象徵收尾與回顧"],["南方","象徵行動與熱情"],["北方","象徵沉澱與穩定"],["東南","象徵柔軟成長"],["西南","象徵關係與協調"],["東北","象徵規劃與累積"],["西北","象徵界線與決斷"]],
      color:[["白色","留白、清楚與重新開始"],["綠色","修復、平衡與穩定成長"],["粉色","溫柔、自我接納與關係暖度"],["橘色","創造力、交流與生活感"],["紫色","沉澱、想像與內在視角"],["藍色","平靜、表達與理性整理"],["紅色","行動、勇氣與身體能量"]],
      luckyNumber:[["3","表達、創意與新的組合"],["8","資源、責任與穩定累積"],["18","穿越不確定，保留觀察"],["22","帶著經驗重新出發"],["77","安靜辨認自己的直覺"]],
      element:[["花","讓美感與溫柔回到日常"],["水","允許情緒流動，也保持彈性"],["太陽","看見、行動與補充活力"],["月亮","休息、感受與內在節奏"],["森林","穩定、呼吸與長期累積"],["火","決心、轉化與勇敢開始"],["風","溝通、鬆動與新的想法"]],
      oil:[["薰衣草","適合搭配放鬆與睡前儀式"],["佛手柑","為沉重情緒加入一點明亮感"],["乳香","適合安靜、呼吸與冥想片刻"],["檸檬","為整理與開始增加清新感"],["茶樹","象徵清理、界線與俐落感"],["依蘭","練習柔軟、感受與慢下來"],["雪松","回到穩定、踏實與身體感"]],
      meditation:[["放下","把不能控制的部分暫時放回原位"],["原諒","原諒不是合理化，而是停止反覆消耗自己"],["豐盛","先看見已經擁有與正在累積的部分"],["相信自己","把選擇權收回，完成一個可驗證的小決定"],["愛自己","用你對重要的人那樣，照顧今天的自己"],["感恩","記下三件具體而微小的好事"],["療癒","允許修復有自己的速度，不要求立刻變好"]],
      message:[["今天請停止懷疑自己。","先完成一個小行動，答案會比想像更清楚。"],["相信你的直覺。","同時也用現實資訊替直覺找到落點。"],["事情正在慢慢靠近。","不催促結果，先整理自己能掌握的部分。"],["你比想像中勇敢。","勇敢不一定是衝出去，也可以是誠實地停下來。"]],
    };
    const item=pick(pools[tool as keyof typeof pools]);
    return {resultKey:pick<Result>(["yes","no","unclear"]),result:tool,label:item[0],en:selectedTool.en,detail:item[1],reflection:"看到這個結果時，你第一個想採取的小行動是什麼？"};
  }

  function stopActiveMotion(){
    if(animationRef.current!==null){cancelAnimationFrame(animationRef.current);animationRef.current=null}
  }

  function runNaturalMotion(target:Result,totalMs:number,onComplete:()=>void){
    stopActiveMotion();
    const finalDegrees=target==="yes"?-24:target==="no"?24:0;
    const finalAngle=finalDegrees*Math.PI/180;
    const initialDirection=Math.random()>.5?1:-1;
    const impulse=2.55;
    const stiffness=9.6;
    let theta=manualAngleRef.current*Math.PI/180;
    let omega=initialDirection*impulse;
    let previous=performance.now();
    const started=previous;
    const smoothstep=(value:number)=>value*value*(3-2*value);
    const tick=(now:number)=>{
      const elapsed=now-started;
      const progress=clamp(elapsed/totalMs,0,1);
      const dt=Math.min(.026,(now-previous)/1000);
      previous=now;
      const targetProgress=smoothstep(clamp((progress-.52)/.34,0,1));
      const equilibrium=finalAngle*targetProgress;
      const damping=.46+progress*1.18;
      const airMovement=Math.sin(elapsed*.0067+initialDirection)*.025*(1-progress);
      const acceleration=-stiffness*Math.sin(theta-equilibrium)-damping*omega+airMovement;
      omega+=acceleration*dt;
      theta=clamp(theta+omega*dt,-.84,.84);
      const finalBlend=smoothstep(clamp((progress-.88)/.12,0,1));
      const rendered=theta*(1-finalBlend)+finalAngle*finalBlend;
      updateManualAngle(rendered*180/Math.PI);
      if(progress<1){animationRef.current=requestAnimationFrame(tick);return}
      animationRef.current=null;
      updateManualAngle(finalDegrees);
      onComplete();
    };
    animationRef.current=requestAnimationFrame(tick);
  }

  function reset(clearQuestion=true){stopActiveMotion();setOutcome(null);setMotionTarget(null);updateManualAngle(0);if(clearQuestion)setQuestion("");setNote("");setSaved("idle")}
  function activateTool(next:ToolKey){setTool(next);reset(false);window.setTimeout(()=>document.getElementById("ritual")?.scrollIntoView({behavior:"smooth",block:"start"}),40)}

  function calibrate(){
    setCalibrating(true);setCalibrated(false);setOutcome(null);setMotionTarget(null);updateManualAngle(0);
    runNaturalMotion("unclear",3000,()=>{setCalibrating(false);setCalibrated(true)});
  }

  function ask(){
    if(moving)return;
    if((tool==="yesno"||tool==="custom")&&!quality.ok)return;
    const next=createOutcome();if(!next)return;
    setOutcome(null);setMotionTarget(next.resultKey);setMoving(true);setSaved("idle");updateManualAngle(0);
    runNaturalMotion(next.resultKey,duration,()=>{setOutcome(next);setMotionTarget(null);setMoving(false);navigator.vibrate?.(18)});
  }

  async function save(){
    if(!viewer){window.location.href="/signin-with-chatgpt?return_to=/pendulum";return}
    if(!outcome)return;
    const prompt=question.trim()||`${selectedTool.label}｜${new Date().toLocaleDateString("zh-TW")}`;
    const response=await fetch("/api/pendulum",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({question:prompt,result:outcome.result,resultLabel:outcome.label,category:`${selectedTool.label}・${selectedCategory.label}`,note})});
    if(!response.ok){setSaved("error");return}
    setSaved("saved");const h=await fetch("/api/pendulum");if(h.ok)setHistory((await h.json()).entries??[]);
  }

  function updateManualAngle(value:number){manualAngleRef.current=value;setManualAngle(value)}
  function beginDrag(event:ReactPointerEvent<HTMLDivElement>){
    if(moving||calibrating)return;
    stopActiveMotion();
    event.currentTarget.setPointerCapture(event.pointerId);dragRef.current={angle:manualAngleRef.current,time:performance.now(),velocity:0,active:true};setDragging(true);setOutcome(null);setMotionTarget(null);
  }
  function moveDrag(event:ReactPointerEvent<HTMLDivElement>){
    if(!dragRef.current.active||!stageRef.current)return;
    const rect=stageRef.current.getBoundingClientRect();const dx=event.clientX-(rect.left+rect.width/2);const dy=Math.max(38,event.clientY-(rect.top+52));const angle=clamp(Math.atan2(dx,dy)*180/Math.PI,-46,46);const now=performance.now();const dt=Math.max(12,now-dragRef.current.time);const velocity=(angle-dragRef.current.angle)/(dt/1000);dragRef.current={angle,time:now,velocity,active:true};updateManualAngle(angle);
  }
  function releaseDrag(event:ReactPointerEvent<HTMLDivElement>){
    if(!dragRef.current.active)return;
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current.active=false;setDragging(false);let theta=manualAngleRef.current*Math.PI/180;let omega=clamp(dragRef.current.velocity*Math.PI/180,-4.8,4.8);let previous=performance.now();
    const tick=(now:number)=>{const dt=Math.min(.03,(now-previous)/1000);previous=now;const acceleration=-8.4*Math.sin(theta)-.68*omega;omega+=acceleration*dt;theta+=omega*dt;updateManualAngle(theta*180/Math.PI);if(Math.abs(theta)<.0018&&Math.abs(omega)<.009){animationRef.current=null;updateManualAngle(0);return}animationRef.current=requestAnimationFrame(tick)};
    animationRef.current=requestAnimationFrame(tick);
  }

  const needsQuestion=tool==="yesno"||tool==="custom";
  const actionDisabled=moving||(needsQuestion&&!quality.ok)||(tool==="choices"&&choiceList.length<2);
  const questionPlaceholder=tool==="custom"?"例如：我現在適合開始規劃下一份工作嗎？":selectedCategory.example;
  const swingEnergy=Math.min(1,Math.abs(manualAngle)/36);
  const stageStyle={"--manual-angle":`${manualAngle}deg`,"--shadow-offset":`${manualAngle*1.12}px`,"--shadow-scale":String(1.08-swingEnergy*.28),"--shadow-opacity":String(.72-swingEnergy*.27),"--light-shift":`${manualAngle*.22}px`,"--swing-energy":String(swingEnergy),"--swing-duration":`${duration}ms`,"--result-accent":outcome?.accent??"#d9b675"} as CSSProperties;

  return <main className="pendulum-page">
    <nav className="pendulum-nav site-nav"><Link className="brand" href="/">ZOLACOCO <span>TAROT</span></Link><div className="pendulum-menu"><Link href="/#draw">塔羅抽牌</Link><Link href="/pendulum#centre">占卜玩法</Link><Link href="/pendulum#membership">會員方案</Link>{viewer?.isAdmin&&<Link href="/admin">查看後台</Link>}{checked&&!viewer?<a className="login-link" href="/signin-with-chatgpt?return_to=/pendulum">登入／註冊</a>:viewer?<a href="/signout-with-chatgpt?return_to=/pendulum">登出</a>:null}</div></nav>
    <header className="pendulum-hero">
      <div className="pendulum-hero-copy"><p className="eyebrow">THE PENDULUM DIVINATION CENTRE</p><h1>靈擺占卜<br/><em>中心</em></h1><p>從 Yes／No、多選一到每日指引，用一場有儀式感的擺動整理直覺。答案是自我反思的入口，不是替你決定人生的命令。</p><a href="#centre" className="primary">選擇占卜玩法 <span>↓</span></a></div>
      <div className="pendulum-hero-image"><img src="/pendulum-hero.png" alt="暖光中的藍綠水晶與古董黃銅靈擺"/><span>CRYSTAL · BRASS · INTUITION</span></div>
    </header>

    <section className="divination-centre" id="centre">
      <div className="centre-heading"><p className="eyebrow">23 WAYS TO ASK</p><h2>今天，想用哪種方式問？</h2><p>選擇一種玩法後，會直接帶你進入下方的靈擺儀式。</p></div>
      <div className="tool-groups">{toolGroups.map((group,index)=><section className="tool-group" key={group.name}>
        <header><span>{String(index+1).padStart(2,"0")}</span><div><small>{group.en}</small><h3>{group.name}</h3><p>{group.description}</p></div></header>
        <div className="tool-library">{group.keys.map(key=>tools.find(item=>item.key===key)).filter((item):item is (typeof tools)[number]=>Boolean(item)).map(item=><button key={item.key} type="button" className={tool===item.key?"selected":""} onClick={()=>activateTool(item.key)}><i aria-hidden="true">{item.icon}</i><span><small>{item.en}</small><b>{item.label}</b><em>{item.description}</em></span><strong>{tool===item.key?"已選擇":"開始 ›"}</strong></button>)}</div>
      </section>)}</div>
    </section>

    <section className="pendulum-ritual" id="ritual">
      <div className="ritual-heading"><p className="eyebrow">YOUR SELECTED RITUAL</p><h2>{selectedTool.label}</h2><p>{selectedTool.description}。涉及未來、健康、法律、投資或重大決策時，請把結果當作反思參考，並結合專業與現實資訊評估。</p></div>
      <div className="pendulum-workspace">
        <aside className="ritual-sidebar">
          <div className="ritual-steps">
            <article className={calibrated?"done":"active"}><b>01</b><div><small>CALIBRATE</small><h3>校準靈擺</h3><p>熟悉擺動，也可以直接拖曳後放手。</p></div></article>
            <article className={calibrated?"active":""}><b>02</b><div><small>ASK</small><h3>選擇與提問</h3><p>一次整理一個方向，讓問題保持單純。</p></div></article>
            <article className={outcome?"active":""}><b>03</b><div><small>REFLECT</small><h3>記錄感受</h3><p>答案後的第一反應，往往比答案本身更重要。</p></div></article>
          </div>
          <div className="cabinet-card"><small>HISTOIRE NATURELLE · CRYSTAL PLATE</small><h3>古董水晶圖鑑</h3><p>{selectedPendulum.description}</p><div>{pendulumStyles.map(item=><button key={item.key} type="button" className={pendulumStyle===item.key?"active":""} onClick={()=>setPendulumStyle(item.key)}><sup>{item.no}</sup><i className={`material-swatch ${item.key}`}><span/></i><span><b>{item.label}</b><small>{item.en}</small></span></button>)}</div></div>
        </aside>
        <div className="pendulum-console">
          <div className="pendulum-toolbar">
            <div className="piano-music-control"><span>沉浸療癒音景</span><div className="soundscape-options">{(["forest","cafe","meditation"] as Soundscape[]).map(item=>{const content=soundscapes[item];return <button type="button" key={item} className={soundEnabled&&soundscape===item?"piano-button active":"piano-button"} onClick={()=>toggleSoundscape(item)} aria-pressed={soundEnabled&&soundscape===item}><i aria-hidden="true">{content.icon}</i><b>{soundEnabled&&soundscape===item?"停止播放":content.label}</b><small>{content.en}</small></button>})}</div></div>
            <p className="music-status" aria-live="polite">{soundEnabled?`正在播放「${soundscapes[soundscape].label}」，再次點擊即可停止。`:"點選一種音景即可播放聲音。"}</p>
          </div>
          {soundEnabled&&<div className="audio-only-player" aria-hidden="true"><iframe key={soundscape} src={`https://www.youtube-nocookie.com/embed/${soundscapes[soundscape].videoId}?autoplay=1&loop=1&playlist=${soundscapes[soundscape].videoId}&controls=0&rel=0`} title={`${soundscapes[soundscape].label}背景音樂`} allow="autoplay; encrypted-media" referrerPolicy="strict-origin-when-cross-origin" tabIndex={-1}/></div>}
          <div ref={stageRef} style={stageStyle} className={`crystal-stage material-${pendulumStyle} ${dragging?"is-dragging":""} ${moving&&motionTarget?`motion-${motionTarget}`:""} ${calibrating?"is-calibrating":""} ${outcome?`result-${outcome.resultKey}`:""}`} aria-live="polite">
            <div className="antique-frame" aria-hidden="true"><i/><i/><i/><i/><span>❦</span><span>❦</span></div>
            <div className="prism-specks" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/></div>
            <div className="pendulum-anchor" aria-hidden="true"><i/><span/></div>
            <div className="crystal-chain" onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={releaseDrag} onPointerCancel={releaseDrag} aria-label="可拖曳的靈擺"><img className="crystal-pendulum-image" src="/crystal-pendulum-web.png" alt="" draggable={false}/></div>
            <div className="crystal-glow" aria-hidden="true"/>
            <div className="pendulum-status">{dragging?"RELEASE TO SWING":calibrating?"CALIBRATING":moving?"LISTENING":outcome?outcome.en:"DRAG OR BEGIN"}</div>
            <div className="stage-live-light" aria-hidden="true"/>
            <button type="button" className="image-start-hitbox" disabled={calibrating||moving||(calibrated&&actionDisabled)} onClick={calibrated?ask:calibrate} aria-label={calibrated?"開始靈擺占卜":"開始校準靈擺"}><span>{calibrated?"開始靈擺占卜":"開始擺動"}</span></button>
          </div>

          {!calibrated?<div className="calibration-panel"><h2>{calibrating?"正在認識擺動方向……":"先進行一次校準"}</h2><p>直接點擊畫面中央的「開始擺動」，讓水晶光影慢慢回應；也可以使用下方按鈕開始。</p><button className="pendulum-cta" disabled={calibrating} onClick={calibrate}>{calibrating?"校準中…":"開始校準"}</button></div>:
          <div className="question-panel">
            {!outcome&&<div className="pendulum-selectors">
              <button type="button" className="selector-card" onClick={()=>setPicker("mode")}><span className="selector-symbol" aria-hidden="true">{selectedMode.icon}</span><span className="selector-kicker">回應模式</span><b>{selectedMode.label}</b><small>{selectedMode.en}</small><i>選擇 ›</i></button>
              <button type="button" className="selector-card" onClick={()=>setPicker("category")}><span className="selector-symbol" aria-hidden="true">{selectedCategory.icon}</span><span className="selector-kicker">提問類別</span><b>{selectedCategory.label}</b><small>{selectedCategory.description}</small><i>選擇 ›</i></button>
            </div>}
            {!outcome?<>
              <p className="active-tool-label"><span>{selectedTool.group}</span>{selectedTool.en}</p>
              <h2>{tool==="choices"?"輸入你的選項":tool==="number"?"選擇數字範圍":needsQuestion?"寫下一個清楚的問題":"讓今天的訊息慢慢浮現"}</h2>
              {needsQuestion&&<><textarea maxLength={180} value={question} onChange={e=>setQuestion(e.target.value)} placeholder={questionPlaceholder}/><p className={`question-quality ${quality.ok?"good":""}`}>{quality.ok?"✓":"✦"} {quality.text}</p></>}
              {tool==="choices"&&<><textarea className="choice-input" maxLength={240} value={choices} onChange={e=>setChoices(e.target.value)} placeholder={"A 第一個選項\nB 第二個選項\n最多可輸入六項"}/><p className={`question-quality ${choiceList.length>=2?"good":""}`}>{choiceList.length>=2?"✓ 已準備好選項":"✦ 請至少輸入兩個選項"}</p></>}
              {tool==="number"&&<div className="range-picker">{([10,30,100] as const).map(value=><button key={value} onClick={()=>setNumberRange(value)} className={numberRange===value?"active":""}>1 ～ {value}</button>)}</div>}
              {!needsQuestion&&tool!=="choices"&&tool!=="number"&&<p className="ritual-ready-copy">這個模式不需要輸入問題。先在心裡停留幾秒，再讓靈擺為你抽出一個象徵結果。</p>}
              <button className="pendulum-cta" disabled={actionDisabled} onClick={ask}>{moving?"靈擺回應中…":"開始靈擺占卜"}</button>
            </>:<div className="result-panel" style={{"--result-accent":outcome.accent??"#c29659"} as CSSProperties}><div className="result-crown" aria-hidden="true">❦</div><span>{outcome.en} · {selectedMode.en}</span><h2>{outcome.label}</h2><blockquote><small>靈擺訊息</small><p>{outcome.detail}</p></blockquote><div className="reflection-card"><small>給自己的覺察題</small><p>{outcome.reflection}</p></div><label className="result-note-label" htmlFor="pendulum-note">寫下此刻的感受</label><textarea id="pendulum-note" maxLength={500} value={note} onChange={e=>setNote(e.target.value)} placeholder="看到這個答案時，我第一個浮現的感受是……"/><div className="result-actions"><button onClick={()=>reset(false)}>清除並重問</button><button className="pendulum-cta" onClick={save}>{!viewer?"登入後儲存":"儲存結果與感受"}</button></div>{saved==="saved"&&<small>已儲存到你的個人紀錄，也會出現在 Zola 後台。</small>}{saved==="error"&&<small>目前未能儲存，請稍後再試。</small>}</div>}
          </div>}
        </div>
      </div>
    </section>

    {picker&&<div className="picker-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setPicker(null)}}><section className="picker-dialog" role="dialog" aria-modal="true" aria-labelledby="picker-title"><button className="picker-close" type="button" aria-label="關閉選擇視窗" onClick={()=>setPicker(null)}>×</button><p className="eyebrow">{picker==="mode"?"CHOOSE A MODE":"CHOOSE A CATEGORY"}</p><h2 id="picker-title">{picker==="mode"?"選擇回應模式":"這次想整理哪個方向？"}</h2><p>{picker==="mode"?"一般、高靈與潛意識模式只改變反思語氣，不改變隨機機制。":"選擇類別後，會帶入適合的提問方向與範例。"}</p><div className={`picker-grid ${picker==="category"?"category-grid":""}`}>{picker==="mode"?modes.map(item=><button type="button" key={item.key} className={item.key===mode?"selected":""} onClick={()=>{setMode(item.key);setPicker(null)}}><i>{item.icon}</i><span><small>{item.en}</small><b>{item.label}</b><em>{item.description}</em></span><strong>{item.key===mode?"✓":"›"}</strong></button>):categories.map(item=><button type="button" key={item.key} className={item.key===category?"selected":""} onClick={()=>{setCategory(item.key);setPicker(null)}}><i>{item.icon}</i><span><b>{item.label}</b><em>{item.description}</em><small>例：{item.example}</small></span><strong>{item.key===category?"✓":"›"}</strong></button>)}</div></section></div>}

    <section className="pendulum-guide"><div><p className="eyebrow">ASK WITH CLARITY</p><h2>怎麼問，答案會比較有幫助？</h2></div><div className="guide-grid"><article><b>適合提問</b><p>「我現在適合主動約對方談談嗎？」</p><p>「這週先完成作品集，對我比較有幫助嗎？」</p></article><article><b>先換個問法</b><p>「他到底在想什麼？」</p><p>「我什麼時候一定會成功？」</p></article><article><b>不要只交給靈擺</b><p>健康、法律、投資、安全或生死等高風險決策，請尋求專業資訊並自行評估。</p></article></div></section>

    <section className="premium-room" id="membership"><div className="premium-intro"><p className="eyebrow">ZOLACOCO PENDULUM MEMBERSHIP</p><h2>完整會員體驗</h2><p>占卜玩法、收藏櫃、聲光效果與個人紀錄已整合在同一頁；正式收費價格與付款入口確認後即可接上，不先替你設定費用。</p></div><div className="premium-dashboard"><article><small>本月紀錄</small><strong>{viewer?monthCount:"—"}</strong><p>{viewer?"已登入，可查看個人靈擺歷史":"登入後開始累積個人紀錄"}</p></article><article><small>目前靈擺</small><strong>{selectedPendulum.label}</strong><p>可隨時切換透明水晶、金屬與木質外觀</p></article><article><small>AI 式反思引導</small><strong>每次都有</strong><p>依結果提供覺察問題，不把內容包裝成絕對預言</p></article></div><div className="premium-features"><span>✓ 全部 23 種模式</span><span>✓ 12 款靈擺外觀</span><span>✓ 三種沉浸音景</span><span>✓ 自然擺動效果</span><span>✓ 個人歷史紀錄</span><span>✓ 每月使用統計</span><span>✓ 無廣告沉浸介面</span><span>✓ 塔羅抽牌流程串接</span></div><div className="premium-actions">{viewer?<a href="#ritual">繼續今天的靈擺儀式</a>:<a href="/signin-with-chatgpt?return_to=/pendulum">登入／註冊保存紀錄</a>}<Link href="/">搭配塔羅牌一起整理</Link></div></section>

    {viewer&&<section className="pendulum-history"><p className="eyebrow">MY PENDULUM JOURNAL</p><h2>我的近期紀錄</h2>{history.length===0?<p>完成並儲存第一題後，紀錄會出現在這裡。</p>:<div className="history-list">{history.map(entry=><article key={entry.id}><div><span>{entry.category}</span><time>{new Date(entry.created_at).toLocaleString("zh-TW")}</time></div><h3>{entry.question}</h3><b>{entry.result_label}</b>{entry.note&&<p>{entry.note}</p>}</article>)}</div>}</section>}
    <footer><div className="brand">ZOLACOCO <span>TAROT</span></div><p>答案不是命令，而是讓你更靠近自己的入口。</p><Link href="/">返回塔羅抽牌首頁</Link></footer>
  </main>;
}
