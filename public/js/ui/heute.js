// MIND – Ansicht "Heute": Kacheln, die sich beim Antippen füllen, Tagesring, Konstanz-Karte, Filter nach Tageszeit.
import {state,ui,today,TI} from "../state.js";
import {sched,cnt,tileP,bucket,konst,dayProgress,dayStreak,hexOf} from "../logic.js";
import * as data from "../data.js";
import {$,esc,fmt,CHECK,dtLabel,icoOf} from "./dom.js";
import {render,onRender} from "./render.js";
import {offerUndo} from "./toast.js";
import {openSheet} from "./sheet.js";

const RC=2*Math.PI*28; // Umfang des Tagesrings
const tileLab=h=>{const n=cnt(h,TI);return h.name+(h.target>1?`, ${n} von ${h.target}`:"")+(n>=h.target?", erledigt":"")};
function tileIn(h){
  const n=cnt(h,TI),done=n>=h.target,sub=[h.target>1&&!done?`noch ${h.target-n}×`:"",dtLabel(h.daytime),h.cat].filter(Boolean).join(" · ");
  return `<span class="tr"><span class="ini">${icoOf(h)}</span>${done?`<span class="ok">${CHECK}</span>`:h.target>1?`<span class="cnt">${n}/${h.target}</span>`:""}</span><span class="bot"><b>${esc(h.name)}</b>${sub?`<small>${esc(sub)}</small>`:""}</span>`;
}

export const hey=()=>{$("hey").textContent=state.prof&&state.prof.name?"Hey "+state.prof.name:"Heute"};

function renderHeute(){
  const habits=state.habits;
  $("date").textContent=fmt(today,{weekday:"long",day:"numeric",month:"short"});
  const td=habits.map((h,i)=>[h,i]).filter(([h])=>sched(h,today));
  const bs=["morgen","mittag","abend"].filter(b=>td.some(([h])=>bucket(h.daytime)===b));
  if(!bs.includes(ui.dfil))ui.dfil="";
  $("dchips").innerHTML=bs.length?[""].concat(bs).map(b=>`<button class="${ui.dfil===b?"on":""}" data-df="${b}" aria-pressed="${ui.dfil===b}">${b?dtLabel(b):"Alle"}</button>`).join(""):"";
  const empty=!habits.length?"Noch keine Habits. Leg dein erstes an.":!td.length?"Heute ist nichts geplant. Genieß den Tag.":"";
  $("tiles").innerHTML=(empty?`<p class="empty">${empty}</p>`:"")+td.filter(([h])=>!ui.dfil||bucket(h.daytime)===ui.dfil).map(([h,hi])=>`<button class="tile" data-t="${hi}" style="--c:${hexOf(h)};--p:${tileP(h,TI)}" aria-pressed="${tileP(h,TI)>=1}" aria-label="${esc(tileLab(h))}"><span class="fill"></span><span class="tc" aria-hidden="true">${tileIn(h)}</span><span class="tc on" aria-hidden="true">${tileIn(h)}</span></button>`).join("")
    +'<button class="tile add" data-new="1" style="--p:0"><span class="tc"><span class="tr"><span class="ini"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5.5v13M5.5 12h13"/></svg></span></span><span class="bot"><b>Neues Habit</b></span></span></button>';
}

let ringP=0;
function ring(anim){ // Tagesring, Konstanz-Karte und Serie
  const habits=state.habits,{n,p}=dayProgress(habits,today),pc=Math.floor(p*100+1e-9);
  $("ring").hidden=!n;
  $("rp").style.strokeDasharray=(p*RC).toFixed(1)+" "+RC.toFixed(1);$("rp").style.opacity=p>0?1:0; // bei 0 % keinen runden Punkt zeigen
  $("rv").textContent=pc+"%";$("ring").setAttribute("aria-label",pc+" Prozent von heute geschafft");
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
// Kachel antippen: +1, die Kachel füllt sich. Bei vollem Ziel zurück auf 0.
// Nur diese eine Kachel wird geändert (nicht neu gebaut), damit die Füllung animiert.
$("tiles").addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  if(b.dataset.new){openSheet();return}
  const h=state.habits[+b.dataset.t];ui.pend=-1;
  const was=data.tap(h,TI,h.target);if(was)offerUndo(h,TI,was);
  b.style.setProperty("--p",tileP(h,TI));b.setAttribute("aria-pressed",tileP(h,TI)>=1);b.setAttribute("aria-label",tileLab(h));
  b.querySelectorAll(".tc").forEach(x=>x.innerHTML=tileIn(h));
  render(true);
});
