// MIND – Push-Erinnerung (Supabase Edge Function "push-reminder").
// Die Datenbank ruft diese Funktion jede Minute auf (pg_cron, siehe docs/2026-11-11_push.sql und docs/2026-11-11_erinnerung-minutengenau.sql). Sie schaut, bei wem
// die eingestellte Uhrzeit erreicht ist, und schickt höchstens eine Nachricht am Tag, und nur wenn heute noch Habits
// offen sind. Die Regeln und der Ablauf stehen in erinnerung.js, das Verschlüsseln in webpush.js. Hier wird nur
// verbunden: Datenbank, Schlüssel, Push-Dienst.
//
// Geheimnisse stehen nicht im Code und nicht im Repository. Sie liegen im Tresor der Datenbank (Supabase Vault):
// die Losung für den Aufruf und das Schlüsselpaar für Web Push. Das Schlüsselpaar erzeugt die Funktion beim ersten
// Lauf selbst. Den service_role-Key bekommt jede Edge Function von Supabase als Umgebungsvariable.
import {createClient} from "jsr:@supabase/supabase-js@2";
import {run} from "./erinnerung.js";
import {newKeys,sender} from "./webpush.js";

const SUBJECT="https://mind.2k6k4mfpzv.workers.dev"; // wer hinter dem Server steht (verlangen die Push-Dienste)
const HABIT="id,name,days,created,pos,target,settings_log,paused";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});

// Ergebnis einer Datenbank-Anfrage auspacken, bei einem Fehler abbrechen
function need(r:{data:any;error:any}){if(r.error)throw r.error;return r.data}
// Zwei Texte vergleichen, ohne dass die Dauer verrät, an welcher Stelle sie sich unterscheiden
function same(a:string,b:string){
  if(!b||a.length!==b.length)return false;
  let x=0;for(let i=0;i<b.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);
  return x===0;
}

Deno.serve(async req=>{
  try{
    let sec=need(await db.rpc("push_secrets"));
    // Nur die Datenbank darf anstoßen: Sie schickt die Losung mit, die sonst niemand kennt
    if(!same(req.headers.get("x-mind-cron")||"",sec.cron||""))return new Response("forbidden",{status:403});
    if(!sec.vapid_private){const k=await newKeys();sec=need(await db.rpc("push_keys_set",{p_public:k.pub,p_private:k.priv}))}
    const {send}=await sender(sec.vapid_public,sec.vapid_private,SUBJECT);
    const res=await run({send,db:{
      profiles:async()=>need(await db.from("profiles").select("id,timezone,rem_on,rem_time,rem_sent").eq("rem_on",true)),
      subs:async(id:string)=>need(await db.from("push_subs").select("id,endpoint,p256dh,auth").eq("user_id",id).order("created_at")),
      // Tag als erledigt markieren. Nur wer die Zeile wirklich ändert, darf senden (false = war schon markiert)
      claim:async(id:string,day:string)=>need(await db.from("profiles").update({rem_sent:day}).eq("id",id).or(`rem_sent.is.null,rem_sent.neq.${day}`).select("id")).length>0,
      release:async(id:string)=>{need(await db.from("profiles").update({rem_sent:null}).eq("id",id))},
      habits:async(id:string)=>need(await db.from("habits").select(HABIT).eq("user_id",id).order("pos").order("created_at")),
      counts:async(id:string,day:string)=>Object.fromEntries(need(await db.from("checkins").select("habit_id,count").eq("user_id",id).eq("day",day)).map((c:any)=>[c.habit_id,c.count])),
      dropSub:async(id:string)=>{need(await db.from("push_subs").delete().eq("id",id))},
    }});
    console.log("push-reminder",JSON.stringify(res));
    return Response.json(res);
  }catch(e){
    console.error("push-reminder",e);
    return new Response("error",{status:500});
  }
});
