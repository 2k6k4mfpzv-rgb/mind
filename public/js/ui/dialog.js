// MIND – Blätter (<dialog class="sheet">): öffnen, weich schließen, nach unten wischen.
// Alle Blätter (Neues Habit, Blatt der Kachel, KI-Chat) gehen hier durch, damit sie sich gleich anfühlen.
// Das Aussehen der Bewegung steht in css/components.css ("Blätter"), hier steht nur der Ablauf.
const OUT=170; // so lange gleitet ein Blatt hinaus (Millisekunden, wie --t-out in css/tokens.css)
const calm=()=>{try{return matchMedia("(prefers-reduced-motion:reduce)").matches}catch(e){return false}}; // "Bewegung reduzieren"
const fin=new WeakMap(); // Blatt -> Funktion, die ein laufendes Schließen sofort zu Ende bringt

export const closing=d=>fin.has(d);            // gleitet gerade hinaus
export const isOpen=d=>d.open&&!fin.has(d);    // offen und bleibt es auch
export const settle=d=>{if(fin.has(d))fin.get(d)()}; // ein laufendes Schließen sofort beenden

// Öffnen. Der Fokus geht auf das Blatt selbst, nicht auf den ersten Knopf: So zeichnet der Browser keinen Rahmen um
// "Schließen". Mit der Tabulator-Taste geht es trotzdem beim ersten Feld weiter, und dort ist der Rahmen zu sehen.
export function openDlg(d){
  settle(d);
  if(d.open)return;
  d.style.transform="";d.showModal();
  const s=d.querySelector(".shi");if(s)s.focus({preventScroll:true});
}
// Schließen: Das Blatt gleitet hinaus, erst dann ist es wirklich zu. now = sofort (ein anderes Blatt übernimmt).
// Danach meldet das Blatt "shut", und zwar sofort. Das "close" des Browsers kommt verzögert, im Hintergrund noch später.
export function shut(d,now){
  if(!d.open||fin.has(d))return;
  let t=0;
  const end=()=>{
    clearTimeout(t);fin.delete(d);d.classList.remove("out");d.style.transform="";
    if(d.open)d.close();
    d.dispatchEvent(new Event("shut"));
  };
  if(now||calm()){end();return}
  fin.set(d,end);d.classList.add("out");t=setTimeout(end,OUT);
}

// Ein Blatt einrichten: Escape schließt weich, und am Handy schließt Ziehen nach unten (am Griff oder an der
// Kopfzeile, nicht an Knöpfen). Unter 90 Pixeln federt das Blatt zurück, ein schneller Wisch reicht auch.
// Muss vor den anderen Klick-Reglern des Blatts aufgerufen werden: Der Klick nach dem Ziehen zählt nicht.
export function bind(d){
  d.addEventListener("cancel",e=>{e.preventDefault();shut(d)});
  let y0=null,dy=0,t0=0,moved=false;
  d.addEventListener("pointerdown",e=>{
    moved=false;
    if(innerWidth>=820||closing(d)||!e.target.closest(".grab,.shh")||e.target.closest("button,input,a"))return;
    y0=e.clientY;dy=0;t0=e.timeStamp;
  });
  d.addEventListener("pointermove",e=>{
    if(y0==null)return;
    dy=Math.max(0,e.clientY-y0);if(dy>4)moved=true;
    d.style.transform=dy?`translateY(${dy}px)`:"";
  });
  const up=e=>{
    if(y0==null)return;
    const fast=dy>24&&dy/Math.max(1,e.timeStamp-t0)>.5;y0=null;
    if(dy>90||fast)shut(d);else d.style.transform="";
  };
  d.addEventListener("pointerup",up);d.addEventListener("pointercancel",up);
  d.addEventListener("click",e=>{if(moved){moved=false;e.stopImmediatePropagation()}},true);
}
