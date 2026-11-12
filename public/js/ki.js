// MIND – KI: was die KI über die Habits erfährt (summary) und das Prüfen ihrer Vorschläge (proposal).
// Rechnet nur, zeichnet nichts und spricht mit niemandem. "Heute" kommt als Parameter herein (gut testbar).
// Grundsatz: Die KI bekommt nur eine Zusammenfassung. Keine E-Mail, kein Name, keine IDs aus der Datenbank.
import {DAYS,UNIT_MAX} from "./config.js";
import {iso,addDays,wdi,parseDay,sched,cnt,tg,konst,streak,range,weekdayPattern,pauseOn,clampT,DTRE} from "./logic.js";

const MAXH=20;                      // so viele Habits gehen höchstens mit (der Server kürzt bei 8000 Zeichen)
const WD=["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"];
const dm=d=>d.getDate()+"."+(d.getMonth()+1)+".";
export const tageText=days=>days.length===7?"täglich":days.map(i=>DAYS[i]).join(" ");
// "6 Gläser am Tag", "5 Minuten", "3× am Tag" oder "" (einmal am Tag ohne Einheit)
export const mengeText=o=>o.target>1?o.target+(o.unit?" "+(o.unit_pl||o.unit):"×")+" am Tag":o.unit;
const zeitText=d=>({morgen:"morgens",mittag:"mittags",abend:"abends"})[d]||(d?d+" Uhr":"");
const pct=a=>a[1]?Math.round(a[0]/a[1]*100)+" %":"–";
const wdLine=agg=>agg.map((a,i)=>DAYS[i]+" "+pct(a)+(a[1]?` (${a[0]} von ${a[1]})`:"")).join(", ");

// Die letzten 7 Tage eines Habits bis heute: ✓ geschafft, ✗ geplant und nicht geschafft, – nicht geplant oder pausiert,
// 3/6 teilweise, "offen" = heute noch nicht geschafft
function week(h,today){
  const out=[];
  for(let i=6;i>=0;i--){
    const d=addDays(today,-i),k=iso(d),n=cnt(h,k),t=tg(h,k);
    out.push(DAYS[wdi(d)]+" "+(n>=t?"✓":!sched(h,d)&&!n?"–":n?n+"/"+t:i?"✗":"offen"));
  }
  return out.join(", ");
}

// Zusammenfassung als Text für die KI. focus = ID des Habits, um das es geht (Mini-Version, Muster erklären).
// Gibt {text, ids} zurück: ids[nr-1] ist das Habit mit der Nummer nr. So kann die KI ein Habit über seine Nummer
// benennen, ohne dass eine ID die App verlässt.
export function summary(habits,today,focus){
  const hs=habits.slice(0,MAXH),ti=iso(today),ids=hs.map(h=>h.id);
  if(!hs.length)return {text:`Heute: ${WD[wdi(today)]}, ${dm(today)}${today.getFullYear()}\nNoch keine Habits angelegt.`,ids};
  const lines=hs.map((h,i)=>{
    const pz=pauseOn(h,ti),k=konst([h],today),s=streak(h,today);
    return [`${i+1}. ${h.name}`,tageText(h.days),mengeText(h)||"einmal am Tag",zeitText(h.daytime),h.cat&&"Kategorie "+h.cat,
      "dabei seit "+dm(parseDay(h.created))+h.created.slice(0,4),
      pz?"PAUSIERT"+(pz.to?" bis "+dm(parseDay(pz.to)):""):"",
      "Konstanz 30 Tage: "+(k==null?"–":k+" %"),"Serie: "+s+(s===1?" Tag":" Tage"),"letzte 7 Tage: "+week(h,today)].filter(Boolean).join(" | ");
  });
  const w=range(hs,addDays(today,-6),today,today),k=konst(hs,today);
  let text=`Heute: ${WD[wdi(today)]}, ${dm(today)}${today.getFullYear()}
Zeichen: ✓ geschafft, ✗ geplant und nicht geschafft, – nicht geplant oder pausiert, 3/6 teilweise, offen = heute noch nicht geschafft.
Habits:
${lines.join("\n")}
Alle zusammen, letzte 7 Tage: ${w[0]} von ${w[1]} geplanten geschafft. Konstanz der letzten 30 Tage: ${k==null?"–":k+" %"}.
Quote nach Wochentag, alle Habits, letzte 12 Wochen: ${wdLine(weekdayPattern(hs,today))}.`;
  const f=hs.findIndex(h=>h.id===focus);
  if(f>=0)text+=`\nIm Mittelpunkt: Nr. ${f+1} „${hs[f].name}“. Quote nach Wochentag, letzte 12 Wochen: ${wdLine(weekdayPattern([hs[f]],today))}.`;
  return {text,ids};
}

// Vorschlag der KI prüfen, bevor er gezeigt wird. v = was die Server-Funktion durchreicht, ids = Nummern aus summary().
// Gibt einen sauberen Vorschlag zurück oder null (dann wird nur der Text gezeigt):
//   {art:"neu", name, days, target, unit, unit_pl, daytime}
//   {art:"aendern", id, was, name, target, unit, unit_pl}      was = wie das Habit bisher heißt
export function proposal(v,ids,habits){
  if(!v||typeof v!=="object")return null;
  const name=String(v.name||"").trim().slice(0,40);
  if(!name)return null;
  const txt=x=>String(x||"").trim().slice(0,UNIT_MAX);
  if(v.art==="aendern"){
    const h=habits.find(x=>x.id===ids[(v.nr|0)-1]);
    if(!h)return null;
    // Was die KI nicht nennt, bleibt, wie es ist
    const p={art:"aendern",id:h.id,was:h.name,name,target:v.ziel==null?h.target:clampT(v.ziel),unit:v.einheit==null?h.unit:txt(v.einheit),unit_pl:v.mehrzahl==null?h.unit_pl:txt(v.mehrzahl)};
    return p.name===h.name&&p.target===h.target&&p.unit===h.unit&&p.unit_pl===h.unit_pl?null:p; // ändert nichts
  }
  if(v.art!=="neu")return null;
  const days=[...new Set((Array.isArray(v.tage)?v.tage:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<=6))].sort();
  const zeit=String(v.zeit||"");
  return {art:"neu",name,days:days.length?days:[0,1,2,3,4,5,6],target:clampT(v.ziel),unit:txt(v.einheit),unit_pl:txt(v.mehrzahl),daytime:DTRE.test(zeit)?zeit:""};
}
