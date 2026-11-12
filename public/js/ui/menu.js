// MIND – Blatt der Kachel: Kachel lange drücken (Handy), Rechtsklick (Mac) oder Kontextmenü-Taste.
// Zeigt Name, Farbtupfer (ein Tipp = sofort geändert), Bearbeiten und Pausieren bzw. Fortsetzen.
// Ein normaler Tipp hakt weiter ab, und wer scrollt, löst nichts aus.
import {state,ui,today,TI} from "../state.js";
import {pauseOn,pauseList,resumeList,colKey,hexOf} from "../logic.js";
import * as data from "../data.js";
import {$,esc,icoOf,colsHtml,pauseLabel,SPARK,PRO} from "./dom.js";
import {render,onRender} from "./render.js";
import {editHtml,startEdit,bindEdit} from "./edit.js";

const dlg=$("menu");
const ICON={
  edit:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/></svg>',
  pause:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5v13M15 5.5v13"/></svg>',
  play:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>'
};

export const resume=h=>data.updateHabit(h,{paused:resumeList(h,today)});
// view: "main" (Übersicht) oder "pause" (direkt zum Pausieren, z. B. aus dem Verlauf)
export function openMenu(i,view){
  if(dlg.open||!state.habits[i])return;
  ui.menu={i,view:view||"main"};draw();dlg.showModal();
}
// Direkt zum Bearbeiten, mit Werten, die schon eingetragen sind (Vorschlag der KI "Anpassen", ui/ki.js)
export function openEdit(i,over){
  if(dlg.open||!state.habits[i])return;
  ui.menu={i,view:"edit"};startEdit(i,true);Object.assign(ui.ed,over,{more:true});draw();dlg.showModal();
}
// Schließen: aufräumen und neu zeichnen, damit "Heute" gleich den neuen Stand zeigt. done() läuft sofort und noch einmal,
// wenn der Browser das Schließen meldet (z. B. nach Escape). Der zweite Aufruf findet nichts mehr zu tun.
function done(){
  if(ui.ed&&ui.ed.sheet)ui.ed=null;
  if(!ui.menu)return;
  ui.menu=null;$("mnI").innerHTML="";render();
}
const close=()=>{if(dlg.open)dlg.close();done()};

function draw(){
  const m=ui.menu,h=m&&state.habits[m.i];
  if(!h||m.view==="edit"&&!ui.ed){close();return} // Habit weg, oder Bearbeiten ist fertig (gespeichert oder abgebrochen)
  const pz=pauseOn(h,TI),title={main:h.name,pause:"Pausieren",edit:"Bearbeiten"}[m.view];
  let x=`<i class="grab"></i><div class="shh"><span class="mh"><span class="ini" style="--c:${hexOf(h)}">${icoOf(h)}</span><b id="mnT">${esc(title)}</b></span><button type="button" class="del" data-mx="1">Schließen</button></div>`;
  if(m.view==="edit")x+=editHtml();
  else if(m.view==="pause")x+=`<p class="note first">Ab heute zählt „${esc(h.name)}“ nicht mehr als geplant. Deine Konstanz und deine Serie bleiben, wie sie sind.</p><label class="flab">Bis einschließlich (optional)<input type="date" id="mpto" min="${TI}"></label><p class="note">Ohne Datum pausiert es, bis du es fortsetzt. Mit Datum läuft es danach von selbst weiter.</p><div class="set"><button type="button" class="btn" data-mpok="1">Pausieren</button><button type="button" class="btn ghost" data-mback="1">Zurück</button></div>`;
  else x+=`${pz?`<p class="note first">${pauseLabel(pz)}. Pausierte Tage zählen nicht als verpasst.</p>`:""}<div class="flab">Farbe${colsHtml(colKey(h),"m")}</div><div class="mrows"><button type="button" data-medit="1">${ICON.edit}Bearbeiten</button>${pz?`<button type="button" data-mres="1">${ICON.play}Fortsetzen</button>`:`<button type="button" data-mpause="1">${ICON.pause}Pausieren</button>`}<button type="button" data-ki="mini" data-i="${m.i}">${SPARK}Mini-Version vorschlagen${PRO}</button></div>`;
  $("mnI").innerHTML=x;
}
onRender(()=>{if(dlg.open)draw()});

bindEdit(dlg); // das Bearbeiten-Formular im Blatt (ui/edit.js)
dlg.addEventListener("click",e=>{
  if(e.target===dlg){if(!hold)close();return} // neben das Blatt tippen schließt es
  const b=e.target.closest("button"),m=ui.menu;if(!b||!m||!dlg.open)return;
  const ds=b.dataset,h=state.habits[m.i];
  if(ds.mx||ds.ki)close(); // data-ki: Das Blatt macht Platz, den KI-Chat öffnet ui/ki.js
  else if(ds.mcol){data.updateHabit(h,{color:ds.mcol});render()}
  else if(ds.medit){m.view="edit";startEdit(m.i,true);draw()}
  else if(ds.mpause){m.view="pause";draw()}
  else if(ds.mback){m.view="main";draw()}
  else if(ds.mpok){data.updateHabit(h,{paused:pauseList(h,today,$("mpto").value)});close()}
  else if(ds.mres){resume(h);close()}
});
dlg.addEventListener("close",done);

// --- Lange drücken ---
// Eine halbe Sekunde auf der Kachel bleiben öffnet das Blatt. Bewegt sich der Finger (Scrollen) oder lässt er vorher
// los, passiert nichts Besonderes. hold = Finger ist nach dem Öffnen noch unten: Das Loslassen darf weder abhaken
// noch das Blatt gleich wieder schließen.
const LONG=500,MOVE=10,tiles=$("tiles");
let timer=0,sx=0,sy=0,hold=false;
const cancel=()=>{clearTimeout(timer);timer=0};
const release=()=>{cancel();if(hold)setTimeout(()=>{hold=false},300)};
const tileOf=e=>{const b=e.target.closest&&e.target.closest(".tile[data-t]");return b?+b.dataset.t:-1};
tiles.addEventListener("pointerdown",e=>{
  cancel();const i=tileOf(e);
  if(i<0||e.pointerType==="mouse")return; // mit der Maus: Rechtsklick
  sx=e.clientX;sy=e.clientY;
  timer=setTimeout(()=>{timer=0;hold=true;openMenu(i)},LONG);
});
tiles.addEventListener("pointermove",e=>{if(timer&&Math.hypot(e.clientX-sx,e.clientY-sy)>MOVE)cancel()});
["pointerup","pointercancel"].forEach(t=>addEventListener(t,release,true));
addEventListener("scroll",cancel,{capture:true,passive:true});
tiles.addEventListener("click",e=>{if(hold){e.stopPropagation();e.preventDefault()}},true); // der Tipp nach dem langen Drücken zählt nicht
// Rechtsklick und Kontextmenü-Taste (auf manchen Handys meldet sich so auch das lange Drücken)
tiles.addEventListener("contextmenu",e=>{const i=tileOf(e);if(i<0)return;e.preventDefault();cancel();openMenu(i)});
