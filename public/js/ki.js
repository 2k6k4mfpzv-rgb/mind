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
// 3/6 teilweise, "offen" = heute noch nicht geschafft. Davor steht die fertige Zahl ("2 von 6 geschafft"): Sprachmodelle
// verzählen sich bei Zeichenketten, deshalb rechnet die App alles vor (gemessen am 16.11.2026: "6 von 7" statt 7 von 7).
function week(h,today){
  const out=[];let c=0,s=0;
  for(let i=6;i>=0;i--){
    const d=addDays(today,-i),k=iso(d),n=cnt(h,k),t=tg(h,k),ok=n>=t,plan=sched(h,d)||n>0;
    if(plan&&(i||ok)){s++;if(ok)c++} // heute zählt erst, wenn es geschafft ist
    out.push(DAYS[wdi(d)]+" "+(ok?"✓":!plan?"–":n?n+"/"+t:i?"✗":"offen"));
  }
  return {c,s,text:(s?`${c} von ${s} geschafft`:"nichts geplant")+" ("+out.join(", ")+")"};
}
// Stärkster und schwächster Wochentag aus einem Muster (nur Tage mit mindestens 4 geplanten). null, wenn die Tage
// nah beieinander liegen (unter 15 Punkten): Dann gibt es kein Muster, und die KI soll auch keins behaupten.
function spitzen(agg,min){
  const xs=agg.map((a,i)=>[i,a[1]>=4?a[0]/a[1]:null]).filter(x=>x[1]!=null).sort((x,y)=>y[1]-x[1]);
  if(xs.length<2||xs[0][1]-xs[xs.length-1][1]<(min==null?.15:min))return null;
  const f=x=>DAYS[x[0]]+" "+Math.round(x[1]*100)+" %";
  return {hi:f(xs[0]),lo:f(xs[xs.length-1])};
}

// Zusammenfassung als Text für die KI. focus = ID des Habits, um das es geht (Mini-Version, Muster erklären).
// Gibt {text, ids} zurück: ids[nr-1] ist das Habit mit der Nummer nr. So kann die KI ein Habit über seine Nummer
// benennen, ohne dass eine ID die App verlässt.
// Seit 16.11.2026 steht alles Rechenbare fertig drin: Zahl der Woche, Vergleich mit den 30 Tagen davor, stärkster und
// schwächster Wochentag pro Habit, bestes und schwächstes Habit, was heute noch offen ist.
export function summary(habits,today,focus){
  const hs=habits.slice(0,MAXH),ti=iso(today),ids=hs.map(h=>h.id);
  if(!hs.length)return {text:`Heute: ${WD[wdi(today)]}, ${dm(today)}${today.getFullYear()}\nNoch keine Habits angelegt.`,ids};
  const vor=addDays(today,-30),rang=[],wo=[];
  const lines=hs.map((h,i)=>{
    const pz=pauseOn(h,ti),k=konst([h],today),k2=parseDay(h.created)<=vor?konst([h],vor):null,s=streak(h,today),sp=spitzen(weekdayPattern([h],today));
    const wk=week(h,today);
    if(!pz&&k!=null)rang.push([k,h.name]);
    if(!pz&&wk.s>=3)wo.push([wk.c/wk.s,`${h.name} ${wk.c} von ${wk.s}`]); // nur Habits mit mindestens 3 geplanten Tagen, sonst sagt die Zahl nichts
    return [`${i+1}. ${h.name}`,tageText(h.days),mengeText(h)||"einmal am Tag",zeitText(h.daytime),h.cat&&"Kategorie "+h.cat,
      "dabei seit "+dm(parseDay(h.created))+h.created.slice(0,4),
      pz?"PAUSIERT"+(pz.to?" bis "+dm(parseDay(pz.to)):""):"",
      "Konstanz 30 Tage: "+(k==null?"–":k+" %")+(k2==null?"":" (die 30 Tage davor: "+k2+" %)"),"Serie: "+s+(s===1?" Tag":" Tage"),
      sp?"stärkster Wochentag "+sp.hi+", schwächster "+sp.lo:"","letzte 7 Tage: "+wk.text].filter(Boolean).join(" | ");
  });
  const w=range(hs,addDays(today,-6),today,today),k=konst(hs,today),alle=weekdayPattern(hs,today),sp=spitzen(alle,.05);
  const heute=hs.filter(h=>sched(h,today)),offen=heute.filter(h=>cnt(h,ti)<tg(h,ti));
  rang.sort((x,y)=>y[0]-x[0]);wo.sort((x,y)=>y[0]-x[0]);
  let text=`Heute: ${WD[wdi(today)]}, ${dm(today)}${today.getFullYear()}
Zeichen: ✓ geschafft, ✗ geplant und nicht geschafft, – nicht geplant oder pausiert, 3/6 teilweise, offen = heute noch nicht geschafft.
Habits:
${lines.join("\n")}
Heute geplant: ${heute.length}, davon erledigt: ${heute.length-offen.length}${offen.length?", noch offen: "+offen.map(h=>h.name).join(", "):""}.
Alle zusammen, letzte 7 Tage: ${w[0]} von ${w[1]} geplanten geschafft. Konstanz der letzten 30 Tage: ${k==null?"–":k+" %"}.${wo.length>1?`
Beste Woche: ${wo[0][1]}. Schwächste Woche: ${wo[wo.length-1][1]}.`:""}${rang.length>1?`
Stärkstes Habit (Konstanz 30 Tage): ${rang[0][1]} ${rang[0][0]} %. Schwächstes: ${rang[rang.length-1][1]} ${rang[rang.length-1][0]} %.`:""}
Quote nach Wochentag, alle Habits, letzte 12 Wochen: ${wdLine(alle)}.${sp?` Bester Wochentag: ${sp.hi}. Schwächster Wochentag: ${sp.lo}.`:""}`;
  const f=hs.findIndex(h=>h.id===focus);
  if(f>=0)text+=`\nIm Mittelpunkt: Nr. ${f+1} „${hs[f].name}“. Quote nach Wochentag, letzte 12 Wochen: ${wdLine(weekdayPattern([hs[f]],today))}.`;
  return {text,ids};
}

// Vorschlag der KI prüfen, bevor er gezeigt wird. v = was die Server-Funktion durchreicht, ids = Nummern aus summary().
// Gibt einen sauberen Vorschlag zurück oder null (dann wird nur der Text gezeigt):
//   {art:"neu", name, days, target, unit, unit_pl, daytime}
//   {art:"aendern", id, was, name, target, unit, unit_pl, days, daytime}      was = wie das Habit bisher heißt
// Seit 16.11.2026 kann "aendern" auch Tageszeit und Tage ändern (z. B. Lesen von abends auf morgens legen).
const tage=x=>[...new Set((Array.isArray(x)?x:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<=6))].sort();
export function proposal(v,ids,habits){
  if(!v||typeof v!=="object")return null;
  const name=String(v.name||"").trim().slice(0,40);
  const txt=x=>String(x||"").trim().slice(0,UNIT_MAX);
  const zeit=String(v.zeit||"");
  if(v.art==="aendern"){
    const h=habits.find(x=>x.id===ids[(v.nr|0)-1]);
    if(!h)return null;
    // Was die KI nicht nennt, bleibt, wie es ist
    const d=tage(v.tage);
    const p={art:"aendern",id:h.id,was:h.name,name:name||h.name,target:v.ziel==null?h.target:clampT(v.ziel),unit:v.einheit==null?h.unit:txt(v.einheit),unit_pl:v.mehrzahl==null?h.unit_pl:txt(v.mehrzahl),
      days:d.length?d:h.days.slice(),daytime:DTRE.test(zeit)&&zeit?zeit:h.daytime};
    return p.name===h.name&&p.target===h.target&&p.unit===h.unit&&p.unit_pl===h.unit_pl&&p.daytime===h.daytime&&p.days.join()===h.days.join()?null:p; // ändert nichts
  }
  if(v.art!=="neu"||!name)return null;
  const days=tage(v.tage);
  return {art:"neu",name,days:days.length?days:[0,1,2,3,4,5,6],target:clampT(v.ziel),unit:txt(v.einheit),unit_pl:txt(v.mehrzahl),daytime:DTRE.test(zeit)?zeit:""};
}
