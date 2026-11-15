// MIND – Ansicht "Heute": Kacheln, die sich beim Antippen füllen, Tagesring, Konstanz-Karte, Filter nach Tageszeit.
import {state,ui,today,TI} from "../state.js";
import {sched,cnt,tileP,bucket,konst,dayProgress,dayStreak,hexOf,unitText,pauseOn} from "../logic.js";
import * as data from "../data.js";
import {$,esc,fmt,CHECK,dtLabel,icoOf,pauseLabel} from "./dom.js";
import {render,onRender} from "./render.js";
import {offerUndo} from "./toast.js";
import {openSheet} from "./sheet.js";
import {resume} from "./menu.js";

const RC=2*Math.PI*28; // Umfang des Tagesrings
const tileLab=h=>{const n=cnt(h,TI);return h.name+(h.target>1?`, ${n} von ${h.target}`:"")+(n>=h.target?", erledigt":"")};
// Unter dem Namen steht höchstens eine kurze Angabe: was noch fehlt ("noch 3 Gläser"), sonst die Tageszeit, sonst die Kategorie
function tileIn(h){
  const n=cnt(h,TI),done=n>=h.target,sub=unitText(h,n)||dtLabel(h.daytime)||h.cat;
  return `<span class="tr"><span class="ini">${icoOf(h)}</span>${done?`<span class="ok">${CHECK}</span>`:h.target>1?`<span class="cnt">${n}/${h.target}</span>`:""}</span><span class="bot"><b>${esc(h.name)}</b>${sub?`<small>${esc(sub)}</small>`:""}</span>`;
}

export const hey=()=>{$("hey").textContent=state.prof&&state.prof.name?"Hey "+state.prof.name:"Heute"};
// Welle oben auf der Füllung: vier Wellenlängen, doppelt so breit wie die Füllung. In css/components.css läuft sie ganz
// ruhig um genau die halbe Breite durch, deshalb sieht man keinen Sprung.
const WAVE='<svg class="wv" viewBox="0 0 200 10" preserveAspectRatio="none" aria-hidden="true"><path d="M0 10V5q12.5-6 25 0'+"t25 0".repeat(7)+'v5z"/></svg>';
const part=p=>p>0&&p<1; // halb voll: Nur dann ist die Welle zu sehen
let shownIds=null;      // Kacheln vom letzten Zeichnen: Nur wirklich neue erscheinen weich
const calm=()=>{try{return matchMedia("(prefers-reduced-motion:reduce)").matches}catch(e){return false}};

function renderHeute(){
  const habits=state.habits;
  $("date").textContent=fmt(today,{weekday:"long",day:"numeric",month:"short"});
  const td=habits.map((h,i)=>[h,i]).filter(([h])=>sched(h,today));
  const bs=["morgen","mittag","abend"].filter(b=>td.some(([h])=>bucket(h.daytime)===b));
  if(!bs.includes(ui.dfil))ui.dfil="";
  $("dchips").innerHTML=bs.length?[""].concat(bs).map(b=>`<button class="${ui.dfil===b?"on":""}" data-df="${b}" aria-pressed="${ui.dfil===b}">${b?dtLabel(b):"Alle"}</button>`).join(""):"";
  const empty=!data.loaded()?"":!habits.length?"Noch keine Habits. Leg dein erstes an.":!td.length?"Heute ist nichts geplant. Genieß den Tag.":"";
  const tile=([h,hi])=>{const p=tileP(h,TI);return `<button class="tile${part(p)?" part":""}${shownIds&&!shownIds.has(h.id)?" neu":""}" data-t="${hi}" style="--c:${hexOf(h)};--p:${p}" aria-pressed="${p>=1}" aria-label="${esc(tileLab(h))}"><span class="fill">${WAVE}</span><span class="tc" aria-hidden="true">${tileIn(h)}</span><span class="tc on" aria-hidden="true">${tileIn(h)}</span></button>`};
  $("tiles").innerHTML=(empty?`<p class="empty">${empty}</p>`:"")+td.filter(([h])=>!ui.dfil||bucket(h.daytime)===ui.dfil).map(tile).join("")
    +(data.loaded()?'<button class="tile add" data-new="1" style="--p:0"><span class="tc"><span class="tr"><span class="ini"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5.5v13M5.5 12h13"/></svg></span></span><span class="bot"><b>Neues Habit</b></span></span></button>':"");
  if(data.loaded())shownIds=new Set(td.map(([h])=>h.id));
  // Pausierte Habits: eine ruhige Zeile ganz unten, aufgeklappt mit "Fortsetzen"
  const pz=habits.map((h,i)=>[h,i,pauseOn(h,TI)]).filter(x=>x[2]);
  if(!pz.length)ui.pausOpen=false;
  $("paus").innerHTML=pz.length?`<button class="pzh" data-pzt="1" aria-expanded="${ui.pausOpen}">${pz.length} pausiert<span aria-hidden="true">${ui.pausOpen?"–":"+"}</span></button>`+(ui.pausOpen?pz.map(([h,i,p])=>`<div class="pzr"><span class="ini" style="--c:${hexOf(h)}">${icoOf(h)}</span><span class="pzn"><b>${esc(h.name)}</b><small>${pauseLabel(p)}</small></span><button class="btn ghost sm" data-pzr="${i}">Fortsetzen</button></div>`).join(""):""):"";
}

// Zahl im Tagesring: Nach einem Tipp zählt sie weich auf den neuen Wert, der Ring füllt sich dazu nach (CSS).
let pcNow=0,pcRaf=0;
function countTo(to,anim){
  cancelAnimationFrame(pcRaf);
  if(!anim||calm()||to===pcNow){pcNow=to;$("rv").textContent=to+"%";return}
  const from=pcNow,t0=performance.now();
  const step=t=>{const x=Math.min(1,(t-t0)/450);pcNow=x<1?Math.round(from+(to-from)*(1-Math.pow(1-x,3))):to;$("rv").textContent=pcNow+"%";if(x<1)pcRaf=requestAnimationFrame(step)};
  pcRaf=requestAnimationFrame(step);
}
let ringP=0;
function ring(anim){ // Tagesring, Konstanz-Karte und Serie
  const habits=state.habits,{n,p}=dayProgress(habits,today),pc=Math.floor(p*100+1e-9);
  $("ring").hidden=!n;
  $("rp").style.strokeDasharray=(p*RC).toFixed(1)+" "+RC.toFixed(1);$("rp").style.opacity=p>0?1:0; // bei 0 % keinen runden Punkt zeigen
  countTo(pc,anim);$("ring").setAttribute("aria-label",pc+" Prozent von heute geschafft");
  $("cheer").textContent=n&&p>=1?"Alles geschafft für heute.":"";
  if(anim&&p>=1&&ringP<1){$("ring").classList.remove("pop");void $("ring").offsetWidth;$("ring").classList.add("pop")}
  ringP=p;
  const k=konst(habits,today); // Konstanz der letzten 30 Tage, gleiche Rechnung wie die Ringe im Verlauf
  $("kc").hidden=k==null;
  $("kq").textContent=k==null?"":k+" %";
  const sr=dayStreak(habits,today);
  $("kn").innerHTML=(sr.n?`Serie ${sr.n} ${sr.n===1?"Tag":"Tage"}`:"Neue Serie")+"<br>"+(sr.free?"1 Puffertag frei":"Puffertag genutzt");
}
onRender(keep=>{if(!keep)renderHeute();ring(keep)});

$("dchips").onclick=e=>{const b=e.target.closest("button");if(b){ui.dfil=b.dataset.df;renderHeute()}};
$("paus").onclick=e=>{
  const b=e.target.closest("button");if(!b)return;
  if(b.dataset.pzt)ui.pausOpen=!ui.pausOpen;else resume(state.habits[+b.dataset.pzr]);
  render();
};
// Kachel antippen: +1, die Kachel füllt sich. Bei vollem Ziel zurück auf 0.
// Nur diese eine Kachel wird geändert (nicht neu gebaut), damit die Füllung animiert: Sie steigt mit einem kleinen
// Schwapper auf den neuen Stand (.slosh für knapp eine Sekunde), bei erreichtem Ziel ploppt der Haken.
$("tiles").addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  if(b.dataset.new){openSheet();return}
  const h=state.habits[+b.dataset.t];ui.pend=-1;
  const was=data.tap(h,TI,h.target);if(was)offerUndo(h,TI,was);
  const p=tileP(h,TI);
  b.style.setProperty("--p",p);b.setAttribute("aria-pressed",p>=1);b.setAttribute("aria-label",tileLab(h));
  b.querySelectorAll(".tc").forEach(x=>x.innerHTML=tileIn(h));
  b.classList.toggle("part",part(p));b.classList.remove("slosh","neu");void b.offsetWidth;b.classList.add("slosh");
  clearTimeout(b.sloshT);b.sloshT=setTimeout(()=>b.classList.remove("slosh"),950);
  render(true);
});
