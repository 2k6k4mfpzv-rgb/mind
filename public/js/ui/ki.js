// MIND – KI-Chat: das Blatt hinter dem MIND-Knopf und die vier Einstiege (Woche besprechen, Muster erklären,
// Mini-Version vorschlagen, Hilf mir formulieren).
// Regeln (Roadmap A5): Die KI schreibt nie zuerst. Sie tut nur etwas, wenn jemand den Knopf oder einen Einstieg
// antippt. Vorschläge übernimmt man mit "Übernehmen" oder "Anpassen", nichts ändert sich von selbst.
// Nach "Übernehmen" steht an der Karte "Rückgängig", solange der Chat offen ist (seit Paket 4).
// Das Gespräch steht nur in ui.ki, also nur solange MIND offen ist. Es wird nirgends gespeichert.
// Jeder Knopf mit data-ki="…" irgendwo in der App öffnet den Chat (data-ki="" = MIND-Knopf, sonst das Thema,
// data-i = welches Habit). So müssen die anderen Ansichten diese Datei nicht kennen.
import {state,ui,today,TI} from "../state.js";
import {nextCol} from "../logic.js";
import {summary,proposal,tageText,mengeText} from "../ki.js";
import * as data from "../data.js";
import {$,esc,dtLabel,SPARK,PRO,X} from "./dom.js";
import {render,onRender} from "./render.js";
import {openSheet} from "./sheet.js";
import {openEdit} from "./menu.js";
import {startEdit,saveEdit} from "./edit.js";
import {openDlg,shut,bind,isOpen,settle} from "./dialog.js";

const dlg=$("ki");
bind(dlg); // Escape und nach unten wischen schließen weich (ui/dialog.js)
const SEND='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5.5M5.5 12L12 5.5l6.5 6.5"/></svg>';
// Ruhige Hinweise statt Fehlermeldungen
const NOTE={
  netz:"MIND braucht dafür Netz. Sobald du wieder online bist, geht es weiter.",
  limit:"Für heute ist die KI aufgebraucht. Morgen geht es weiter.",
  setup:"Die KI ist auf dem Server noch nicht eingerichtet.",
  voll:"Gerade ist viel los. Versuch es gleich nochmal.",
  fehler:"Das hat gerade nicht geklappt. Versuch es nochmal."
};
const START={woche:"Lass uns meine Woche besprechen.",neu:"Ich möchte ein neues Habit planen."};

// kind = Thema (frei, woche, neu, mini, muster, formulieren), msgs = [{role, text, vor, done, undo}], view = "chat" | "pro",
// shown = so viele Nachrichten waren schon zu sehen (nur neue gleiten herein)
const fresh=kind=>{ui.ki={kind:kind||"frei",msgs:[],busy:false,note:"",view:"chat",focus:null,shown:0}};

// Chat öffnen. Ohne Thema (MIND-Knopf) bleibt ein laufendes Gespräch stehen, mit Thema fängt ein neues an.
// opt = {i: welches Habit, text: getippte Idee aus "Neues Habit"}
export function openKi(kind,opt={}){
  if(isOpen(dlg))return;
  settle(dlg);
  if(kind||!ui.ki)fresh(kind);
  ui.ki.view="chat"; // die Pro-Seite ist kein Zustand, der bleibt: Beim nächsten Öffnen ist der Chat wieder da
  const k=ui.ki,h=opt.i!=null&&state.habits[opt.i];
  k.shown=k.msgs.length; // ein Gespräch, das schon da war, steht einfach da
  // Kopf wie im Konzept: Funke-Feld, "MIND", Plakette, rechts nur das X. "Neu anfangen" steht als Chip darunter.
  $("kiI").innerHTML=`<i class="grab"></i><div class="shh"><span class="mh"><span class="spk">${SPARK}</span><b id="kiT">MIND</b>${PRO}</span><button type="button" class="xb" data-kx="1" aria-label="Schließen">${X}</button></div><div id="kiB"></div>`;
  paint();openDlg(dlg);
  if(kind==="mini"&&h){k.focus=h.id;send(`Schlag mir eine Mini-Version für „${h.name}“ vor.`)}
  else if(kind==="muster"&&h){k.focus=h.id;send(`Erklär mir das Muster bei „${h.name}“.`)}
  else if(kind==="formulieren"&&opt.text)send(`Hilf mir, daraus ein konkretes Habit zu machen: „${opt.text}“`);
  else if(kind==="formulieren"){k.kind="neu";send(START.neu)}
  else if(START[kind])send(START[kind]);
}
const close=now=>shut(dlg,now); // now = ohne Hinausgleiten (ein anderes Blatt übernimmt)
// Ist der Chat zu, gilt ein übernommener Vorschlag als übernommen: "Rückgängig" gibt es danach nicht mehr.
const forget=()=>{if(ui.ki)ui.ki.msgs.forEach(m=>{m.undo=null})};
dlg.addEventListener("shut",forget);dlg.addEventListener("close",forget);

// --- Zeichnen ---
const lines=s=>esc(s).replace(/\n/g,"<br>");
// Karte unter einer Antwort: der Vorschlag mit "Übernehmen" und "Anpassen". Nach dem Übernehmen steht dort
// "Rückgängig" (solange der Chat offen ist). Das Wort "Vorschlag" davor setzt das CSS (.kiv small::before).
function card(m,i){
  const p=m.vor;if(!p)return "";
  const h=p.art==="neu"?null:state.habits.find(x=>x.id===p.id); // bei "ändern" steht nur dabei, was sich ändert
  const sub=(p.art==="neu"?[tageText(p.days),mengeText(p),dtLabel(p.daytime)]:[!h||p.days.join()!==h.days.join()?tageText(p.days):"",mengeText(p),!h||p.daytime!==h.daytime?dtLabel(p.daytime):""]).filter(Boolean).join(" · ");
  const btns=m.undo?`<div class="set"><button type="button" class="btn ghost sm" data-kun="${i}">Rückgängig</button></div>`
    :m.done?"":`<div class="set"><button type="button" class="btn sm" data-kok="${i}">Übernehmen</button><button type="button" class="btn ghost sm" data-kad="${i}">Anpassen</button></div>`;
  return `<div class="kiv"><small>${p.art==="neu"?"Neues Habit":"Statt „"+esc(p.was)+"“"}</small><b>${esc(p.name)}</b>${sub?`<span>${esc(sub)}</span>`:""}${m.done?`<em>${esc(m.done)}</em>`:""}${btns}</div>`;
}
const KSP=`<span class="ksp">${SPARK}</span>`; // kleines Funke-Feld links neben einer Antwort von MIND
// Antworten zum Antippen: nur unter der letzten Antwort von MIND und nur, solange nichts unterwegs ist. Ein Tipp schickt
// den Text so ab, als hätte man ihn selbst geschrieben. Schreiben geht daneben weiter wie immer.
const quick=(m,i,k)=>m.opts&&m.opts.length&&i===k.msgs.length-1&&!k.busy?`<div class="kia">${m.opts.map((t,j)=>`<button type="button" data-ka="${i}:${j}">${esc(t)}</button>`).join("")}</div>`:"";
function paint(){
  const k=ui.ki,box=$("kiB");if(!k||!box)return;
  const typed=$("kiQ")?$("kiQ").value:"",focus=document.activeElement&&document.activeElement.id==="kiQ";
  if(k.view==="pro"){ // faire Pro-Seite: erscheint erst, wenn Pro eingeführt ist und die Server-Funktion "pro" meldet
    box.innerHTML=`<div class="prox pp"><b>MIND Pro</b><p>Dein Coach für kleine Schritte.</p><ul><li>Woche besprechen, so oft du willst</li><li>Mini-Versionen für schlechte Tage</li><li>Muster erklären, für jedes Habit</li><li>Hilfe beim Formulieren neuer Habits</li><li>Chat mit MIND</li></ul><p class="pq">Preis folgt · monatlich kündbar</p></div><p class="note">Einmal im Monat ist „Woche besprechen“ gratis. Alles andere in MIND bleibt ohne Pro voll benutzbar.</p><div class="set"><button type="button" class="btn ghost" data-kx="1">Vielleicht später</button></div>`;
    return;
  }
  const off=data.net().off,note=k.note||(off?NOTE.netz:"");
  // Oben die Chips: im leeren Chat die zwei Einstiege (kein Einleitungstext), im laufenden Gespräch nur "Neu anfangen".
  const chips=k.msgs.length?'<button type="button" id="kiN" data-kn="1">Neu anfangen</button>':'<button type="button" data-kc="woche">Woche besprechen</button><button type="button" data-kc="neu">Neues Habit planen</button>';
  const neu=i=>i>=k.shown?" neu":""; // nur was neu dazukommt, gleitet herein
  const msgs=k.msgs.map((m,i)=>m.role==="user"?`<div class="kb u${neu(i)}">${lines(m.text)}</div>`:`<div class="kb a${neu(i)}"><span class="kt">${lines(m.text)}</span>${KSP}${card(m,i)}${quick(m,i,k)}</div>`).join("");
  const wait=k.busy?`<div class="kb a kw neu" role="status" aria-label="MIND denkt nach"><span class="kt kdots"><i></i><i></i><i></i></span>${KSP}</div>`:"";
  box.innerHTML=`<div class="kic">${chips}</div><div class="kim" id="kiM" role="log" aria-live="polite" aria-label="Gespräch mit MIND">${msgs}${wait}</div>${note?`<p class="note kin" role="status">${esc(note)}</p>`:""}<form class="kif" id="kiF"><input id="kiQ" maxlength="1000" placeholder="Schreib MIND …" autocomplete="off" enterkeyhint="send" aria-label="Nachricht an MIND"><button class="btn" aria-label="Senden"${k.busy?" disabled":""}>${SEND}</button></form>`;
  k.shown=k.msgs.length;
  $("kiQ").value=typed;if(focus)$("kiQ").focus();
  const m=$("kiM");m.scrollTop=m.scrollHeight; // immer das Neueste zeigen
}
// Kommt oder geht das Netz, während der Chat offen ist: den Hinweis nachziehen
data.on("net",()=>{
  const k=ui.ki;if(!k)return;
  if(!data.net().off&&k.note===NOTE.netz)k.note=""; // Netz ist zurück: Der Hinweis hat sich erledigt
  if(dlg.open&&!k.busy)paint();
});
// Karte "Woche besprechen" im Verlauf: nur, wenn es Habits gibt
onRender(()=>{$("kiW").hidden=!state.habits.length});

// --- Senden ---
async function send(text){
  const k=ui.ki;text=String(text||"").trim();
  if(!k||k.busy||!text)return;
  if(data.net().off){k.note=NOTE.netz;paint();if(!$("kiQ").value)$("kiQ").value=text;return} // ohne Netz gar nicht erst fragen
  const s=summary(state.habits,today,k.focus);
  k.msgs.push({role:"user",text});k.busy=true;k.note="";paint();
  // Frühere Vorschläge stehen als Text dabei, damit die KI weiß, was sie schon vorgeschlagen hat
  const r=await data.ki({kind:k.kind,ctx:s.text,msgs:k.msgs.map(m=>({role:m.role,content:m.text+(m.vor?`\n[Vorschlag: ${m.vor.name}]`:"")}))});
  if(ui.ki!==k)return; // inzwischen "Neu anfangen" oder abgemeldet
  k.busy=false;
  if(r&&typeof r.text==="string"&&r.text)k.msgs.push({role:"assistant",text:r.text,vor:proposal(r.vorschlag,s.ids,state.habits),opts:Array.isArray(r.antworten)?r.antworten.filter(t=>typeof t==="string"&&t.trim()).slice(0,4):[]});
  else{
    k.msgs.pop(); // die Frage kommt zurück ins Feld, nichts geht verloren
    if(r&&r.pro)k.view="pro";else k.note=NOTE[["netz","limit","setup","voll"].find(x=>r&&r[x])||"fehler"];
  }
  paint();
  if(k.view==="chat"&&!(r&&r.text)&&!$("kiQ").value)$("kiQ").value=text;
}

// --- Vorschlag übernehmen oder anpassen ---
async function take(m){
  const p=m.vor;
  if(data.net().off){ui.ki.note=NOTE.netz;paint();return}
  if(p.art==="neu"){
    const n=state.habits.length;
    await data.addHabit({name:p.name,days:p.days,cat:"",color:nextCol(state.habits),icon:"",created:TI,pos:state.habits.reduce((a,h)=>Math.max(a,h.pos||0),0)+1,target:p.target,daytime:p.daytime,unit:p.unit,unit_pl:p.unit_pl});
    if(state.habits.length>n){m.done="Angelegt. Du findest es unter „Heute“.";m.undo={neu:state.habits[state.habits.length-1].id}}else ui.ki.note=NOTE.fehler;
  }else{
    const i=state.habits.findIndex(h=>h.id===p.id);
    if(i<0)m.done="Dieses Habit gibt es nicht mehr.";
    else{ // derselbe Weg wie "Bearbeiten": alte Haken zählen weiter nach den alten Einstellungen (settings_log)
      const h=state.habits[i]; // Stand von vorher merken (nur im Speicher, keine neue Spalte), für "Rückgängig"
      m.undo={id:h.id,was:{name:h.name,target:h.target,unit:h.unit,unit_pl:h.unit_pl,days:h.days.slice(),daytime:h.daytime,settings_log:h.settings_log}};
      startEdit(i,true);Object.assign(ui.ed,over(p));saveEdit();
      m.done="Übernommen.";
    }
  }
  paint();
}
// Rückgängig: stellt das Habit auf den Stand von vor dem Übernehmen zurück (ein neu angelegtes verschwindet wieder).
// Danach steht die Karte wieder da wie vorher, mit "Übernehmen" und "Anpassen". Braucht Netz wie jede Änderung an Habits.
function untake(m){
  const u=m.undo;if(!u)return;
  if(data.net().off){ui.ki.note=NOTE.netz;paint();return}
  const h=state.habits.find(x=>x.id===(u.neu||u.id));
  if(h){if(u.neu)data.deleteHabit(h);else data.updateHabit(h,u.was)}
  m.undo=null;m.done="";ui.ki.note="";
  render();paint();
}
// Der Vorschlag in der Form, die "Bearbeiten" kennt (ui/edit.js): Tageszeit ist dort ein Wort oder "zeit" plus Uhrzeit
const over=p=>{const z=p.daytime.includes(":");return {name:p.name,tg:p.target,un:p.unit,up:p.unit_pl,days:p.days.slice(),dt:z?"zeit":p.daytime,tm:z?p.daytime:""}};
// Anpassen: das bekannte Formular öffnen, schon ausgefüllt. Das Gespräch bleibt hinter dem MIND-Knopf stehen.
function adapt(m){
  const p=m.vor;close(true);
  if(p.art==="neu"){openSheet(p);return}
  const i=state.habits.findIndex(h=>h.id===p.id);
  if(i>=0)openEdit(i,over(p));
}

dlg.addEventListener("click",e=>{
  if(e.target===dlg){close();return} // neben das Blatt tippen schließt es
  const b=e.target.closest("button"),k=ui.ki;if(!b||!k)return;
  const ds=b.dataset;
  if(ds.kx)close();
  else if(ds.kn){fresh();paint()}
  else if(ds.kc){if(k.busy)return;k.kind=ds.kc;send(START[ds.kc])}
  else if(ds.kok!==undefined){if(k.msgs[+ds.kok]&&!k.busy)take(k.msgs[+ds.kok])}
  else if(ds.kun!==undefined){if(k.msgs[+ds.kun])untake(k.msgs[+ds.kun])}
  else if(ds.kad!==undefined){if(k.msgs[+ds.kad])adapt(k.msgs[+ds.kad])}
  else if(ds.ka){const [i,j]=ds.ka.split(":"),m=k.msgs[+i];if(m&&m.opts&&m.opts[+j]&&!k.busy)send(m.opts[+j])}
});
dlg.addEventListener("submit",e=>{e.preventDefault();const q=$("kiQ"),v=q.value;if(ui.ki&&!ui.ki.busy&&v.trim()){q.value="";send(v)}});

// Einstiege überall in der App. Andere Blätter schließen sich vorher selbst (menu.js) oder werden hier geschlossen.
document.addEventListener("click",e=>{
  const b=e.target.closest&&e.target.closest("[data-ki]");if(!b)return;
  const kind=b.dataset.ki,i=b.dataset.i;
  let text="";
  if(kind==="formulieren"){text=$("inp").value.trim();$("inp").value="";shut($("sheet"),true)} // die Idee wandert in den Chat
  if(b.classList.contains("mind")){b.classList.remove("glim");void b.offsetWidth;b.classList.add("glim")} // MIND-Knopf: der Funke glimmt kurz
  openKi(kind||undefined,{i:i===undefined?null:+i,text});
});
