// MIND – KI-Coach (Supabase Edge Function "ki").
// Die App ruft diese Funktion auf, wenn jemand im Chat etwas schreibt oder einen KI-Einstieg antippt. Sie prüft, wer
// fragt, zählt die Anfrage (Limit pro Nutzer), schickt sie an den KI-Anbieter und gibt die Antwort zurück.
// Die Regeln und der Ablauf stehen in coach.js (wird in tests/logik.html geprüft). Hier wird nur verbunden:
// Anmeldung, Datenbank, Anbieter.
//
// Der Schlüssel des Anbieters steht nicht im Code und nicht im Repository. Er ist ein Geheimnis dieser Funktion
// (Supabase-Dashboard → Edge Functions → Secrets). Inhalte von Gesprächen werden nicht gespeichert und nicht ins
// Log geschrieben, nur dass eine Anfrage kam (Tabelle ki_log, siehe docs/2026-11-12_ki.sql).
import {createClient} from "jsr:@supabase/supabase-js@2";
import {run} from "./coach.js";

// --- KI-Anbieter: die EINE Stelle, an der Anbieter und Modell stehen. ---
// Wechseln heißt: diese drei Werte ändern und den neuen Schlüssel als Geheimnis eintragen. Mistral, Groq und
// Cloudflare sprechen dieselbe Schnittstelle (Chat Completions).
// Mistral: Firma in Frankreich, Server in der EU. Im Konto muss das Training mit API-Daten ausgeschaltet sein
// (Admin → Privacy), siehe PROJEKTDOKU.md Abschnitt 4.
const PROVIDER={
  url:"https://api.mistral.ai/v1/chat/completions",
  model:"mistral-small-latest",
  secret:"MISTRAL_API_KEY"   // Name des Geheimnisses, nicht der Schlüssel selbst
};
// Pro einführen (Roadmap B4): Geheimnis MIND_PRO auf "on" setzen. Dann gilt für alle ohne plan "premium" die
// Regel aus ki_take: nur "Woche besprechen", ein Gespräch im Monat. Solange es fehlt, ist die KI für alle frei.
const PRO_ON=Deno.env.get("MIND_PRO")==="on";

// Die App läuft auf einer anderen Adresse als die Funktion, deshalb muss der Browser die Antwort lesen dürfen.
// Geschützt ist die Funktion durch die Anmeldung (Authorization), nicht durch die Herkunft.
const CORS={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
function need(r:{data:any;error:any}){if(r.error)throw r.error;return r.data}
const json=(o:unknown,status=200)=>Response.json(o,{status,headers:CORS});

// Anfrage an den Anbieter. Wartet höchstens 25 Sekunden.
async function ask(key:string,body:Record<string,unknown>):Promise<string>{
  const send=(b:unknown)=>fetch(PROVIDER.url,{method:"POST",signal:AbortSignal.timeout(25000),
    headers:{"Content-Type":"application/json",Authorization:"Bearer "+key},body:JSON.stringify(b)});
  let r=await send(body);
  // Manche Modelle kennen die Angabe "antworte als JSON" nicht: dann ohne sie (coach.js kommt auch mit Text zurecht)
  if(r.status===400){const {response_format:_,...rest}=body;r=await send(rest)}
  if(r.status===429)throw Object.assign(new Error("Anbieter 429"),{busy:true});
  if(!r.ok)throw new Error("Anbieter "+r.status);
  const j=await r.json();
  return j?.choices?.[0]?.message?.content||"";
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response(null,{headers:CORS});
  if(req.method!=="POST")return json({fehler:"methode"},405);
  try{
    // Wer fragt? Die App schickt die Anmeldung des Nutzers mit. Ohne gültige Anmeldung gibt es keine Antwort.
    const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
    const {data:{user}}=await db.auth.getUser(token);
    if(!user)return json({fehler:"anmeldung"},401);
    const body=await req.json().catch(()=>null);
    const prof=need(await db.from("profiles").select("plan").eq("id",user.id).maybeSingle());
    const key=Deno.env.get(PROVIDER.secret)||"";
    let why="";
    const res=await run({
      body,plan:prof?.plan||"free",proOn:PRO_ON,key:!!key,model:PROVIDER.model,
      ask:async(b:Record<string,unknown>)=>{try{return await ask(key,b)}catch(e){why=e instanceof Error?e.message:"Fehler";throw e}},
      db:{
        take:async(o:{kind:string;first:boolean;limit:number;pro:boolean})=>
          need(await db.rpc("ki_take",{p_user:user.id,p_kind:o.kind,p_first:o.first,p_limit:o.limit,p_pro:o.pro})),
        back:async(id:number)=>{need(await db.rpc("ki_back",{p_id:id}))}
      }
    });
    // Ins Log kommt nur, was passiert ist, nie was geschrieben wurde
    console.log("ki",JSON.stringify({kind:body?.kind||"",ergebnis:"text" in res?"antwort":Object.keys(res)[0],...(why?{why}:{})}));
    return json(res);
  }catch(e){
    console.error("ki",e instanceof Error?e.message:"Fehler");
    return json({fehler:"server"},500);
  }
});
