// MIND – Blatt "Neues Habit" (am Handy von unten, am Mac in der Mitte).
// Weitere Blätter (z. B. der KI-Chat aus Paket 3) bekommen eine eigene Datei nach diesem Muster.
import {HEX} from "../config.js";
import {state,ui,TI} from "../state.js";
import {clampT,daytimeOf,nextCol} from "../logic.js";
import * as data from "../data.js";
import {$,daysHtml,colsHtml,icosHtml,optsHtml} from "./dom.js";
import {render,onRender} from "./render.js";

const pickers=()=>{$("acol").innerHTML=colsHtml(ui.acol,"a");$("aico").innerHTML=icosHtml(ui.aico,"a",HEX[ui.acol])};
// Vorgewählt: die am wenigsten benutzte Farbe und kein Symbol (Anfangsbuchstabe).
// pre = Vorschlag der KI zum Anpassen (ui/ki.js): {name, days, target, daytime, unit, unit_pl} füllt das Formular vor.
export function openSheet(pre){
  ui.acol=nextCol(state.habits);ui.aico="";pickers();
  if(pre){
    const z=pre.daytime.includes(":");
    $("inp").value=pre.name;ui.sel=pre.days.slice();
    $("aopts").innerHTML=optsHtml("a",pre.target,z?"zeit":pre.daytime,z?pre.daytime:"",pre.unit,pre.unit_pl);
    $("form").querySelector(".more").open=pre.target>1||!!pre.daytime||!!pre.unit;
    render();
  }
  $("sheet").showModal();
}

onRender(()=>{$("days").innerHTML=daysHtml(ui.sel,"d")});
$("days").onclick=e=>{const b=e.target.closest("button");if(!b)return;const i=+b.dataset.d;ui.sel=ui.sel.includes(i)?ui.sel.filter(x=>x!==i):ui.sel.concat(i);render()};
$("acol").onclick=e=>{const b=e.target.closest("button");if(b){ui.acol=b.dataset.acol;pickers()}};
$("aico").onclick=e=>{const b=e.target.closest("button");if(b){ui.aico=b.dataset.aico;pickers()}};
$("shx").onclick=()=>$("sheet").close();
$("sheet").addEventListener("click",e=>{if(e.target===e.currentTarget)e.currentTarget.close()}); // neben das Blatt tippen schließt es
$("form").addEventListener("submit",e=>{
  e.preventDefault();const v=$("inp").value.trim();if(!v){$("inp").focus();return}
  if(!ui.sel.length)ui.sel=[0,1,2,3,4,5,6];
  data.addHabit({name:v,days:ui.sel.slice().sort(),cat:$("cat").value.trim(),color:ui.acol,icon:ui.aico,created:TI,pos:state.habits.reduce((m,h)=>Math.max(m,h.pos||0),0)+1,target:clampT($("atg").value),daytime:daytimeOf($("adt").value,$("atm").value),unit:$("aun").value.trim(),unit_pl:$("aup").value.trim()});
  $("inp").value="";$("aopts").innerHTML=optsHtml("a",1,"","","","");$("sheet").close();
});
$("aopts").innerHTML=optsHtml("a",1,"","","","");
