// MIND – Ansicht "Verlauf": pro Habit eine Karte mit Punkte-Mosaik (12 Wochen) und Konstanz-Ring.
// Aufgeklappt: Woche zum Nachtragen, Bearbeiten, Verschieben, Löschen. Darunter Fortschritt und Muster.
import {DAYS,HEX} from "../config.js";
import {state,ui,today,TI} from "../state.js";
import {iso,addDays,monday,sched,cnt,tg,total,streak,konst,range,weekdayPattern,settingsLog,clampT,daytimeOf,colKey,hexOf} from "../logic.js";
import * as data from "../data.js";
import {$,esc,fmt,CHECK,dtLabel,icoOf,daysHtml,colsHtml,icosHtml,optsHtml} from "./dom.js";
import {render,onRender} from "./render.js";
import {offerUndo} from "./toast.js";

const M0=addDays(monday(today),-77); // Montag vor 11 Wochen: Das Mosaik zeigt 12 Wochen bis heute
const HR=2*Math.PI*23;               // Umfang des Konstanz-Rings

// Mosaik: Spalte = Woche, Zeile = Wochentag. Jeder der 84 Tage ist ein Punkt, auch vor dem Start und in der Zukunft
// (dann leer). Teilweise geschafft = der Punkt füllt sich anteilig. Heute hat einen feinen Ring.
export function mosaic(h){
  let m="";
  for(let i=0;i<84;i++){
    const d=addDays(M0,i),k=iso(d),f=d>today?0:Math.min(1,cnt(h,k)/tg(h,k)),c=[f>=1?"f":f>0?"p":"",k===TI?"t":""].filter(Boolean).join(" ");
    m+=`<i${c?` class="${c}"`:""}${f>0&&f<1?` style="--f:${f.toFixed(2)}"`:""}></i>`;
  }
  return m;
}
// Aufgeklappt: Woche zum Nachtragen, Serie, Knöpfe
function weekHtml(h,hi,li,len,start,tot){
  const s=streak(h,today);
  let x=`<div class="wk"><div class="nav"><button class="ic" data-wk="-1" aria-label="Vorherige Woche">‹</button><span class="cap">${fmt(start,{day:"numeric",month:"short"})} – ${fmt(addDays(start,6),{day:"numeric",month:"short"})}</span><button class="ic" data-wk="1" aria-label="Nächste Woche"${ui.offset>=0?" disabled":""}>›</button></div><div class="wkd">`;
  for(let i=0;i<7;i++){
    const d=addDays(start,i),k=iso(d),lab=`${esc(h.name)}, ${fmt(d,{weekday:"long",day:"numeric",month:"long"})}`;
    x+=`<span class="${k===TI?"t":""}">${DAYS[i]}`;
    if(!sched(h,d)&&!h.done[k])x+='<span class="c off"><i></i></span>';
    else{
      const n=cnt(h,k),t=tg(h,k),done=n>=t,st=done?"done":d>today?"up":k===TI?"due":"miss";
      x+=`<button class="c ${st}${n&&!done?" part":""}" ${d>today?"disabled":""} data-h="${hi}" data-k="${k}" aria-pressed="${done}" aria-label="${lab}${t>1?`, ${n} von ${t}`:""}">${done?CHECK:n?`<b>${n}</b>`:""}</button>`;
    }
    x+="</span>";
  }
  return x+`</div><p class="meta">Insgesamt ${tot}× geschafft · Serie ${s} ${s===1?"Tag":"Tage"}${h.target>1?" · "+h.target+"× täglich":""}${h.daytime?" · "+esc(dtLabel(h.daytime)):""}${h.cat?" · "+esc(h.cat):""}</p><div class="acts"><button data-up="${hi}" aria-label="${esc(h.name)} nach oben"${li===0?" disabled":""}>↑</button><button data-down="${hi}" aria-label="${esc(h.name)} nach unten"${li===len-1?" disabled":""}>↓</button><button data-edit="${hi}">Bearbeiten</button><button data-del="${hi}"${ui.pend===hi?' class="warn"':""}>${ui.pend===hi?"Wirklich löschen?":"Löschen"}</button></div></div>`;
}
function editHtml(){
  const ed=ui.ed;
  return `<div class="edit"><input id="en" value="${esc(ed.name)}" maxlength="40" aria-label="Name"><div class="days">${daysHtml(ed.days,"eday")}</div>${colsHtml(ed.col,"e")}${icosHtml(ed.ico,"e",HEX[ed.col])}<input id="ec" value="${esc(ed.cat)}" maxlength="20" placeholder="Kategorie (optional)" list="cats" aria-label="Kategorie"><details class="more"${ed.more?" open":""}><summary>Mehr Optionen</summary>${optsHtml("e",ed.tg,ed.dt,ed.tm)}</details><div class="set"><button class="btn" data-save="1">Speichern</button><button class="btn ghost" data-cancel="1">Abbrechen</button></div></div>`;
}
function card(h,hi,li,len,start){
  const tot=total(h),k=konst([h],today),o=ui.openId===h.id,hx=hexOf(h);
  const kr=`<span class="hr"><svg width="54" height="54" viewBox="0 0 54 54"><circle class="rt" cx="27" cy="27" r="23"/>${k?`<circle class="rp" cx="27" cy="27" r="23" style="stroke-dasharray:${(k/100*HR).toFixed(1)} ${HR.toFixed(1)}"/>`:""}</svg><b>${k==null?"–":k+"%"}</b></span>`;
  return `<div class="panel hc" style="--hc:${hx}"><button class="hh" data-open="${hi}" aria-expanded="${o}" aria-label="${esc(h.name)}: Konstanz ${k==null?"noch keine":k+" Prozent"}, insgesamt ${tot}-mal geschafft"><span class="hht"><span class="ini" style="--c:${hx}">${icoOf(h)}</span><b>${esc(h.name)}</b></span><span class="hb" aria-hidden="true"><span class="mo">${mosaic(h)}</span><span class="st">${kr}<small>Konstanz</small></span></span></button>${o?(ui.ed&&ui.ed.i===hi?editHtml():weekHtml(h,hi,li,len,start,tot)):""}</div>`;
}
function kpi(i,r){$("k"+i).innerHTML=r[0]+"<em>von "+r[1]+"</em>";$("b"+i).style.width=(r[1]?r[0]/r[1]*100:0)+"%"}

function renderVerlauf(){
  const habits=state.habits,cats=[...new Set(habits.map(h=>h.cat).filter(Boolean))];
  if(ui.filter&&!cats.includes(ui.filter))ui.filter="";
  $("chips").innerHTML=cats.length?['<button class="chip'+(ui.filter?"":" on")+'" data-f="">Alle</button>'].concat(cats.map(c=>`<button class="chip${ui.filter===c?" on":""}" data-f="${esc(c)}">${esc(c)}</button>`)).join(""):"";
  $("cats").innerHTML=cats.map(c=>`<option value="${esc(c)}">`).join(""); // Vorschläge für das Feld Kategorie

  const start=addDays(monday(today),ui.offset*7);
  const list=habits.map((h,i)=>[h,i]).filter(([h])=>!ui.filter||h.cat===ui.filter);
  $("grid").innerHTML=list.length?list.map(([h,hi],li)=>card(h,hi,li,list.length,start)).join(""):'<p class="empty">Noch keine Habits. Leg unter „Heute“ dein erstes an.</p>';

  const ws=monday(today),ms=new Date(today.getFullYear(),today.getMonth(),1),m3=addDays(today,-90);
  kpi(1,range(habits,ws,today,today));kpi(2,range(habits,ms,today,today));kpi(3,range(habits,m3,today,today));

  $("wd").innerHTML=weekdayPattern(habits,today).map((a,i)=>{const p=a[1]?Math.round(a[0]/a[1]*100):0;
    return `<div><b>${p}<em>%</em></b><p>${Array.from({length:10},(_,j)=>`<i class="${10-j<=Math.round(p/10)?"f":""}"></i>`).join("")}</p>${DAYS[i]}</div>`}).join("");
}
onRender(renderVerlauf);

// Bearbeiten: Formularwerte stehen in ui.ed, bis gespeichert oder abgebrochen wird
export function startEdit(i){
  const h=state.habits[i],z=h.daytime.includes(":");
  ui.ed={i,name:h.name,days:h.days.slice(),cat:h.cat,col:colKey(h),ico:h.icon,tg:h.target,dt:z?"zeit":h.daytime,tm:z?h.daytime:"",more:h.target>1||!!h.daytime};
}
export function saveEdit(){
  const ed=ui.ed,name=ed.name.trim();data.touch();
  if(!name){$("err").textContent="Der Name darf nicht leer sein.";return}
  if(!ed.days.length){$("err").textContent="Wähle mindestens einen Tag.";return}
  const h=state.habits[ed.i],upd={name,days:ed.days.slice().sort(),cat:ed.cat.trim(),color:ed.col,icon:ed.ico,target:clampT(ed.tg),daytime:daytimeOf(ed.dt,ed.tm)};
  const log=settingsLog(h,upd,TI);if(log)upd.settings_log=log; // alte Tage und altes Tagesziel gelten weiter bis gestern
  ui.ed=null;$("err").textContent="";
  data.updateHabit(h,upd);render();
}
function move(i,dir){
  const vis=state.habits.map((h,k)=>k).filter(k=>!ui.filter||state.habits[k].cat===ui.filter);
  const q=vis.indexOf(i)+dir;if(q<0||q>=vis.length)return;
  ui.pend=-1;ui.ed=null;
  data.swap(i,vis[q]);render();
}

$("chips").onclick=e=>{const b=e.target.closest("button");if(b){ui.filter=b.dataset.f;render()}};
$("grid").addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;data.touch();
  const ds=b.dataset,ed=ui.ed;
  if(ds.open!==undefined){const h=state.habits[+ds.open];ui.openId=ui.openId===h.id?null:h.id;ui.ed=null;ui.pend=-1;ui.offset=0;render();return}
  if(ds.wk){const v=ui.offset+ +ds.wk;if(v<=0){ui.offset=v;render()}return}
  if(ds.up!==undefined||ds.down!==undefined){move(+(ds.up??ds.down),ds.up!==undefined?-1:1);return}
  if(ds.edit!==undefined){ui.pend=-1;startEdit(+ds.edit);render();$("en")&&$("en").focus();return}
  if(ds.eday!==undefined){const i=+ds.eday;ed.days=ed.days.includes(i)?ed.days.filter(x=>x!==i):ed.days.concat(i);render();return}
  if(ds.ecol){ed.col=ds.ecol;render();return}
  if(ds.eico!==undefined){ed.ico=ds.eico;render();return}
  if(ds.cancel!==undefined){ui.ed=null;render();return}
  if(ds.save!==undefined){saveEdit();return}
  // Löschen in zwei Klicks ("Löschen", dann "Wirklich löschen?")
  if(ds.del!==undefined){const i=+ds.del;if(ui.pend===i){ui.pend=-1;ui.ed=null;data.deleteHabit(state.habits[i])}else ui.pend=i;render();return}
  // Tag in der Woche antippen: +1, bei erreichtem Ziel zurück auf 0 (Ziel 1 = an/aus)
  if(ds.k){ui.pend=-1;const h=state.habits[+ds.h],k=ds.k,was=data.tap(h,k,tg(h,k));if(was)offerUndo(h,k,was);render()}
});
$("grid").addEventListener("input",e=>{const ed=ui.ed;if(!ed)return;const t=e.target.id,v=e.target.value;if(t==="en")ed.name=v;if(t==="ec")ed.cat=v;if(t==="etg")ed.tg=v;if(t==="edt")ed.dt=v;if(t==="etm")ed.tm=v});
$("grid").addEventListener("toggle",e=>{if(ui.ed&&e.target.classList.contains("more"))ui.ed.more=e.target.open},true);
$("grid").addEventListener("keydown",e=>{if(!ui.ed||!["en","ec","etg"].includes(e.target.id))return;if(e.key==="Enter"){e.preventDefault();saveEdit()}if(e.key==="Escape"){ui.ed=null;render()}});
