// Nachgebaute Supabase-Datenbank nur zum lokalen Testen (keine echten Daten, kein Netz).
// Wird von tests/logik.html und tests/app.html statt der echten Supabase geladen.
// Steuerung für Tests: window.MOCK (Daten), MOCK_FAIL (kein Netz), MOCK_LOGGED_OUT (abgemeldet), MOCK_LOG (alle Anfragen).
(function(){
const iso=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const T0=new Date();T0.setHours(0,0,0,0);
const add=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const wdi=d=>(d.getDay()+6)%7;
let s=7;const rnd=()=>(s=(s*9301+49297)%233280)/233280;
const ALL=[0,1,2,3,4,5,6];
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
const habits=H.map(([name,days,cat,target,daytime,rate,todayN,color,icon],i)=>{
  const created=iso(add(T0,-110)),done={};
  for(let k=110;k>=1;k--){const d=add(T0,-k);if(!days.includes(wdi(d)))continue;const r=rnd();if(r<rate)done[iso(d)]=target;else if(target>1&&r<rate+.15)done[iso(d)]=1+Math.floor(rnd()*(target-1))}
  if(todayN)done[iso(T0)]=todayN;
  return{id:"h"+(i+1)+"-"+Math.random().toString(36).slice(2,8),user_id:"u1",name,days,cat,created,done,pos:i+1,target,daytime,color,icon,settings_log:[],created_at:new Date(Date.now()-1e8+i*1000).toISOString()};
});
const store=window.MOCK={habits,profiles:[{id:"u1",name:"Paul",timezone:"Europe/Berlin",plan:"free",rem_on:false,rem_time:"20:00",created_at:new Date().toISOString()}]};
window.MOCK_LOG=[];
const COLS=new Set(["id","user_id","name","days","cat","created","done","pos","target","daytime","color","icon","settings_log","created_at"]);
const OKICO=['','tropfen','blatt','buch','hantel','puls','sonne','mond','stift','herz','apfel','pille','note','sprache','hut','haus','handy'];
const OKCOL=["","himmel","salbei","lavendel","apricot","sonne","rose","petrol","koralle"];
const cp=o=>JSON.parse(JSON.stringify(o));
function check(t,o){if(t!=="habits")return null;for(const k in o)if(!COLS.has(k)||(k==="color"&&window.MOCK_NO_COLOR))return{message:`Could not find the '${k}' column of 'habits' in the schema cache`};if(o.color!==undefined&&!OKCOL.includes(o.color))return{message:'new row violates check constraint "habits_color_valid"'};if(o.icon!==undefined&&!OKICO.includes(o.icon))return{message:'new row violates check constraint "habits_icon_valid"'};if(o.settings_log!==undefined&&!Array.isArray(o.settings_log))return{message:'new row violates check constraint "habits_settings_log_valid"'};return null}
function exec(q){
  if(window.MOCK_FAIL)return{data:null,error:{message:"TypeError: Failed to fetch"}};
  const rows=store[q.t],m=r=>q.f.every(f=>f(r));
  window.MOCK_LOG.push({t:q.t,op:q.op,p:q.p&&cp(q.p)});
  if(q.op==="select"){let d=rows.filter(m).slice().sort((a,b)=>{for(const c of q.o){if(a[c]<b[c])return -1;if(a[c]>b[c])return 1}return 0});d=cp(d);return{data:q.single?d[0]||null:d,error:null}}
  if(q.op==="update"){const e=check(q.t,q.p);if(e)return{data:null,error:e};rows.filter(m).forEach(r=>Object.assign(r,cp(q.p)));return{data:null,error:null}}
  if(q.op==="insert"){const a=Array.isArray(q.p)?q.p:[q.p];for(const o of a){const e=check(q.t,o);if(e)return{data:null,error:e}}
    const ins=a.map(o=>Object.assign({id:"n-"+Math.random().toString(36).slice(2,10),user_id:"u1",cat:"",days:ALL,done:{},pos:0,target:1,daytime:"",color:"",icon:"",settings_log:[],created_at:new Date().toISOString()},cp(o)));rows.push(...ins);const d=cp(ins);return{data:q.ret?(q.single?d[0]:d):null,error:null}}
  if(q.op==="delete"){store[q.t]=rows.filter(r=>!m(r));return{data:null,error:null}}
}
function from(t){
  const q={t,op:"select",f:[],o:[],p:null,single:false,ret:false};
  const b={select(){if(q.op!=="select")q.ret=true;return b},order(c){q.o.push(c);return b},eq(c,v){q.f.push(r=>r[c]===v);return b},not(c){q.f.push(r=>r[c]!=null);return b},
    update(o){q.op="update";q.p=o;return b},insert(o){q.op="insert";q.p=o;return b},delete(){q.op="delete";return b},single(){q.single=true;return b},
    then(res,rej){return new Promise(r=>setTimeout(r,60)).then(()=>exec(q)).then(res,rej)}};
  return b;
}
const user={user:{email:"test@example.com"}};
const auth={cb:null,onAuthStateChange(cb){this.cb=cb;setTimeout(()=>cb("INITIAL_SESSION",window.MOCK_LOGGED_OUT?null:user),0);return{data:{subscription:{unsubscribe(){}}}}},
  async signInWithPassword(){this.cb("SIGNED_IN",user);return{error:null}},async signOut(){return{error:null}}};
window.supabase={createClient:()=>({from,auth})};
})();
