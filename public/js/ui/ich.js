// MIND – Ansicht "Ich": Profil und Einstellungen, Erinnerung, Backup (kopieren und wiederherstellen).
import {RKEY} from "../config.js";
import {state,TI} from "../state.js";
import {iso,norm,sched,ok} from "../logic.js";
import * as data from "../data.js";
import {$,esc} from "./dom.js";
import {render} from "./render.js";
import {hey} from "./heute.js";
import {renderSammlung} from "./sammlung.js";

const rem=state.rem;
const HM=/^([01]\d|2[0-3]):[0-5]\d$/;
const REMTXT="Funktioniert nur, solange MIND im Browser geöffnet ist.",NOPERM="Auf diesem Gerät sind Benachrichtigungen noch nicht erlaubt.";

// Erinnerung an/aus und Uhrzeit stehen im Profil (Datenbank). Im Browser bleibt nur "last" (heute schon erinnert).
// oldRem = alte Einstellung aus dem Browser (vor A3), wird einmalig ins Profil übernommen (siehe loadProf).
let oldRem={};try{oldRem=JSON.parse(localStorage.getItem(RKEY))||{}}catch(e){}rem.last=oldRem.last||"";
const save=()=>{try{localStorage.setItem(RKEY,JSON.stringify({last:rem.last}))}catch(e){}};

let savedT;
const flash=()=>{$("saved").textContent="Gespeichert";$("saved").classList.add("on");clearTimeout(savedT);savedT=setTimeout(()=>$("saved").classList.remove("on"),1500)};
const updProf=(o,quiet)=>data.updateProfile(o).then(done=>{if(done&&!quiet)flash()});

// Erlaubnis gilt pro Gerät: Ist die Erinnerung an, aber hier nicht erlaubt, Hinweis und Knopf zeigen
function permUi(){
  const need=rem.on&&"Notification" in window&&Notification.permission!=="granted";
  $("remPerm").hidden=!need;$("remTime").disabled=!rem.on;
  if(need)$("remNote").textContent=NOPERM;else if($("remNote").textContent===NOPERM)$("remNote").textContent=REMTXT;
}
export function profUi(){
  const prof=state.prof;if(!prof)return;
  $("pname").value=prof.name;hey();renderSammlung(); // Theme aus dem Profil anwenden
  let tz=[];try{tz=Intl.supportedValuesOf("timeZone")}catch(e){}
  if(!tz.includes(prof.timezone))tz.unshift(prof.timezone);
  $("ptz").innerHTML=tz.map(z=>`<option${z===prof.timezone?" selected":""}>${esc(z)}</option>`).join("");
  $("pplan").textContent=prof.plan==="free"?"Kostenlos":prof.plan;
  rem.on=prof.rem_on;rem.time=prof.rem_time;$("remOn").checked=rem.on;$("remTime").value=rem.time;permUi();
}
export async function loadProf(){
  if(!await data.loadProfile())return;
  const prof=state.prof,up={};
  if(!prof.timezone){try{up.timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||""}catch(e){}if(!up.timezone)delete up.timezone}
  if(oldRem.on&&!prof.rem_on&&HM.test(oldRem.time||"")){up.rem_on=true;up.rem_time=oldRem.time} // einmalig: alte Erinnerung aus dem Browser übernehmen
  oldRem={};
  if(Object.keys(up).length)updProf(up,true);
  save();profUi();
}
$("pname").onchange=()=>{updProf({name:$("pname").value.trim()});hey()};
$("ptz").onchange=()=>updProf({timezone:$("ptz").value});

async function askPerm(){
  try{
    if(!("Notification" in window))throw 0;
    if(await Notification.requestPermission()!=="granted"){$("remNote").textContent="Benachrichtigungen sind blockiert. Erlaube sie in den Browser-Einstellungen.";return false}
  }catch(e){$("remNote").textContent="Dein Browser unterstützt hier keine Benachrichtigungen.";return false}
  $("remNote").textContent=REMTXT;return true;
}
$("remOn").onchange=async()=>{
  rem.on=$("remOn").checked;
  if(rem.on&&!await askPerm()){rem.on=false;$("remOn").checked=false}
  updProf({rem_on:rem.on});permUi();
};
$("remPerm").onclick=async()=>{await askPerm();permUi()};
$("remTime").onchange=()=>{if(!HM.test($("remTime").value))return;rem.time=$("remTime").value;rem.last="";save();updProf({rem_time:rem.time})};
// Erinnerung: einmal am Tag ab der eingestellten Uhrzeit, wenn noch Habits offen sind. Nur solange MIND geöffnet ist.
// (Paket 2 ersetzt das durch echte Push-Benachrichtigungen.)
setInterval(()=>{
  if(!rem.on)return;
  const n=new Date(),hm=String(n.getHours()).padStart(2,"0")+":"+String(n.getMinutes()).padStart(2,"0"),ti=iso(n);
  if(hm<rem.time||rem.last===ti)return;
  const open=state.habits.filter(h=>sched(h,n)&&!ok(h,ti));rem.last=ti;save();
  if(open.length){try{new Notification("MIND",{body:open.length+" noch offen: "+open.slice(0,3).map(h=>h.name).join(", ")})}catch(e){}}
},30000);

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
    $("remOn").checked=rem.on;$("remTime").value=rem.time;permUi();
    render();$("imp").textContent="Importiert";setTimeout(()=>$("imp").textContent="Importieren",1500);
  }catch(e){$("imp").textContent="Format passt nicht";setTimeout(()=>$("imp").textContent="Importieren",2000)}
};
