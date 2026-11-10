// MIND – Datenschicht: die einzige Stelle, die mit Supabase spricht.
// Prinzip: Jede Änderung wird sofort im Browser gezeigt (optimistisch) und dann gespeichert. Schlägt das Speichern
// fehl, wird sie zurückgenommen und oben erscheint ruhig eine Meldung (kein Popup).
// Haken stehen in der Tabelle checkins. Der Server zählt hoch (checkin_add), die App schickt nie eine ganze Liste.
// Dadurch geht kein Haken verloren, wenn zwei Geräte gleichzeitig abhaken.
import {state,TI} from "./state.js";
import {norm,cnt,DAYRE} from "./logic.js";
import {TARGET_MAX} from "./config.js";

// Spalten der Tabelle habits, die die App braucht (die alte Spalte done wird nicht mehr gelesen)
const HABIT_COLS="id,name,days,cat,created,pos,target,daytime,color,icon,settings_log,created_at";

let db=null;
export function connect(client){db=client}

// --- Bescheid geben: on("change") = Daten haben sich geändert, on("error") = Meldung (leer = alles gut), on("profile") ---
const subs={change:[],error:[],profile:[]};
export const on=(ev,fn)=>{subs[ev].push(fn)};
const emit=(ev,x)=>subs[ev].forEach(f=>f(x));
// Ergebnis einer Anfrage melden. Gibt true zurück, wenn sie fehlgeschlagen ist.
function failed(r){emit("error",r&&r.error?"Speichern fehlgeschlagen: "+r.error.message:"");return !!(r&&r.error)}
const safe=p=>Promise.resolve(p).catch(e=>({data:null,error:{message:String(e&&e.message||e)}})); // auch ein Netzfehler wird zu {error}

const byId=id=>state.habits.find(h=>h.id===id);
const setLocal=(h,day,n)=>{if(n>0)h.done[day]=n;else delete h.done[day]};

// gen zählt eigene Änderungen, damit ein Neuladen, das schon unterwegs ist, sie nicht wieder überschreibt
let gen=0;
export const touch=()=>{gen++};

// --- Laden ---
export async function load(){
  const g=gen;
  await idle(); // erst eigene Haken fertig speichern, sonst käme ein alter Stand zurück
  const [r,c]=await Promise.all([safe(db.from("habits").select(HABIT_COLS).order("pos").order("created_at")),safe(db.rpc("checkins_map"))]);
  if(g!==gen)return false;
  if(failed(r.error?r:c))return false; // bei einem Fehler bleibt der bisherige Stand stehen
  const map=c.data||{};
  state.habits=(r.data||[]).map(h=>norm({...h,done:map[h.id]||{}},TI));
  emit("change");
  return true;
}

// --- Haken ---
// Pro Habit und Tag eine Warteschlange: Anfragen gehen nacheinander raus, damit schnelle Tipps in der richtigen
// Reihenfolge ankommen. (Paket 2 hängt hier das Nachschicken ohne Netz an.)
const queues=new Map(); // "habit|tag" -> {tail, n}
const idle=()=>Promise.all([...queues.values()].map(q=>q.tail));
function enqueue(h,day,next,call,undo){
  touch();
  const id=h.id,key=id+"|"+day,q=queues.get(key)||{tail:Promise.resolve(),n:0};
  queues.set(key,q);q.n++;
  setLocal(h,day,next);
  q.tail=q.tail.then(()=>safe(call())).then(r=>{
    if(!--q.n){queues.delete(key);hold(key)}
    const x=byId(id);
    if(failed(r)){if(x){setLocal(x,day,undo(cnt(x,day)));emit("change")}return}
    // Der Server sagt, wie viele es wirklich sind (z. B. weil ein anderes Gerät auch abgehakt hat)
    if(x&&!q.n&&cnt(x,day)!==r.data){setLocal(x,day,+r.data||0);emit("change")}
  });
  return q.tail;
}
// Antippen: +1, bei erreichtem Tagesziel zurück auf 0 (Ziel 1 = an/aus).
// Gibt zurück, wie viele Haken dabei auf 0 gesetzt wurden (für "Rückgängig"), sonst 0.
export function tap(h,day,target){
  const n=cnt(h,day);
  if(n>=target){setCount(h,day,0);return n}
  enqueue(h,day,n+1,()=>db.rpc("checkin_add",{p_habit:h.id,p_day:day,p_delta:1,p_max:target}),cur=>Math.max(0,cur-1));
  return 0;
}
// Anzahl fest setzen (zurück auf 0, Rückgängig)
export function setCount(h,day,n){
  const prev=cnt(h,day);
  return enqueue(h,day,n,()=>db.rpc("checkin_set",{p_habit:h.id,p_day:day,p_count:n}),()=>prev);
}

// Haken von anderen Geräten sofort zeigen (Supabase Realtime).
// Eigene Änderungen haben Vorrang: Solange eine eigene Anfrage für denselben Habit-Tag läuft und kurz danach (das
// eigene Echo kommt verzögert zurück), wird nur der letzte gemeldete Wert gemerkt und erst danach übernommen.
const GRACE=1500,held=new Map(); // "habit|tag" -> {t: Timer, n: letzter Wert vom Server}
function hold(key){
  const e=held.get(key)||{};held.set(key,e);clearTimeout(e.t);
  e.t=setTimeout(()=>{held.delete(key);if(e.n!=null&&!queues.has(key))remote(key,e.n)},GRACE);
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
    if(queues.has(key)||held.has(key)){if(!held.has(key))held.set(key,{});held.get(key).n=n;return}
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
  failed(r);
  if(r.data)state.prof=r.data;
  return !!r.data;
}
// Gibt true zurück, wenn gespeichert wurde
export function updateProfile(o){
  const prof=state.prof;
  if(!prof){emit("error","Profil nicht geladen, Einstellung nicht gespeichert.");return Promise.resolve(false)}
  const prev=Object.fromEntries(Object.keys(o).map(k=>[k,prof[k]]));
  Object.assign(prof,o);
  return safe(db.from("profiles").update(o).eq("id",prof.id)).then(r=>{
    if(!failed(r))return true;
    if(state.prof===prof){Object.assign(prof,prev);emit("profile")}
    return false;
  });
}

// --- Login ---
export const onAuth=fn=>db.auth.onAuthStateChange(fn);
export const signIn=(email,password)=>db.auth.signInWithPassword({email,password});
export async function signOut(){
  try{await db.auth.signOut({scope:"local"})}catch(e){}
  try{Object.keys(localStorage).filter(k=>k.startsWith("sb-")).forEach(k=>localStorage.removeItem(k))}catch(e){}
  clear();
}
// Abgemeldet: nichts von den Daten im Browser behalten
export function clear(){state.habits=[];state.prof=null;unwatch()}
