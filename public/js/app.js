// MIND – Start der App: Verbindung zu Supabase, Login, Tab-Leiste, aktuell bleiben, Hinweise "Offline" und "Neue Version".
// Aufbau: config.js (feste Werte) -> logic.js (rechnen) -> state.js (Zustand) -> store.js (Speicher auf dem Gerät)
// -> data.js (Supabase) -> pwa.js (installierbare App, Push) -> ui/* (zeichnen).
import {SUPA_URL,SUPA_KEY} from "./config.js";
import {state,ui,TI} from "./state.js";
import {iso} from "./logic.js";
import * as data from "./data.js";
import * as pwa from "./pwa.js";
import {$} from "./ui/dom.js";
import {render} from "./ui/render.js";
import "./ui/verlauf.js";
import "./ui/sheet.js";
import {hey} from "./ui/heute.js";
import {loadProf,profUi} from "./ui/ich.js";
import {openSammlung,resetTheme} from "./ui/sammlung.js";
import "./ui/ki.js";

// Die Supabase-Bibliothek lädt index.html als eigenes Script (window.supabase)
data.connect(window.supabase.createClient(SUPA_URL,SUPA_KEY));
data.on("error",text=>{$("err").textContent=text});
data.on("profile",profUi);
// Daten geändert: neu zeichnen. Kommt die Änderung von einem anderen Gerät, nicht mitten ins Bearbeiten oder Anlegen platzen.
const busy=()=>ui.ed||document.querySelector("dialog[open]"); // gerade wird bearbeitet oder ein Blatt ist offen
data.on("change",from=>{if(from==="remote"&&busy())return;render()});

// --- Tab-Leiste (Heute, Verlauf, MIND, Sammlung, Ich). Der MIND-Knopf in der Mitte ist kein Bereich: Er öffnet den KI-Chat als Blatt (ui/ki.js). ---
const tab=v=>{document.querySelectorAll(".view").forEach(s=>s.hidden=s.id!=="v-"+v);document.querySelectorAll("#tabs button").forEach(b=>b.dataset.tab===v?b.setAttribute("aria-current","page"):b.removeAttribute("aria-current"));window.scrollTo(0,0);if(v==="sammlung")openSammlung()};
$("tabs").onclick=e=>{const b=e.target.closest("button");if(b&&b.dataset.tab)tab(b.dataset.tab)};
// Tageszeit "Uhrzeit" gewählt: das Uhrzeit-Feld daneben zeigen (im Blatt und beim Bearbeiten)
document.addEventListener("change",e=>{const t=e.target.dataset&&e.target.dataset.tm;if(t)$(t).hidden=e.target.value!=="zeit"});

// --- Aktuell bleiben ---
// Bleibt MIND lange offen (z. B. im Handy-Browser), beim Zurückkommen die Daten neu holen.
// Ist inzwischen ein neuer Tag, die Seite ganz neu laden, damit "heute" stimmt. Nie mitten beim Bearbeiten oder Anlegen.
function refresh(){
  if(document.hidden||$("app").hidden||busy())return;
  if(iso(new Date())!==TI){location.reload();return}
  data.load();loadProf();pwa.check();
}
document.addEventListener("visibilitychange",refresh);
addEventListener("pageshow",e=>{if(e.persisted)refresh()}); // Seite aus dem Zurück-Speicher des Browsers
setInterval(()=>{if(iso(new Date())!==TI||data.net().off)refresh()},60000); // Mitternacht, während MIND offen ist. Ohne Netz: nochmal versuchen

// --- Ohne Netz und neue Version: ruhige Hinweise oben ---
// Ohne Netz bleiben Haken stehen und werden nachgeschickt (data.js). Beim Laden holt data.load() sie zuerst nach.
data.on("net",()=>{
  const {off,n}=data.net();
  $("net").textContent=!off?"":n?`Offline. ${n} ${n===1?"Haken wird":"Haken werden"} nachgeschickt, sobald du wieder Netz hast.`:"Offline. Abhaken geht trotzdem und wird nachgeschickt.";
});
addEventListener("offline",data.offline);
addEventListener("online",refresh);
$("upd").onclick=pwa.update;
// Service Worker anmelden (public/sw.js). Nicht mit der nachgebauten Datenbank der Testseiten.
if(!window.MOCK)pwa.start(()=>{$("upd").hidden=false});

// --- Login ---
$("lf").onsubmit=async e=>{
  e.preventDefault();$("lerr").textContent="";
  const r=await data.signIn($("em").value.trim(),$("pw").value);
  if(r.error)$("lerr").textContent="Login fehlgeschlagen: "+r.error.message;
};
$("out").onclick=async()=>{await pwa.pushOff();await data.signOut();state.rem.on=false;ui.ki=null;resetTheme();hey();tab("heute");$("app").hidden=true;$("login").hidden=false;$("pw").value=""};

// --- Start ---
// Was dieses Gerät zuletzt wusste, sofort zeigen, auch ohne Netz. Danach meldet sich die Anmeldung und es wird frisch geladen.
if(await data.restore()){$("app").hidden=false;profUi();render()}
if(navigator.onLine===false)data.offline();
let started=false; // seit dem Öffnen schon einmal angemeldet geladen
data.onAuth((ev,s)=>{
  // Ohne Netz lässt sich eine abgelaufene Anmeldung nicht erneuern. Sie ist aber noch da: Der Stand vom Gerät bleibt stehen.
  if(!s&&data.stays())return;
  $("login").hidden=!!s;$("app").hidden=!s;
  if(s)$("pmail").textContent=s.user&&s.user.email||"";
  // !started: Die Anmeldung wurde erst später erneuert (TOKEN_REFRESHED), z. B. weil beim Start kein Netz da war
  if(s&&(ev==="INITIAL_SESSION"||ev==="SIGNED_IN"||!started)){started=true;setTimeout(()=>{data.load();loadProf();data.watch()},0)}
  if(!s){started=false;data.clear();state.rem.on=false;ui.ki=null;resetTheme();$("pw").value=""}
});
