// MIND – Start der App: Verbindung zu Supabase, Login, Tab-Leiste, aktuell bleiben.
// Aufbau: config.js (feste Werte) -> logic.js (rechnen) -> state.js (Zustand) -> data.js (Supabase) -> ui/* (zeichnen).
import {SUPA_URL,SUPA_KEY} from "./config.js";
import {state,ui,TI} from "./state.js";
import {iso} from "./logic.js";
import * as data from "./data.js";
import {$} from "./ui/dom.js";
import {render} from "./ui/render.js";
import "./ui/verlauf.js";
import "./ui/sheet.js";
import {hey} from "./ui/heute.js";
import {loadProf,profUi} from "./ui/ich.js";

// Die Supabase-Bibliothek lädt index.html als eigenes Script (window.supabase)
data.connect(window.supabase.createClient(SUPA_URL,SUPA_KEY));
data.on("error",text=>{$("err").textContent=text});
data.on("profile",profUi);
// Daten geändert: neu zeichnen. Kommt die Änderung von einem anderen Gerät, nicht mitten ins Bearbeiten oder Anlegen platzen.
data.on("change",from=>{if(from==="remote"&&(ui.ed||$("sheet").open))return;render()});

// --- Tab-Leiste (Heute, Verlauf, Ich). Paket 3 setzt den MIND-Knopf in die Mitte, die Leiste verteilt die Knöpfe von selbst. ---
const tab=v=>{document.querySelectorAll(".view").forEach(s=>s.hidden=s.id!=="v-"+v);document.querySelectorAll("#tabs button").forEach(b=>b.dataset.tab===v?b.setAttribute("aria-current","page"):b.removeAttribute("aria-current"));window.scrollTo(0,0)};
$("tabs").onclick=e=>{const b=e.target.closest("button");if(b)tab(b.dataset.tab)};
// Tageszeit "Uhrzeit" gewählt: das Uhrzeit-Feld daneben zeigen (im Blatt und beim Bearbeiten)
document.addEventListener("change",e=>{const t=e.target.dataset&&e.target.dataset.tm;if(t)$(t).hidden=e.target.value!=="zeit"});

// --- Aktuell bleiben ---
// Bleibt MIND lange offen (z. B. im Handy-Browser), beim Zurückkommen die Daten neu holen.
// Ist inzwischen ein neuer Tag, die Seite ganz neu laden, damit "heute" stimmt. Nie mitten beim Bearbeiten oder Anlegen.
function refresh(){
  if(document.hidden||$("app").hidden||ui.ed||$("sheet").open)return;
  if(iso(new Date())!==TI){location.reload();return}
  data.load();loadProf();
}
document.addEventListener("visibilitychange",refresh);
addEventListener("pageshow",e=>{if(e.persisted)refresh()}); // Seite aus dem Zurück-Speicher des Browsers
setInterval(()=>{if(iso(new Date())!==TI)refresh()},60000); // Mitternacht, während MIND offen ist

// --- Login ---
$("lf").onsubmit=async e=>{
  e.preventDefault();$("lerr").textContent="";
  const r=await data.signIn($("em").value.trim(),$("pw").value);
  if(r.error)$("lerr").textContent="Login fehlgeschlagen: "+r.error.message;
};
$("out").onclick=async()=>{await data.signOut();state.rem.on=false;hey();tab("heute");$("app").hidden=true;$("login").hidden=false;$("pw").value=""};
data.onAuth((ev,s)=>{
  $("login").hidden=!!s;$("app").hidden=!s;
  if(s)$("pmail").textContent=s.user&&s.user.email||"";
  if(s&&(ev==="INITIAL_SESSION"||ev==="SIGNED_IN"))setTimeout(()=>{data.load();loadProf();data.watch()},0);
  if(!s){data.clear();state.rem.on=false;$("pw").value=""}
});

// Platz für Paket 2: Hier wird der Service Worker angemeldet (offline und Push).
