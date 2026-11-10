// MIND – Rückgängig: kurzer Hinweis über der Tab-Leiste (kein Popup).
// Hat ein Tipp mehr als einen Haken auf 0 gesetzt (z. B. Wasser 4 von 4), kann man sie 5 Sekunden lang zurückholen.
// Bei Ziel 1 reicht ein weiterer Tipp, dort erscheint nichts.
import {state} from "../state.js";
import * as data from "../data.js";
import {$,esc} from "./dom.js";
import {render} from "./render.js";

let undoT=0,undoF=null;
export function offerUndo(h,k,n){
  if(n<2)return;
  undoF=()=>{const x=state.habits.find(y=>y.id===h.id);if(!x)return;data.setCount(x,k,n);render()};
  $("undo").innerHTML=`<span>${esc(h.name)}: zurück auf 0</span><button type="button">Rückgängig</button>`;
  clearTimeout(undoT);undoT=setTimeout(hideUndo,5000);
}
function hideUndo(){$("undo").innerHTML="";undoF=null;clearTimeout(undoT)}
$("undo").onclick=e=>{if(!e.target.closest("button")||!undoF)return;const f=undoF;hideUndo();f()};
