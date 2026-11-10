// MIND – Habit bearbeiten: ein Formular für zwei Stellen, die Karte im Verlauf und das Blatt auf "Heute" (ui/menu.js).
// Die Formularwerte stehen in ui.ed, bis gespeichert oder abgebrochen wird.
import {HEX} from "../config.js";
import {state,ui,TI} from "../state.js";
import {settingsLog,clampT,daytimeOf,colKey} from "../logic.js";
import * as data from "../data.js";
import {$,esc,daysHtml,colsHtml,icosHtml,optsHtml} from "./dom.js";
import {render} from "./render.js";

export function editHtml(){
  const ed=ui.ed;
  return `<div class="edit"><input id="en" value="${esc(ed.name)}" maxlength="40" aria-label="Name"><div class="days">${daysHtml(ed.days,"eday")}</div>${colsHtml(ed.col,"e")}${icosHtml(ed.ico,"e",HEX[ed.col])}<input id="ec" value="${esc(ed.cat)}" maxlength="20" placeholder="Kategorie (optional)" list="cats" aria-label="Kategorie"><details class="more"${ed.more?" open":""}><summary>Mehr Optionen</summary>${optsHtml("e",ed.tg,ed.dt,ed.tm,ed.un,ed.up)}</details>${ed.err?`<p class="note" role="alert">${esc(ed.err)}</p>`:""}<div class="set"><button class="btn" data-save="1">Speichern</button><button class="btn ghost" data-cancel="1">Abbrechen</button></div></div>`;
}
// sheet = im Blatt auf "Heute" bearbeiten statt in der Verlauf-Karte
export function startEdit(i,sheet){
  const h=state.habits[i],z=h.daytime.includes(":");
  ui.ed={i,sheet:!!sheet,name:h.name,days:h.days.slice(),cat:h.cat,col:colKey(h),ico:h.icon,tg:h.target,dt:z?"zeit":h.daytime,tm:z?h.daytime:"",un:h.unit,up:h.unit_pl,more:h.target>1||!!h.daytime||!!h.unit,err:""};
}
export function saveEdit(){
  const ed=ui.ed,name=ed.name.trim();data.touch();
  ed.err=!name?"Der Name darf nicht leer sein.":!ed.days.length?"Wähle mindestens einen Tag.":"";
  if(ed.err){render();return}
  const h=state.habits[ed.i],upd={name,days:ed.days.slice().sort(),cat:ed.cat.trim(),color:ed.col,icon:ed.ico,target:clampT(ed.tg),daytime:daytimeOf(ed.dt,ed.tm),unit:ed.un.trim(),unit_pl:ed.up.trim()};
  const log=settingsLog(h,upd,TI);if(log)upd.settings_log=log; // alte Tage und altes Tagesziel gelten weiter bis gestern
  ui.ed=null;
  data.updateHabit(h,upd);render();
}
// Das Formular in einem Bereich bedienbar machen (el = die Karten im Verlauf oder das Blatt)
export function bindEdit(el){
  el.addEventListener("click",e=>{
    const b=e.target.closest("button"),ed=ui.ed;if(!b||!ed)return;
    const ds=b.dataset;
    if(ds.eday!==undefined){const i=+ds.eday;ed.days=ed.days.includes(i)?ed.days.filter(x=>x!==i):ed.days.concat(i);render()}
    else if(ds.ecol){ed.col=ds.ecol;render()}
    else if(ds.eico!==undefined){ed.ico=ds.eico;render()}
    else if(ds.cancel!==undefined){ui.ed=null;render()}
    else if(ds.save!==undefined)saveEdit();
  });
  el.addEventListener("input",e=>{const ed=ui.ed;if(!ed)return;const k={en:"name",ec:"cat",etg:"tg",edt:"dt",etm:"tm",eun:"un",eup:"up"}[e.target.id];if(k)ed[k]=e.target.value});
  el.addEventListener("toggle",e=>{if(ui.ed&&e.target.classList.contains("more"))ui.ed.more=e.target.open},true);
  el.addEventListener("keydown",e=>{if(!ui.ed||!["en","ec","etg","eun","eup"].includes(e.target.id))return;if(e.key==="Enter"){e.preventDefault();saveEdit()}if(e.key==="Escape"){ui.ed=null;render()}});
}
