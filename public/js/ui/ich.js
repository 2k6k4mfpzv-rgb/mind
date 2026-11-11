// MIND – Ansicht "Ich": Profil und Einstellungen, Erinnerung (Push), Backup (kopieren und wiederherstellen).
import {RKEY} from "../config.js";
import {state,TI} from "../state.js";
import {norm} from "../logic.js";
import * as data from "../data.js";
import * as pwa from "../pwa.js";
import {$,esc} from "./dom.js";
import {render} from "./render.js";
import {hey} from "./heute.js";
import {renderSammlung} from "./sammlung.js";

const rem=state.rem;
const HM=/^([01]\d|2[0-3]):[0-5]\d$/;

// Erinnerung aus der Zeit vor dem Profil (vor A3 stand sie nur im Browser): wird einmal ins Profil übernommen (loadProf)
let oldRem={};try{oldRem=JSON.parse(localStorage.getItem(RKEY))||{}}catch(e){}

let savedT;
const flash=()=>{$("saved").textContent="Gespeichert";$("saved").classList.add("on");clearTimeout(savedT);savedT=setTimeout(()=>$("saved").classList.remove("on"),1500)};
const updProf=(o,quiet)=>data.updateProfile(o).then(done=>{if(done&&!quiet)flash()});

// --- Erinnerung als Push ---
// An/aus und Uhrzeit stehen im Profil und gelten für alle Geräte. Der Server schickt die Nachricht (höchstens eine am
// Tag, nur wenn noch etwas offen ist). Jedes Gerät entscheidet selbst, ob es sie bekommt: Zeile "Dieses Gerät".
const DEV={ // Zustand des Geräts (pushMode in logic.js) -> [Text, Knopf]
  on:["Bekommt die Erinnerung","Ausschalten"],
  off:["Bekommt die Erinnerung noch nicht","Einschalten"],
  blocked:["Benachrichtigungen sind für MIND gesperrt. Erlaube sie in den Einstellungen deines Geräts, dann geht es hier weiter.",""],
  home:["Auf dem iPhone geht das nur als App: in Safari auf „Teilen“ tippen, dann „Zum Home-Bildschirm“. Danach MIND von dort öffnen und hier einschalten.",""],
  none:["Dieser Browser kann keine Push-Nachrichten empfangen.",""],
  server:["Push ist auf dem Server noch nicht eingerichtet.","Einschalten"],
  error:["Das hat nicht geklappt. Versuch es später nochmal.","Einschalten"]
};
let dev="none";
export function devUi(mode){
  dev=mode;const [text,btn]=DEV[mode];
  $("remDev").hidden=!rem.on;$("remTime").disabled=!rem.on;
  $("remNote").textContent=text;$("remBtn").textContent=btn;$("remBtn").hidden=!btn;
}
const devNow=async()=>devUi(await pwa.pushState());
// fail = Grund, warum das Einschalten nicht geklappt hat (leer = hat geklappt)
const devAfter=async fail=>{if(fail&&fail!=="blocked")devUi(fail);else await devNow()};

export function profUi(){
  const prof=state.prof;if(!prof)return;
  $("pname").value=prof.name;hey();renderSammlung(); // Theme aus dem Profil anwenden
  let tz=[];try{tz=Intl.supportedValuesOf("timeZone")}catch(e){}
  if(!tz.includes(prof.timezone))tz.unshift(prof.timezone);
  $("ptz").innerHTML=tz.map(z=>`<option${z===prof.timezone?" selected":""}>${esc(z)}</option>`).join("");
  $("pplan").textContent=prof.plan==="free"?"Kostenlos":prof.plan;
  rem.on=prof.rem_on;rem.time=prof.rem_time;$("remOn").checked=rem.on;$("remTime").value=rem.time;devUi(dev);devNow();
}
export async function loadProf(){
  if(!await data.loadProfile())return;
  const prof=state.prof,up={};
  if(!prof.timezone){try{up.timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||""}catch(e){}if(!up.timezone)delete up.timezone}
  if(oldRem.on&&!prof.rem_on&&HM.test(oldRem.time||"")){up.rem_on=true;up.rem_time=oldRem.time} // einmalig: alte Erinnerung aus dem Browser übernehmen
  oldRem={};try{localStorage.removeItem(RKEY)}catch(e){}
  if(Object.keys(up).length)updProf(up,true);
  profUi();
  if(prof.rem_on)pwa.pushKeep();
}
$("pname").onchange=()=>{updProf({name:$("pname").value.trim()});hey()};
$("ptz").onchange=()=>updProf({timezone:$("ptz").value});

// Schalter an: gilt für alle Geräte. Dieses Gerät meldet sich gleich mit an, wenn es kann (der Tipp erlaubt die Frage
// nach der Erlaubnis). Schalter aus: Der Server schickt nichts mehr, die Anmeldungen der Geräte bleiben für später.
$("remOn").onchange=async()=>{
  rem.on=$("remOn").checked;updProf({rem_on:rem.on});devUi(dev);
  if(rem.on&&dev==="off")devAfter(await pwa.pushOn());
};
$("remBtn").onclick=async()=>{
  $("remBtn").disabled=true;
  if(dev==="on"){await pwa.pushOff();await devNow()}else await devAfter(await pwa.pushOn());
  $("remBtn").disabled=false;
};
$("remTime").onchange=()=>{if(!HM.test($("remTime").value))return;rem.time=$("remTime").value;updProf({rem_time:rem.time})};

// Backup: alle Habits mit Haken als Text. Das Format bleibt wie bisher (done pro Habit), alte Backups passen weiter.
const dump=()=>JSON.stringify({habits:state.habits,rem:{on:rem.on,time:rem.time}},null,1);
$("copy").onclick=async()=>{
  const v=dump();
  try{await navigator.clipboard.writeText(v)}catch(e){const t=$("data");t.closest("details").open=true;t.value=v;t.select();try{document.execCommand("copy")}catch(_){}}
  $("copy").textContent="Kopiert";setTimeout(()=>$("copy").textContent="Daten kopieren",1500);
};
$("imp").onclick=async()=>{
  try{
    const o=JSON.parse($("data").value);if(!Array.isArray(o.habits))throw 0;
    const rows=o.habits.map((h,k)=>{const n=norm({name:String(h.name||"Habit"),days:h.days,cat:String(h.cat||""),created:h.created,done:h.done,target:h.target,daytime:h.daytime,color:h.color,icon:h.icon,settings_log:h.settings_log,unit:h.unit,unit_pl:h.unit_pl,paused:h.paused},TI);return{name:n.name,days:n.days,cat:n.cat,created:n.created,done:n.done,pos:k+1,target:n.target,daytime:n.daytime,color:n.color,icon:n.icon,settings_log:n.settings_log,unit:n.unit,unit_pl:n.unit_pl,paused:n.paused}});
    await data.replaceAll(rows);
    if(o.rem&&HM.test(o.rem.time||"")){rem.on=!!o.rem.on;rem.time=o.rem.time;updProf({rem_on:rem.on,rem_time:rem.time})}
    $("remOn").checked=rem.on;$("remTime").value=rem.time;devUi(dev);
    render();$("imp").textContent="Importiert";setTimeout(()=>$("imp").textContent="Importieren",1500);
  }catch(e){$("imp").textContent="Format passt nicht";setTimeout(()=>$("imp").textContent="Importieren",2000)}
};
