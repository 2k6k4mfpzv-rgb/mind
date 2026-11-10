// MIND – Rechen-Logik. Nur reine Funktionen: kein DOM, kein Supabase, keine Uhr.
// "Heute" kommt immer als Parameter herein (today = Datum um 0 Uhr, ti = dasselbe als Text JJJJ-MM-TT).
// Dadurch lässt sich alles in tests/logik.html mit jedem beliebigen Tag nachrechnen.
import {COLS,HEX,ICO,TARGET_MAX} from "./config.js";

// --- Datum ---
export const iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
export const startOfDay=d=>{const x=new Date(d);x.setHours(0,0,0,0);return x};
export const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
export const wdi=d=>(d.getDay()+6)%7; // Wochentag, 0 = Montag bis 6 = Sonntag
export const monday=d=>addDays(d,-wdi(d));
export const DAYRE=/^\d{4}-\d\d-\d\d$/;

// --- Ein Habit in Form bringen ---
// Tagesziel (1 = einmal am Tag) und Tageszeit (leer = keine)
export const clampT=v=>Math.min(TARGET_MAX,Math.max(1,parseInt(v,10)||1));
export const DTRE=/^(morgen|mittag|abend|([01]\d|2[0-3]):[0-5]\d)$/;
export const daytimeOf=(dt,tm)=>{const v=dt==="zeit"?tm:dt;return DTRE.test(v||"")?v:""};
// Uhrzeit -> Morgen, Mittag oder Abend (für den Filter auf "Heute")
export const bucket=d=>!d||["morgen","mittag","abend"].includes(d)?d:d<"12:00"?"morgen":d<"17:00"?"mittag":"abend";

// norm: setzt Standardwerte, damit der Rest der App sich auf jedes Feld verlassen kann.
// h.done = {"JJJJ-MM-TT": Anzahl}. Die Haken kommen aus der Tabelle checkins (siehe data.js).
export function norm(h,ti){
  h.days=Array.isArray(h.days)&&h.days.length?h.days:[0,1,2,3,4,5,6];
  h.cat=h.cat||"";
  h.done=h.done&&typeof h.done==="object"?h.done:{};
  h.created=h.created||Object.keys(h.done).sort()[0]||ti;
  h.target=clampT(h.target);
  h.daytime=DTRE.test(h.daytime||"")?h.daytime:"";
  h.color=HEX[h.color]?h.color:"";
  h.icon=ICO[h.icon]?h.icon:"";
  h.settings_log=(Array.isArray(h.settings_log)?h.settings_log:[])
    .filter(e=>e&&DAYRE.test(e.until)&&Array.isArray(e.days))
    .map(e=>({until:e.until,days:e.days,target:clampT(e.target)}))
    .sort((a,b)=>a.until<b.until?-1:1);
  return h;
}

// --- Was galt an einem Tag? ---
// Frühere Einstellungen: settings_log = [{until, days, target}], aufsteigend nach Datum. Bis zum Tag "until"
// (ausschließlich) galten diese Tage und dieses Tagesziel. So zählen alte Haken weiter richtig, wenn man ein Habit später ändert.
export const cfg=(h,k)=>h.settings_log.find(e=>k<e.until)||h; // Einstellungen, die an Tag k galten
export const tg=(h,k)=>cfg(h,k).target;                       // Tagesziel an Tag k
export const cnt=(h,k)=>+h.done[k]||0;                        // wie oft an Tag k erledigt
export const ok=(h,k)=>cnt(h,k)>=tg(h,k);                     // Tagesziel erreicht (nur das zählt als geschafft)
export const sched=(h,d)=>{const k=iso(d);return k>=h.created&&cfg(h,k).days.includes(wdi(d))}; // an Tag d geplant
export const tileP=(h,ti)=>Math.min(1,cnt(h,ti)/h.target);    // wie voll die Kachel heute ist (0 bis 1)
export const total=h=>Object.keys(h.done).filter(k=>ok(h,k)).length; // insgesamt so oft geschafft

// Ändern sich Tage oder Tagesziel, gelten die alten Einstellungen weiter für alle Tage bis gestern.
// Gibt die neue Liste zurück, oder null, wenn nichts zu merken ist (nichts geändert, Habit von heute,
// oder heute wurde schon einmal geändert: dann sind die Einstellungen von vor heute bereits gemerkt).
export function settingsLog(h,upd,ti){
  if(upd.target===h.target&&upd.days.join()===h.days.join()||h.created>=ti||h.settings_log.some(e=>e.until===ti))return null;
  return h.settings_log.concat({until:ti,days:h.days.slice(),target:h.target});
}

// --- Serie und Konstanz ---
// Faire Serie: Ein Fehltag pro Woche (Mo bis So) ist ein Puffertag, die Serie pausiert dann nur.
// Erst ein zweiter Fehltag in derselben Woche beendet sie. Heute zählt erst, wenn geschafft.
export function fair(okDay,planned,start,today){
  const ti=iso(today),used={};let n=0,d=new Date(today);
  for(let i=0;i<1500&&iso(d)>=start;i++,d=addDays(d,-1)){
    if(!planned(d))continue;
    if(okDay(d)){n++;continue}
    if(iso(d)===ti)continue;
    const w=iso(monday(d));if(used[w])break;used[w]=1;
  }
  return {n,free:!used[iso(monday(today))]};
}
export const streak=(h,today)=>fair(d=>ok(h,iso(d)),d=>sched(h,d),h.created,today).n; // Serie pro Habit
// Serie für den ganzen Tag: Ein Tag zählt, wenn mindestens ein Habit geschafft ist.
export function dayStreak(habits,today){
  const any=x=>habits.some(h=>ok(h,iso(x)));
  return fair(any,x=>any(x)||habits.some(h=>sched(h,x)),habits.reduce((m,h)=>h.created<m?h.created:m,iso(today)),today);
}
// [erledigt, geplant] von..bis (einschließlich), höchstens bis heute
export function range(habits,from,to,today){
  let c=0,s=0;
  for(let d=new Date(from);d<=to&&d<=today;d=addDays(d,1))
    habits.forEach(h=>{if(sched(h,d)){s++;if(ok(h,iso(d)))c++}});
  return [c,s];
}
// Konstanz: geschafft ÷ geplant in den letzten 30 Tagen, für eine Liste von Habits (Heute: alle, Verlauf: eins).
// Heute zählt erst mit, wenn geschafft, damit die Zahl morgens nicht absackt. null = nichts geplant.
export function konst(hs,today){
  let c=0,s=0;
  for(let i=0;i<30;i++){const d=addDays(today,-i),k=iso(d);hs.forEach(h=>{if(!sched(h,d))return;const y=ok(h,k);if(i||y){s++;if(y)c++}})}
  return s?Math.round(c/s*100):null;
}
// Tagesring: Anteil von heute (Mehrfach-Habits zählen anteilig). n = wie viele Habits heute geplant sind.
export function dayProgress(habits,today){
  const ti=iso(today),td=habits.filter(h=>sched(h,today));
  return {n:td.length,p:td.length?td.reduce((s,h)=>s+tileP(h,ti),0)/td.length:0};
}
// Muster: pro Wochentag [erledigt, geplant] der letzten 12 Wochen
export function weekdayPattern(habits,today){
  const agg=[0,1,2,3,4,5,6].map(()=>[0,0]);
  for(let i=0;i<84;i++){const d=addDays(today,-i);habits.forEach(h=>{if(sched(h,d)){agg[wdi(d)][1]++;if(ok(h,iso(d)))agg[wdi(d)][0]++}})}
  return agg;
}

// --- Farben ---
// Leere Farbe = feste Farbe aus der ID, damit sie beim Verschieben gleich bleibt
export const colKey=h=>h.color||COLS[[...String(h.id||h.name)].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,7)%COLS.length][0];
export const hexOf=h=>HEX[colKey(h)];
export const nextCol=habits=>{const n=k=>habits.filter(h=>colKey(h)===k).length;return COLS.map(c=>c[0]).reduce((a,k)=>n(k)<n(a)?k:a)}; // am wenigsten benutzte Farbe
