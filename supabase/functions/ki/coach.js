// MIND – KI-Coach: die Regeln und der Ablauf der Server-Funktion "ki". Hier steht nichts, was Deno oder das Netz
// braucht, deshalb prüft tests/logik.html diese Datei genauso wie die App.
// Vier Aufgaben: 1. die Anfrage der App prüfen und kürzen (clean), 2. die Anleitung für das Modell bauen (prompt),
// 3. die Antwort des Modells auswerten (parse), 4. der ganze Ablauf mit Limit (run).
// Inhalte von Gesprächen werden nirgends gespeichert und nie ins Log geschrieben.

// Themen: frei = Chat über den MIND-Knopf, die anderen kommen von den Einstiegen in der App
export const KINDS=["frei","woche","neu","mini","muster","formulieren"];
// Limit pro Nutzer: so viele Nachrichten am Tag. Die Datenbank zählt (ki_take in docs/2026-11-12_ki.sql).
export const LIMIT={free:20,premium:100};
const MAX_MSGS=16,MAX_TEXT=1500,MAX_CTX=8000,MAX_OUT=1800; // Grenzen, damit eine Anfrage nie teuer werden kann

// --- 1. Anfrage prüfen ---
// Erwartet {kind, ctx, msgs:[{role:"user"|"assistant", content}]}. Gibt die geprüfte Anfrage zurück oder null.
// first = das Gespräch fängt gerade an (genau eine Nachricht). Das braucht die Regel "1× im Monat gratis".
export function clean(body){
  if(!body||typeof body!=="object"||!Array.isArray(body.msgs))return null;
  const msgs=body.msgs
    .filter(m=>m&&(m.role==="user"||m.role==="assistant")&&typeof m.content==="string"&&m.content.trim())
    .map(m=>({role:m.role,content:m.content.trim().slice(0,MAX_TEXT)}))
    .slice(-MAX_MSGS);
  while(msgs.length&&msgs[0].role!=="user")msgs.shift(); // ein Gespräch beginnt immer mit dem Menschen
  if(!msgs.length||msgs[msgs.length-1].role!=="user")return null;
  return {
    kind:KINDS.includes(body.kind)?body.kind:"frei",
    ctx:typeof body.ctx==="string"?body.ctx.slice(0,MAX_CTX):"",
    msgs,first:msgs.length===1
  };
}

// --- 2. Anleitung für das Modell ---
// Das macht aus einem allgemeinen Modell den Coach von MIND: klein anfangen, erst fragen, dann vorschlagen, nie Druck.
const TASK={
  frei:"Offenes Gespräch. Geh auf das ein, was die Person schreibt.",
  woche:"Woche besprechen. Schau auf die letzten 7 Tage. Nenn zuerst eine Sache, die gut lief (mit Zahl), dann eine Stelle, an der es hakt, und stell eine Frage dazu. Einen Vorschlag gibt es erst nach der Antwort, meistens: ein Habit kleiner machen. Das Gespräch soll nach wenigen Nachrichten fertig sein.",
  neu:"Ein neues Habit planen. Finde heraus, was die Person will, und mach daraus ein kleines, konkretes Habit mit Tagen und Tageszeit (Vorschlag mit art \"neu\").",
  formulieren:"Die Person hat eine grobe Idee für ein neues Habit getippt. Mach daraus ein kleines, konkretes Habit. Ist die Idee klar genug, schlag es sofort vor (art \"neu\"), sonst stell eine Frage.",
  mini:"Mini-Version für ein bestehendes Habit: eine Fassung, die auch an einem schlechten Tag in etwa zwei Minuten geht. Schlag sie direkt vor (art \"aendern\" mit der Nummer des Habits) und sag in einem Satz, warum sie leichter ist. Um welches Habit es geht, steht unter \"Im Mittelpunkt\".",
  muster:"Muster erklären für ein Habit (steht unter \"Im Mittelpunkt\"). Beschreib in ein bis zwei Sätzen, was an der Quote pro Wochentag und den letzten Tagen auffällt, ohne Gründe zu erfinden. Frag dann, was an den schwachen Tagen anders ist."
};
export function prompt(kind,ctx){
  return `Du bist MIND, der Coach in einem Habit Tracker. Du hilfst, Gewohnheiten klein, konkret und machbar zu halten.

So denkst du:
- Klein anfangen. Lieber eine Fassung, die auch an einem schlechten Tag geht (2 Minuten, 1 Seite, 1 Glas), als ein großes Ziel, das nach einer Woche kippt.
- Konstanz schlägt Perfektion. Ein verpasster Tag ist kein Problem und nie ein Grund für Vorwürfe.
- Erst fragen, dann vorschlagen: Fehlt dir etwas Wichtiges (wann, wo, was hält ab), stell genau eine kurze Frage und warte die Antwort ab. Weißt du genug, mach einen konkreten Vorschlag.
- Der Mensch entscheidet. Du schlägst vor und änderst nichts selbst.
- Bleib bei den Zahlen, die du bekommst. Erfinde keine Daten, Gründe oder Studien. Geben die Daten etwas nicht her, sag das.
- Du bist kein Arzt und kein Therapeut. Bei Gesundheit, Essen, Medikamenten oder wenn es jemandem ernsthaft schlecht geht: keine Diagnosen, sondern kurz und freundlich auf Fachleute oder vertraute Menschen hinweisen.
- Du bleibst bei Gewohnheiten, Alltag, Motivation und Planung. Anderes lehnst du in einem Satz freundlich ab.

So redest du:
- Deutsch, du-Form, locker, direkt und ehrlich. Auf Augenhöhe, nie belehrend.
- Kurz: höchstens vier Sätze. Keine Überschriften, kein Markdown, keine Emojis.
- Kein Druck, keine Schuld, kein „du musst“. Kein übertriebenes Lob.

Was du über die Person weißt (Zusammenfassung aus der App):
${ctx||"(keine Angaben)"}

Deine Aufgabe in diesem Gespräch: ${TASK[kind]||TASK.frei}

Antworte immer nur mit einem JSON-Objekt in dieser Form:
{"text":"deine Antwort","vorschlag":null}
Machst du einen konkreten Vorschlag, den man mit einem Tipp übernehmen kann, füll "vorschlag" aus:
- Neues Habit: {"art":"neu","name":"kurzer Name","tage":[0,1,2,3,4,5,6],"ziel":1,"einheit":"","mehrzahl":"","zeit":""}
- Bestehendes Habit ändern: {"art":"aendern","nr":3,"name":"neuer Name","ziel":1,"einheit":"","mehrzahl":""}
"name": höchstens 40 Zeichen. "tage": 0 = Montag bis 6 = Sonntag. "ziel": wie oft am Tag, 1 bis 20. "einheit" und "mehrzahl": zum Beispiel "Glas" und "Gläser", bei einmal am Tag ein freier Text wie "5 Minuten", sonst leer. "zeit": "morgen", "mittag", "abend", eine Uhrzeit wie "07:30" oder leer. "nr": die Nummer des Habits aus der Liste.
Höchstens ein Vorschlag pro Antwort. "text" erklärt ihn in ein bis zwei Sätzen. Ohne Vorschlag steht "vorschlag": null.`;
}
// Was an den Anbieter geht (gleiche Form bei Mistral, Groq und Cloudflare)
export const payload=(model,kind,ctx,msgs)=>({model,temperature:0.5,max_tokens:600,response_format:{type:"json_object"},
  messages:[{role:"system",content:prompt(kind,ctx)}].concat(msgs)});

// --- 3. Antwort auswerten ---
// Das Modell soll JSON liefern. Tut es das nicht (reiner Text, JSON in einem Code-Block), wird trotzdem das Beste
// daraus gemacht. Vom Vorschlag kommen nur bekannte Felder mit einfachen Werten durch. Ob er sinnvoll ist und zu
// einem Habit passt, prüft die App noch einmal (public/js/ki.js), bevor sie ihn zeigt.
const FIELDS=["art","nr","name","tage","ziel","einheit","mehrzahl","zeit"];
function slim(v){
  const o={};
  for(const k of FIELDS){
    const x=v[k];
    if(typeof x==="string")o[k]=x.slice(0,60);
    else if(typeof x==="number"&&Number.isFinite(x))o[k]=x;
    else if(k==="tage"&&Array.isArray(x))o[k]=x.filter(n=>typeof n==="number").slice(0,7);
  }
  return o;
}
export function parse(raw){
  let s=String(raw==null?"":raw).trim();
  const fence=s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);if(fence)s=fence[1].trim();
  let o;
  try{o=JSON.parse(s)}catch(e){
    const a=s.indexOf("{"),b=s.lastIndexOf("}");
    if(a>=0&&b>a)try{o=JSON.parse(s.slice(a,b+1))}catch(_){}
  }
  if(o&&typeof o==="object"){
    if(typeof o.text!=="string"||!o.text.trim())return null;
    const v=o.vorschlag;
    return {text:o.text.trim().slice(0,MAX_OUT),vorschlag:v&&typeof v==="object"&&!Array.isArray(v)?slim(v):null};
  }
  return s?{text:s.slice(0,MAX_OUT),vorschlag:null}:null; // kein JSON: der Text selbst ist die Antwort
}

// --- 4. Ablauf ---
// x = {body, plan, proOn, key, model, db:{take, back}, ask}
//   key   = der Schlüssel des Anbieters ist eingetragen (true/false). Ohne ihn wird nichts gezählt.
//   proOn = Pro ist eingeführt. Dann gilt für alle ohne plan "premium": nur "Woche besprechen", 1 Gespräch im Monat.
//   take  = zählt die Anfrage in der Datenbank, wenn Limit und Pro-Regel es erlauben: {ok, id} oder {ok:false, why}
//   back  = nimmt die Zählung zurück (wenn der Anbieter nicht geantwortet hat, soll das nichts kosten)
//   ask   = schickt die Anfrage an den Anbieter und gibt dessen Text zurück. Wirft bei Fehlern, mit busy bei "zu viel los".
// Ergebnis für die App: {text, vorschlag} oder genau ein Grund: setup, pro, limit, voll, fehler.
export async function run(x){
  const q=clean(x.body);
  if(!q)return {fehler:"eingabe"};
  if(!x.key)return {setup:true};
  const premium=x.plan==="premium";
  const t=await x.db.take({kind:q.kind,first:q.first,limit:premium?LIMIT.premium:LIMIT.free,pro:!!x.proOn&&!premium});
  if(!t||!t.ok)return t&&t.why==="pro"?{pro:true}:{limit:true};
  try{
    const a=parse(await x.ask(payload(x.model,q.kind,q.ctx,q.msgs)));
    if(!a)throw new Error("leere Antwort");
    return a;
  }catch(e){
    try{await x.db.back(t.id)}catch(_){}
    return e&&e.busy?{voll:true}:{fehler:"anbieter"};
  }
}
