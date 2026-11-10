// Nachgebaute Supabase-Datenbank nur zum lokalen Testen (keine echten Daten, kein Netz).
// Wird von tests/logik.html und tests/app.html statt der echten Supabase geladen.
// Sie kennt dieselben Tabellen und Funktionen wie die echte: habits, profiles, checkins,
// checkin_add / checkin_set / checkins_map (siehe docs/2026-11-10_checkins.sql) und Realtime.
// Steuerung für Tests: window.MOCK (Daten und Helfer), MOCK_FAIL (kein Netz), MOCK_LOGGED_OUT (abgemeldet), MOCK_LOG (alle Anfragen).
(function(){
const iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const T0=new Date();T0.setHours(0,0,0,0);
const add=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const wdi=d=>(d.getDay()+6)%7;
let s=7;const rnd=()=>(s=(s*9301+49297)%233280)/233280;
const ALL=[0,1,2,3,4,5,6];
// 9 erfundene Habits: Name, Tage, Kategorie, Tagesziel, Tageszeit, Quote, heute schon erledigt, Farbe, Symbol
const H=[
 ["Wasser",ALL,"",6,"morgen",.75,3,"himmel","tropfen"],
 ["Meditieren",ALL,"Kopf",1,"morgen",.85,1,"salbei","blatt"],
 ["10 Seiten lesen",ALL,"",1,"abend",.6,0,"lavendel","buch"],
 ["Gym",[0,2,4,5],"Sport",1,"",.7,0,"apricot","hantel"],
 ["Vitamin D",ALL,"",1,"08:00",.9,1,"sonne","sonne"],
 ["Journal",ALL,"Kopf",1,"21:30",.55,0,"rose","stift"],
 ["Joggen",[1,3],"Sport",1,"",.6,0,"petrol","puls"],
 ["Französisch Vokabeln",[0,1,2,3,4],"Schule",1,"mittag",.65,0,"koralle","sprache"],
 ["Zimmer aufräumen",[5],"",1,"",.5,0,"",""]
];
const habits=[],checkins=[];
H.forEach(([name,days,cat,target,daytime,rate,todayN,color,icon],i)=>{
  const created=iso(add(T0,-110)),done={};
  for(let k=110;k>=1;k--){const d=add(T0,-k);if(!days.includes(wdi(d)))continue;const r=rnd();if(r<rate)done[iso(d)]=target;else if(target>1&&r<rate+.15)done[iso(d)]=1+Math.floor(rnd()*(target-1))}
  if(todayN)done[iso(T0)]=todayN;
  const id="h"+(i+1)+"-"+Math.random().toString(36).slice(2,8);
  habits.push({id,user_id:"u1",name,days,cat,created,pos:i+1,target,daytime,color,icon,settings_log:[],created_at:new Date(Date.now()-1e8+i*1000).toISOString()});
  for(const day in done)checkins.push({habit_id:id,user_id:"u1",day,count:done[day]});
});
const listeners=[]; // Realtime: wer bei Änderungen an checkins Bescheid bekommt
const row=(id,day)=>store.checkins.find(c=>c.habit_id===id&&c.day===day);
function setCount(id,day,n){let c=row(id,day);if(!c){c={habit_id:id,user_id:"u1",day,count:0};store.checkins.push(c)}c.count=n;listeners.forEach(cb=>cb({eventType:"UPDATE",new:{...c}}));return n}
const store=window.MOCK={habits,checkins,profiles:[{id:"u1",name:"Paul",timezone:"Europe/Berlin",plan:"free",rem_on:false,rem_time:"20:00",created_at:new Date().toISOString()}],
  count:(id,day)=>(row(id,day)||{count:0}).count,  // so viele Haken stehen in der "Datenbank"
  other:(id,day,n)=>setCount(id,day,n)};            // ein anderes Gerät setzt die Anzahl
window.MOCK_LOG=[];
const COLS=new Set(["id","user_id","name","days","cat","created","pos","target","daytime","color","icon","settings_log","created_at"]);
const OKICO=['','tropfen','blatt','buch','hantel','puls','sonne','mond','stift','herz','apfel','pille','note','sprache','hut','haus','handy'];
const OKCOL=["","himmel","salbei","lavendel","apricot","sonne","rose","petrol","koralle"];
const cp=o=>JSON.parse(JSON.stringify(o));
const NONET={data:null,error:{message:"TypeError: Failed to fetch"}},RLS={data:null,error:{message:'new row violates row-level security policy for table "checkins"'}};
const later=fn=>({then(res,rej){return new Promise(r=>setTimeout(r,60)).then(fn).then(res,rej)}}); // wie das Netz: Antwort nach 60 ms
function check(t,o){
  if(t==="checkins")return store.habits.some(h=>h.id===o.habit_id)&&o.count>=0&&o.count<=20?null:RLS.error;
  if(t!=="habits")return null;
  for(const k in o)if(!COLS.has(k)||(k==="color"&&window.MOCK_NO_COLOR))return{message:`Could not find the '${k}' column of 'habits' in the schema cache`};
  if(o.color!==undefined&&!OKCOL.includes(o.color))return{message:'new row violates check constraint "habits_color_valid"'};
  if(o.icon!==undefined&&!OKICO.includes(o.icon))return{message:'new row violates check constraint "habits_icon_valid"'};
  if(o.settings_log!==undefined&&!Array.isArray(o.settings_log))return{message:'new row violates check constraint "habits_settings_log_valid"'};
  return null;
}
const DEF={habits:()=>({id:"n-"+Math.random().toString(36).slice(2,10),user_id:"u1",cat:"",days:ALL,pos:0,target:1,daytime:"",color:"",icon:"",settings_log:[],created_at:new Date().toISOString()}),checkins:()=>({user_id:"u1",count:0})};
function exec(q){
  if(window.MOCK_FAIL)return NONET;
  const rows=store[q.t],m=r=>q.f.every(f=>f(r));
  window.MOCK_LOG.push({t:q.t,op:q.op,p:q.p&&cp(q.p)});
  if(q.op==="select"){let d=rows.filter(m).slice().sort((a,b)=>{for(const c of q.o){if(a[c]<b[c])return -1;if(a[c]>b[c])return 1}return 0});d=cp(d);return{data:q.single?d[0]||null:d,error:null}}
  if(q.op==="update"){const e=check(q.t,q.p);if(e)return{data:null,error:e};rows.filter(m).forEach(r=>Object.assign(r,cp(q.p)));return{data:null,error:null}}
  if(q.op==="insert"){const a=Array.isArray(q.p)?q.p:[q.p];for(const o of a){const e=check(q.t,o);if(e)return{data:null,error:e}}
    const ins=a.map(o=>Object.assign(DEF[q.t](),cp(o)));rows.push(...ins);const d=cp(ins);return{data:q.ret?(q.single?d[0]:d):null,error:null}}
  if(q.op==="delete"){store[q.t]=rows.filter(r=>!m(r));if(q.t==="habits")store.checkins=store.checkins.filter(c=>store.habits.some(h=>h.id===c.habit_id));return{data:null,error:null}} // Haken gehen mit dem Habit
}
function from(t){
  const q={t,op:"select",f:[],o:[],p:null,single:false,ret:false};
  const b={select(){if(q.op!=="select")q.ret=true;return b},order(c){q.o.push(c);return b},eq(c,v){q.f.push(r=>r[c]===v);return b},not(c){q.f.push(r=>r[c]!=null);return b},
    update(o){q.op="update";q.p=o;return b},insert(o){q.op="insert";q.p=o;return b},delete(){q.op="delete";return b},single(){q.single=true;return b},
    then(res,rej){return later(()=>exec(q)).then(res,rej)}};
  return b;
}
// Die Funktionen der Datenbank, gleiche Regeln wie in der SQL-Datei
function rpc(name,a={}){return later(()=>{
  if(window.MOCK_FAIL)return NONET;
  window.MOCK_LOG.push({rpc:name,p:cp(a)});
  if(name==="checkins_map"){const m={};store.checkins.forEach(c=>{if(c.count>0)(m[c.habit_id]=m[c.habit_id]||{})[c.day]=c.count});return{data:m,error:null}}
  if(name!=="checkin_add"&&name!=="checkin_set")return{data:null,error:{message:"Could not find the function public."+name+" in the schema cache"}};
  if(!store.habits.some(h=>h.id===a.p_habit))return RLS;
  const cur=store.count(a.p_habit,a.p_day),max=Math.min(20,Math.max(1,a.p_max??20));
  const n=name==="checkin_set"?Math.max(0,Math.min(a.p_count,20)):Math.max(0,Math.min(cur+(a.p_delta??1),Math.max(cur,max)));
  return{data:setCount(a.p_habit,a.p_day,n),error:null};
})}
function channel(){const ch={on(_type,_filter,cb){ch.cb=cb;return ch},subscribe(){listeners.push(ch.cb);return ch}};return ch}
function removeChannel(ch){const i=listeners.indexOf(ch.cb);if(i>=0)listeners.splice(i,1)}
const user={user:{email:"test@example.com"}};
const auth={cb:null,onAuthStateChange(cb){this.cb=cb;setTimeout(()=>cb("INITIAL_SESSION",window.MOCK_LOGGED_OUT?null:user),0);return{data:{subscription:{unsubscribe(){}}}}},
  async signInWithPassword(){this.cb("SIGNED_IN",user);return{error:null}},async signOut(){return{error:null}}};
window.supabase={createClient:()=>({from,rpc,channel,removeChannel,auth})};
})();
