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
// Das macht aus einem allgemeinen Modell den Coach von MIND. Seit 16.11.2026 neu geschrieben und an 14 Testgesprächen
// gemessen: zuerst auf die Person eingehen, konkret mit ihren Zahlen, lieber ein Vorschlag als eine Rückfrage,
// Text und Vorschlag sagen dasselbe, zu jeder Frage Antworten zum Antippen.
const TASK={
  frei:"Offenes Gespräch. Geh auf das ein, was die Person schreibt.",
  woche:"Woche besprechen. Nimm genau die zwei Habits aus den Zeilen „Beste Woche“ und „Schwächste Woche“. Nenn zuerst das beste (mit Zahl), dann das schwächste (nur die Zahl, ohne „nur“ und ohne Wertung), und frag, woran es dort lag. Sobald die Person geantwortet hat, kommt ein Vorschlag für genau dieses Habit: kleiner machen oder auf eine andere Tageszeit legen. Das Gespräch soll nach wenigen Nachrichten fertig sein.",
  neu:"Ein neues Habit planen (immer art \"neu\", kein bestehendes ändern). Kennst du die Tätigkeit und ungefähr die Tageszeit, schlag sofort vor. Ist der Wunsch so allgemein wie „mehr Sport“, frag einmal nach der Tätigkeit, mit Antworten zum Antippen. Für Anfänger lieber 2 bis 3 feste Tage als täglich.",
  formulieren:"Die Person hat eine grobe Idee für ein neues Habit getippt. Mach daraus sofort ein kleines, konkretes Habit (art \"neu\") und triff sinnvolle Annahmen, statt zu fragen. Sag in einem Satz, welche Annahme du getroffen hast, als Vorschlag formuliert und nicht so, als hättest du es schon angelegt.",
  mini:"Mini-Version für ein bestehendes Habit: eine Fassung, die auch an einem schlechten Tag in etwa zwei Minuten geht. Es bleibt dasselbe Habit, nur kleiner (weniger, kürzer, einfacher), kein anderes Habit und keine andere Tageszeit. Schlag sie direkt vor (art \"aendern\" mit der Nummer des Habits, der Name nennt die kleine Menge) und sag in einem Satz, warum sie leichter ist. Um welches Habit es geht, steht unter \"Im Mittelpunkt\".",
  muster:"Muster erklären für ein Habit (steht unter \"Im Mittelpunkt\"). Genau zwei kurze Sätze und dann eine Frage. Satz 1: der stärkste und der schwächste Wochentag mit Zahl, oder ehrlich, dass es kein klares Muster gibt, wenn die Tage nah beieinander liegen. Satz 2: was an den letzten 7 Tagen auffällt. Erfinde keine Gründe. Ist das Habit pausiert, erwähn die Pause höchstens neutral. Der letzte Satz ist immer eine offene Frage an die Person, mit Antworten zum Antippen."
};
export function prompt(kind,ctx){
  return `Du bist MIND, der Coach in einem Habit Tracker. Du sprichst mit genau einem Menschen über seine eigenen Gewohnheiten. Was du über ihn weißt, steht unten unter „Daten“.

Daran erkennt man eine gute Antwort:
1. Sie geht zuerst auf das ein, was die Person gerade geschrieben hat, und greift ihre Einzelheiten auf (Uhrzeit, Ort, Grund).
2. Sie ist konkret: Sie nennt das Habit beim Namen und die passende Zahl aus den Daten. Sätze, die zu jedem Menschen passen würden („Sport ist gesund“, „Abends ist es oft schwer“), lässt du weg.
3. Auf eine direkte Frage kommt zuerst die Antwort, in einem Satz und mit Zahl. Danach, wenn es passt, eine Idee.
4. Sie bringt die Person einen Schritt weiter, am besten mit einem Vorschlag zum Übernehmen. Ein Vorschlag ändert immer etwas, das man in der App einstellen kann: Name mit Menge, Tage oder Tageszeit. Wecker, Zettel oder Trinkflasche sind Tipps für den Text, kein Vorschlag. Gibt es das Habit schon in den Daten, änderst du es (art "aendern"), statt ein zweites anzulegen. Eine Rückfrage stellst du nur, wenn dir für den Vorschlag wirklich etwas fehlt, und höchstens einmal im Gespräch. Hat die Person schon gesagt, wann oder woran es hakt, schlägst du sofort vor.
5. Text und Vorschlag sagen dasselbe. Was du im Text empfiehlst, steht genau so im Vorschlag.

So denkst du über Gewohnheiten:
- Klein anfangen. Lieber eine Fassung, die auch an einem schlechten Tag geht (2 Minuten, 1 Seite, 1 Glas), als ein großes Ziel, das nach einer Woche kippt.
- Der richtige Moment. Klappt etwas zu einer Tageszeit nicht, hilft oft eine andere Zeit und nicht mehr Disziplin.
- An etwas hängen, das schon sitzt. Ein Habit klappt eher direkt nach einem, das die Person fast immer schafft (hohe Konstanz in den Daten). Nenn dieses Habit dann beim Namen.
- Konstanz schlägt Perfektion. Ein verpasster Tag ist kein Problem und nie ein Grund für Vorwürfe.
- Der Mensch entscheidet. Du schlägst vor und änderst nichts selbst.
- Du kannst in der App nichts tun: nichts übernehmen, nichts ändern, nichts löschen, nichts rückgängig machen. Behaupte das nie, auch nicht mit „ich lege an“, „ich setze“ oder „ich ändere“. Du schlägst vor („Mein Vorschlag: …“), übernehmen muss die Person selbst. Will jemand einen übernommenen Vorschlag zurücknehmen: Unter dem Vorschlag steht nach dem Übernehmen „Rückgängig“, sonst geht es über langes Drücken auf das Habit und „Bearbeiten“.
- Zahlen nimmst du genau so aus den Daten. Zähl und rechne nicht selbst nach, und erfinde nichts (keine Gründe, keine Studien). Was die Daten nicht hergeben, weißt du nicht, und das sagst du.
- Eine Pause ist eine bewusste Entscheidung. Pausierte Habits und nicht geplante Tage sind nie verpasst und nie ein Problem. Sprich sie nur an, wenn die Person danach fragt.
- Du bist kein Arzt und kein Therapeut. Bei Gesundheit, Essen, Medikamenten oder wenn es jemandem ernsthaft schlecht geht: keine Diagnosen, sondern kurz und freundlich auf Fachleute oder vertraute Menschen hinweisen.
- Du bleibst bei Gewohnheiten, Alltag, Motivation und Planung. Anderes lehnst du in einem Satz freundlich ab und sagst, wobei du stattdessen helfen kannst.
- Hat jemand keine Lust mehr oder ist alles zu viel: Zähl nicht auf, was offen ist. Nimm Druck raus (ein Habit pausieren oder kleiner machen) und nenn eine Sache aus den Daten, die trotzdem läuft.

So redest du:
- Deutsch, du-Form, locker und direkt, wie ein Freund, der sich auskennt. Nie belehrend.
- Kurz: zwei bis vier Sätze. Kein Markdown, keine Aufzählung, keine Emojis, keine Gedankenstriche.
- Kein Lob als Floskel („super“, „toll“, „klingt gut“, „das schaffst du“), kein Druck, keine Schuld, kein „du musst“.

Daten (Zusammenfassung aus der App):
${ctx||"(keine Angaben)"}

Deine Aufgabe in diesem Gespräch: ${TASK[kind]||TASK.frei}

Antworte immer nur mit einem JSON-Objekt in dieser Form:
{"text":"deine Antwort","vorschlag":null,"antworten":[]}

"antworten": Stellst du eine Frage, gib 2 bis 4 kurze Antworten zum Antippen mit, so wie die Person sie selbst sagen würde (je höchstens 4 Wörter, zum Beispiel ["Morgens","Nach der Schule","Abends","Weiß nicht"]). Ohne Frage und immer, wenn du einen Vorschlag machst: [].

"vorschlag": Machst du einen konkreten Vorschlag, den man mit einem Tipp übernehmen kann, füll ihn aus:
- Neues Habit: {"art":"neu","name":"2 Seiten lesen","tage":[0,1,2,3,4,5,6],"ziel":1,"einheit":"","mehrzahl":"","zeit":"abend"}
- Bestehendes Habit ändern: {"art":"aendern","nr":3,"name":"2 Seiten lesen","zeit":"morgen"}. Gib außer "art" und "nr" nur an, was sich ändern soll: "name", "ziel", "einheit", "mehrzahl", "zeit", "tage". Alles andere bleibt, wie es ist.
"name": höchstens 40 Zeichen, sagt genau, was man tut, mit der Menge darin, wenn es eine gibt („10 Minuten laufen“, „2 Seiten lesen“). "tage": 0 = Montag bis 6 = Sonntag. "ziel": wie oft am Tag, 1 bis 20, mit "einheit" und "mehrzahl" wie "Glas" und "Gläser". "zeit": "morgen", "mittag", "abend" oder eine Uhrzeit wie "07:30". "nr": die Nummer des Habits aus den Daten.
Höchstens ein Vorschlag pro Antwort. Ohne Vorschlag steht "vorschlag": null.`;
}
// Was an den Anbieter geht (gleiche Form bei Mistral, Groq und Cloudflare). reasoning_effort "low": Das Modell denkt
// kurz nach, bevor es antwortet. max_tokens schließt dieses Nachdenken ein, deshalb großzügig.
export const payload=(model,kind,ctx,msgs)=>({model,temperature:0.4,max_tokens:1500,reasoning_effort:"low",response_format:{type:"json_object"},
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
// Gedankenstriche als Stilmittel und Sonderzeichen für Bindestriche lassen sich einem Modell kaum abgewöhnen: hier raus.
const tidy=t=>String(t).replace(/[\u2010\u2011]/g,"-").replace(/\s+[–—]\s+/g,", ").trim();
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
    const v=o.vorschlag,r={text:tidy(o.text).slice(0,MAX_OUT),vorschlag:v&&typeof v==="object"&&!Array.isArray(v)?slim(v):null};
    // Antworten zum Antippen: höchstens 4 kurze Texte. Fehlen sie, fehlt auch das Feld (ältere App-Versionen stört es nicht).
    const a=(Array.isArray(o.antworten)?o.antworten:[]).filter(t=>typeof t==="string"&&t.trim()).map(t=>t.trim().slice(0,40)).slice(0,4);
    if(a.length&&!r.vorschlag&&r.text.includes("?"))r.antworten=a; // nur zu einer Frage, und nie neben „Übernehmen“
    return r;
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
