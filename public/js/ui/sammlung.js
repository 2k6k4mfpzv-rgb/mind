// MIND – Ansicht "Sammlung": Themes (Farbwelten), die man mit Tagen insgesamt freischaltet. Man verliert nie etwas.
// Dazu die kleine Karte im Verlauf zum nächsten Theme. Ruhig: kein Popup, kein Punkt an der Tab-Leiste.
// Das gewählte Theme steht im Profil (gilt auf allen Geräten) und als data-theme am <html> (Farben in css/tokens.css).
import {THEMES,TKEY,SKEY} from "../config.js";
import {state} from "../state.js";
import {daysTotal,themeOk,nextTheme} from "../logic.js";
import * as data from "../data.js";
import {$,CHECK} from "./dom.js";
import {onRender} from "./render.js";

const root=document.documentElement;
const ls={get:k=>{try{return localStorage.getItem(k)||""}catch(e){return ""}},set:(k,v)=>{try{v?localStorage.setItem(k,v):localStorage.removeItem(k)}catch(e){}}};
// Tage insgesamt: der höhere Wert aus den Haken und dem gemerkten Höchststand im Profil
const days=()=>Math.max(daysTotal(state.habits),state.prof&&state.prof.days_total||0);
const plural=n=>n===1?"Tag":"Tage";

// Theme anwenden. Das Gerät merkt es sich, damit die Seite beim nächsten Start gleich in der richtigen Farbe erscheint
// (index.html liest denselben Eintrag). Die Farbe der Browser-Leiste zieht mit.
function apply(key){
  if(key)root.dataset.theme=key;else delete root.dataset.theme;
  ls.set(TKEY,key);
  const bg=getComputedStyle(root).getPropertyValue("--bg").trim();
  if(bg)document.querySelectorAll('meta[name="theme-color"]').forEach(m=>{m.content=bg});
}
export const resetTheme=()=>apply(""); // abgemeldet: zurück zum Standard
// Solange das Profil noch nicht geladen ist, bleibt das Theme, das dieses Gerät sich gemerkt hat
const current=()=>state.prof?(themeOk(state.prof.theme,days())?state.prof.theme:""):root.dataset.theme||"";
try{matchMedia("(prefers-color-scheme:dark)").addEventListener("change",()=>apply(current()))}catch(e){} // hell/dunkel wechselt

// Neu freigeschaltet = frei, aber auf diesem Gerät noch nicht in der Sammlung gesehen
const seen=()=>+ls.get(SKEY)||0;
const fresh=n=>THEMES.filter(t=>n>=t[2]&&t[2]>seen());
let neu=[]; // Themes, die beim Öffnen der Sammlung neu waren (bleiben markiert, bis man den Tab verlässt)
export function openSammlung(){const n=days();neu=fresh(n).map(t=>t[0]);ls.set(SKEY,String(n));renderSammlung()}

const preview=key=>`<span class="tp" data-theme="${key||"puls"}" aria-hidden="true"><i></i><i></i><b></b><em></em><em></em></span>`;
const bar=(n,of)=>`<span class="thb"><i style="width:${Math.min(100,Math.round(n/of*100))}%"></i></span>`;

export function renderSammlung(){
  const n=days(),cur=current(),next=nextTheme(n);
  if((root.dataset.theme||"")!==cur)apply(cur);
  $("smN").textContent=n;
  $("smP").innerHTML=next?`noch ${next[2]-n} ${plural(next[2]-n)} bis<br>„${next[1]}“`:"Alle Themes<br>freigeschaltet";
  $("ths").innerHTML=[["","Puls",0]].concat(THEMES).map(([k,name,d])=>{
    if(n<d)return `<div class="th">${preview(k)}<span class="thn"><b>${name}</b><small>noch ${d-n} ${plural(d-n)}</small>${bar(n,d)}</span></div>`;
    const on=k===cur;
    return `<button class="th" role="radio" aria-checked="${on}" data-th="${k}">${preview(k)}<span class="thn"><b>${name}</b><small>${on?"Aktiv":neu.includes(k)?"Neu freigeschaltet":k?"Freigeschaltet":"Standard"}</small></span>${on?`<span class="tho">${CHECK}</span>`:""}</button>`;
  }).join("");
  // Karte im Verlauf: ein neu freigeschaltetes Theme, sonst der Weg zum nächsten. Sind alle frei und gesehen, verschwindet sie.
  const f=fresh(n).pop(),c=$("thc");
  c.hidden=!f&&!next;
  if(f)c.innerHTML=`<span class="thcT"><span class="cap">Sammlung</span><b>Theme „${f[1]}“ ist frei</b><small>Tippen, um es in der Sammlung anzusehen</small></span>${preview(f[0])}`;
  else if(next)c.innerHTML=`<span class="thcT"><span class="cap">Sammlung</span><b>Theme „${next[1]}“</b><small>${n} von ${next[2]} Tagen · zählt insgesamt, nicht am Stück</small>${bar(n,next[2])}</span>${preview(next[0])}`;
}
onRender(renderSammlung);

// Freies Theme antippen: sofort anwenden und im Profil speichern. Klappt das Speichern nicht, nimmt data.js es zurück
// und meldet "profile", dann zeichnet ich.js alles wieder mit dem alten Theme.
$("ths").onclick=e=>{
  const b=e.target.closest("button[data-th]");if(!b||!state.prof)return;
  data.updateProfile({theme:b.dataset.th});renderSammlung();
};
$("thc").onclick=()=>document.querySelector('#tabs [data-tab="sammlung"]').click();
