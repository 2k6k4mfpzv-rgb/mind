// MIND – Datenschicht: die einzige Stelle, die mit Supabase spricht.
// Prinzip: Jede Änderung wird sofort im Browser gezeigt (optimistisch) und dann gespeichert. Schlägt das Speichern
// fehl, wird sie zurückgenommen und oben erscheint ruhig eine Meldung (kein Popup).
// Haken stehen in der Tabelle checkins. Der Server zählt hoch (checkin_add), die App schickt nie eine ganze Liste.
// Dadurch geht kein Haken verloren, wenn zwei Geräte gleichzeitig abhaken.
// Ohne Netz: Haken bleiben stehen und warten in einer Warteschlange auf dem Gerät, bis sie nachgeschickt werden können.
// Alles andere (Habit ändern, Einstellungen) braucht Netz und wird sonst zurückgenommen.
import {state,TI} from "./state.js";
import {norm,cnt,daysTotal,DAYRE} from "./logic.js";
import {TARGET_MAX} from "./config.js";
import * as store from "./store.js";

// Spalten der Tabelle habits, die die App braucht (die alte Spalte done wird nicht mehr gelesen)
const HABIT_COLS="id,name,days,cat,created,pos,target,daytime,color,icon,settings_log,unit,unit_pl,paused,created_at";

let db=null;
export function connect(client){db=client}

// --- Bescheid geben: on("change") = Daten haben sich geändert, on("error") = Meldung (leer = alles gut), on("profile"),
// on("net") = offline oder wieder online, oder die Zahl der wartenden Haken hat sich geändert (siehe net()) ---
const subs={change:[],error:[],profile:[],net:[]};
export const on=(ev,fn)=>{subs[ev].push(fn)};
const emit=(ev,x)=>{subs[ev].forEach(f=>f(x));if(ev==="change"||ev==="profile")keep()};

// --- Netz ---
// Ohne Netz antwortet nicht Supabase, sondern der Browser meldet einen Fehler (status 0). "Server gerade nicht
// erreichbar" (502, 503, 504) zählt genauso: später nochmal versuchen. Alles andere ist eine echte Antwort.
const NETRE=/Failed to fetch|NetworkError|Load failed/;
const isNet=r=>!!(r&&r.error)&&(r.status===0||[502,503,504].includes(r.status)||r.status==null&&NETRE.test(r.error.message||""));
let off=false;
// Jede Anfrage läuft durch safe(): Auch ein Netzfehler wird zu {error}, und die App merkt, ob sie gerade Netz hat.
// Ist das Netz wieder da, gehen die wartenden Haken sofort raus.
function seen(r){
  const o=isNet(r);
  if(o!==off){off=o;emit("net");if(!o&&pend.length)setTimeout(flush,0)}
  return r;
}
const safe=p=>Promise.resolve(p).catch(e=>({data:null,error:{message:String(e&&e.message||e)}})).then(seen);
export const offline=()=>{if(!off){off=true;emit("net")}}; // der Browser meldet "kein Netz" (app.js)
export const net=()=>({off,n:pend.length});                // off = gerade kein Netz, n = so viele Haken warten noch
// Ergebnis einer Anfrage melden. Gibt true zurück, wenn sie fehlgeschlagen ist.
function failed(r){
  const e=r&&r.error;
  emit("error",!e?"":isNet(r)?"Kein Netz. Das wurde nicht gespeichert.":"Speichern fehlgeschlagen: "+e.message);
  return !!e;
}

const byId=id=>state.habits.find(h=>h.id===id);
const setLocal=(h,day,n)=>{if(n>0)h.done[day]=n;else delete h.done[day]};

// gen zählt eigene Änderungen, damit ein Neuladen, das schon unterwegs ist, sie nicht wieder überschreibt
let gen=0;
export const touch=()=>{gen++;keep()};

// --- Stand auf dem Gerät ---
// Der zuletzt bekannte Stand (Habits mit Haken, Profil) wird kurz nach jeder Änderung auf dem Gerät abgelegt.
// So zeigt die App beim Start sofort etwas, auch ohne Netz. Beim Abmelden wird alles gelöscht (clear).
let known=false,keepT=0; // known = es gibt einen Stand, der gemerkt werden darf (geladen oder vom Gerät geholt)
function keep(){
  if(!known)return;
  clearTimeout(keepT);keepT=setTimeout(()=>store.set("snap",{habits:state.habits,prof:state.prof}),300);
}
// Ist auf diesem Gerät eine Anmeldung gespeichert? (So legt Supabase sie im Browser ab, gleicher Anfang wie in signOut.)
const hasToken=()=>{try{return Object.keys(localStorage).some(k=>/^sb-.*-auth-token$/.test(k))}catch(e){return false}};
// Beim Start: den Stand vom Gerät holen. Gibt true zurück, wenn es einen gibt.
export async function restore(){
  if(!hasToken())return false;
  const [snap,ops]=await Promise.all([store.get("snap"),store.get("ops")]);
  if(!snap||!Array.isArray(snap.habits))return false;
  pend=Array.isArray(ops)?ops:[];
  state.habits=snap.habits.map(h=>norm(h,TI));state.prof=snap.prof||null;known=true;
  return true;
}
// Supabase meldet "abgemeldet". Ohne Netz kann das auch nur heißen: Die Anmeldung ist abgelaufen und ließ sich nicht
// erneuern. Dann ist sie noch gespeichert, der Stand vom Gerät bleibt stehen und Haken warten in der Warteschlange.
export const stays=()=>known&&hasToken()&&(offline(),true);

// --- Laden ---
export async function load(){
  const g=gen;
  await flush(); // erst eigene Haken fertig schicken, sonst käme ein alter Stand zurück
  const [r,c]=await Promise.all([safe(db.from("habits").select(HABIT_COLS).order("pos").order("created_at")),safe(db.rpc("checkins_map"))]);
  if(g!==gen)return false;
  const bad=r.error?r:c;
  if(isNet(bad)||failed(bad))return false; // bei einem Fehler bleibt der bisherige Stand stehen (ohne Netz ohne Meldung)
  const map=c.data||{};
  state.habits=(r.data||[]).map(h=>norm({...h,done:map[h.id]||{}},TI));
  pend.forEach(o=>{const h=byId(o.habit);if(h)setLocal(h,o.day,after(cnt(h,o.day),o))}); // was noch wartet, bleibt sichtbar
  known=true;emit("change");keepDays();
  return true;
}

// --- Haken ---
// Jeder Tipp ist ein Auftrag mit eigener ID. Die Aufträge stehen in einer Warteschlange, die auch auf dem Gerät
// gespeichert ist. Pro Habit und Tag gehen sie nacheinander raus, damit schnelle Tipps in der richtigen Reihenfolge
// ankommen. Ohne Netz bleiben sie liegen und werden nachgeschickt (flush).
// Doppelsicher: Die Datenbank merkt sich die IDs. Kommt derselbe Auftrag zweimal an (z. B. weil nur die Antwort
// verloren ging), zählt er trotzdem nur einmal.
let pend=[];              // [{id, habit, day, add, max} oder {id, habit, day, set, prev}] in der Reihenfolge der Tipps
const sending=new Map();  // "habit|tag" -> Promise, solange für diesen Habit-Tag gesendet wird
const keyOf=o=>o.habit+"|"+o.day;
const waiting=key=>pend.some(o=>keyOf(o)===key);
const savePend=()=>{store.set("ops",pend);emit("net")};
// So rechnet auch die Datenbank: add zählt hoch (nie unter 0, nie über das Tagesziel), set setzt fest
const after=(n,o)=>o.set!=null?o.set:Math.max(0,Math.min(n+o.add,Math.max(n,o.max)));
const send=o=>o.set!=null
  ?db.rpc("checkin_set",{p_habit:o.habit,p_day:o.day,p_count:o.set,p_op:o.id})
  :db.rpc("checkin_add",{p_habit:o.habit,p_day:o.day,p_delta:o.add,p_max:o.max,p_op:o.id});
function enqueue(h,day,next,o){
  touch();
  pend.push(Object.assign(o,{id:crypto.randomUUID(),habit:h.id,day}));savePend();
  setLocal(h,day,next);
  return pump(keyOf(o));
}
// Schickt die wartenden Aufträge eines Habit-Tags der Reihe nach. Ohne Netz hört es auf, die Aufträge bleiben liegen.
function pump(key){
  if(sending.has(key))return sending.get(key);
  const run=(async()=>{
    for(let o;(o=pend.find(x=>keyOf(x)===key));){
      const r=await safe(send(o));
      if(isNet(r))break;
      const i=pend.indexOf(o);if(i<0)break; // inzwischen abgemeldet
      pend.splice(i,1);savePend();
      const x=byId(o.habit);
      if(failed(r)){ // die Datenbank lehnt ab (z. B. Habit auf einem anderen Gerät gelöscht): Haken zurücknehmen
        if(x){setLocal(x,o.day,o.set!=null?o.prev:Math.max(0,cnt(x,o.day)-o.add));emit("change")}
      }
      // Der Server sagt, wie viele es wirklich sind (z. B. weil ein anderes Gerät auch abgehakt hat)
      else if(x&&!waiting(key)&&cnt(x,o.day)!==r.data){setLocal(x,o.day,+r.data||0);emit("change")}
    }
  })().then(()=>{sending.delete(key);hold(key);keepDays()});
  sending.set(key,run);
  return run;
}
// Alles nachschicken, was noch wartet (beim Laden, und sobald das Netz wieder da ist)
export const flush=()=>Promise.all([...new Set(pend.map(keyOf))].map(pump));
// Antippen: +1, bei erreichtem Tagesziel zurück auf 0 (Ziel 1 = an/aus).
// Gibt zurück, wie viele Haken dabei auf 0 gesetzt wurden (für "Rückgängig"), sonst 0.
export function tap(h,day,target){
  const n=cnt(h,day);
  if(n>=target){setCount(h,day,0);return n}
  enqueue(h,day,n+1,{add:1,max:target});
  return 0;
}
// Anzahl fest setzen (zurück auf 0, Rückgängig)
export const setCount=(h,day,n)=>enqueue(h,day,n,{set:n,prev:cnt(h,day)});

// Haken von anderen Geräten sofort zeigen (Supabase Realtime).
// Eigene Änderungen haben Vorrang: Solange ein eigener Auftrag für denselben Habit-Tag wartet und kurz danach (das
// eigene Echo kommt verzögert zurück), wird nur der letzte gemeldete Wert gemerkt und erst danach übernommen.
const GRACE=1500,held=new Map(); // "habit|tag" -> {t: Timer, n: letzter Wert vom Server}
function hold(key){
  const e=held.get(key)||{};held.set(key,e);clearTimeout(e.t);
  e.t=setTimeout(()=>{held.delete(key);if(e.n!=null&&!waiting(key))remote(key,e.n)},GRACE);
}
function remote(key,n){
  const [id,day]=key.split("|"),h=byId(id);
  if(!h||cnt(h,day)===n)return;
  setLocal(h,day,n);emit("change","remote");
}
let live=null;
export function watch(){
  if(live||!db.channel)return;
  live=db.channel("checkins").on("postgres_changes",{event:"*",schema:"public",table:"checkins"},p=>{
    const r=p&&p.new;if(!r||!r.habit_id)return;
    const key=r.habit_id+"|"+r.day,n=+r.count||0;
    if(waiting(key)||held.has(key)){if(!held.has(key))held.set(key,{});held.get(key).n=n;return}
    remote(key,n);
  }).subscribe();
}
function unwatch(){if(!live)return;try{db.removeChannel(live)}catch(e){}live=null}

// --- Habits ---
export async function addHabit(row){
  touch();
  const r=await safe(db.from("habits").insert(row).select(HABIT_COLS).single());
  failed(r);
  if(r.data){state.habits.push(norm({...r.data,done:{}},TI));emit("change")}
}
export function updateHabit(h,upd){
  touch();
  const prev=Object.fromEntries(Object.keys(upd).map(k=>[k,h[k]]));
  Object.assign(h,upd);
  return safe(db.from("habits").update(upd).eq("id",h.id)).then(r=>{
    if(failed(r)&&byId(h.id)===h){Object.assign(h,prev);emit("change")}
  });
}
export function deleteHabit(h){
  touch();
  const i=state.habits.indexOf(h);
  state.habits.splice(i,1);
  return safe(db.from("habits").delete().eq("id",h.id)).then(r=>{
    if(failed(r)&&!byId(h.id)){state.habits.splice(Math.min(i,state.habits.length),0,h);emit("change")}
  });
}
// Zwei Habits tauschen. Die Position (pos) ist danach 1, 2, 3 ..., gespeichert wird nur, was sich geändert hat.
export function swap(i,j){
  touch();
  const hs=state.habits,before=hs.map(h=>[h,h.pos]);
  [hs[i],hs[j]]=[hs[j],hs[i]];
  hs.forEach((h,k)=>{h.pos=k+1});
  const changed=before.filter(([h,p])=>h.pos!==p).map(([h])=>h);
  return Promise.all(changed.map(h=>safe(db.from("habits").update({pos:h.pos}).eq("id",h.id)))).then(rs=>{
    if(failed(rs.find(r=>r.error)||{})&&state.habits===hs){
      before.forEach(([h,p],k)=>{hs[k]=h;h.pos=p});emit("change");
    }
  });
}
// Import: alles ersetzen. list = Habits mit done ({Tag: Anzahl}), in der gewünschten Reihenfolge (pos = 1, 2, 3 ...).
export async function replaceAll(list){
  touch();
  await safe(db.from("habits").delete().not("id","is",null));
  const r=await safe(db.from("habits").insert(list.map(({done,...row})=>row)).select(HABIT_COLS));
  if(failed(r)){state.habits=[];emit("change");return}
  const rows=r.data||[],doneOf=h=>Object.fromEntries(Object.entries((list[h.pos-1]||{}).done||{})
    .map(([day,n])=>[day,Math.min(TARGET_MAX,Math.floor(+n)||0)]).filter(([day,n])=>DAYRE.test(day)&&n>0));
  const checkins=rows.flatMap(h=>Object.entries(doneOf(h)).map(([day,count])=>({habit_id:h.id,day,count})));
  const c=checkins.length?await safe(db.from("checkins").insert(checkins)):{};
  failed(c);
  state.habits=rows.map(h=>norm({...h,done:c.error?{}:doneOf(h)},TI));
  emit("change");
}

// --- Profil ---
export async function loadProfile(){
  const r=await safe(db.from("profiles").select("*").single());
  if(!isNet(r))failed(r); // ohne Netz bleibt das Profil vom Gerät stehen, ohne Meldung
  if(r.data){state.prof=r.data;keep();keepDays()}
  return !!r.data;
}
// Sammlung: Der höchste Stand an "Tagen insgesamt" steht im Profil (days_total) und wird nur erhöht. So geht ein
// freigeschaltetes Theme nicht wieder verloren, wenn man später ein Habit mit seinen Haken löscht.
// Läuft still nach bestätigten Ständen (geladen, Haken gespeichert). Klappt es nicht, beim nächsten Mal wieder.
let daysBusy=false;
function keepDays(){
  const prof=state.prof,n=daysTotal(state.habits);
  if(!prof||daysBusy||pend.length||!(n>prof.days_total))return;
  daysBusy=true;
  safe(db.from("profiles").update({days_total:n}).eq("id",prof.id)).then(r=>{daysBusy=false;if(!r.error&&n>prof.days_total)prof.days_total=n});
}
// Gibt true zurück, wenn gespeichert wurde
export function updateProfile(o){
  const prof=state.prof;
  if(!prof){emit("error","Profil nicht geladen, Einstellung nicht gespeichert.");return Promise.resolve(false)}
  const prev=Object.fromEntries(Object.keys(o).map(k=>[k,prof[k]]));
  Object.assign(prof,o);keep();
  return safe(db.from("profiles").update(o).eq("id",prof.id)).then(r=>{
    if(!failed(r))return true;
    if(state.prof===prof){Object.assign(prof,prev);emit("profile")}
    return false;
  });
}

// --- Push: Welche Geräte die Erinnerung bekommen (Tabelle push_subs). Verschickt wird sie vom Server. ---
// Öffentlicher Schlüssel des Servers. Das Gerät braucht ihn, um sich für Push anzumelden. Leer = noch nicht eingerichtet.
let vapid;
export async function pushKey(){
  if(vapid===undefined){const r=await safe(db.rpc("push_key"));if(!r.error)vapid=r.data||""}
  return vapid||"";
}
// sub = Anmeldung des Geräts vom Browser: {endpoint, keys: {p256dh, auth}}. Gibt true zurück, wenn gespeichert.
export const savePush=sub=>safe(db.from("push_subs").upsert({endpoint:sub.endpoint,p256dh:sub.keys.p256dh,auth:sub.keys.auth},{onConflict:"endpoint"})).then(r=>!r.error);
export const dropPush=endpoint=>safe(db.from("push_subs").delete().eq("endpoint",endpoint)).then(r=>!r.error);

// --- KI (Server-Funktion "ki", supabase/functions/ki) ---
// Schickt das Gespräch und die Zusammenfassung der Habits (js/ki.js) an den Server. Der prüft die Anmeldung, zählt
// die Anfrage (Limit pro Nutzer) und fragt den KI-Anbieter. Der Schlüssel des Anbieters liegt nur dort.
// Antwort: {text, vorschlag} oder genau ein Grund: netz, setup, pro, limit, voll, fehler. Wirft nie.
export async function ki(body){
  if(off)return {netz:true};
  let r;
  try{r=await db.functions.invoke("ki",{body})}catch(e){r={error:e}}
  const e=r&&r.error;
  if(e)return e.name==="FunctionsFetchError"||NETRE.test(e.message||"")?{netz:true}:{fehler:true};
  return r.data&&typeof r.data==="object"?r.data:{fehler:true};
}

// --- Login ---
export const onAuth=fn=>db.auth.onAuthStateChange(fn);
export const signIn=(email,password)=>db.auth.signInWithPassword({email,password});
export async function signOut(){
  if(!off)await flush(); // wartende Haken ein letztes Mal schicken. Ohne Netz gehen sie beim Abmelden verloren.
  try{await db.auth.signOut({scope:"local"})}catch(e){}
  try{Object.keys(localStorage).filter(k=>k.startsWith("sb-")).forEach(k=>localStorage.removeItem(k))}catch(e){}
  clear();
}
// Abgemeldet: nichts von den Daten im Browser behalten, auch nicht im Speicher auf dem Gerät
export function clear(){
  state.habits=[];state.prof=null;pend=[];known=false;vapid=undefined;
  clearTimeout(keepT);store.wipe();unwatch();
  if(off){off=false;emit("net")}
}
