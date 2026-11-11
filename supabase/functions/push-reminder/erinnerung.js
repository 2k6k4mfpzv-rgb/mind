// MIND – Push-Erinnerung: die Regeln und der Ablauf. Hier steht nichts, was Deno oder das Netz braucht,
// deshalb prüft tests/logik.html diese Datei genauso wie die App.
// logic.js und config.js in diesem Ordner sind Kopien aus public/js/ (ein Test prüft, dass sie gleich sind).
// So gilt für "geplant" und "geschafft" auf dem Server garantiert dieselbe Regel wie in der App.
import {norm,sched,ok,parseDay} from "./logic.js";

// Die Datenbank stößt die Funktion alle 5 Minuten an. Die eingestellte Uhrzeit wird auf dieses Raster abgerundet
// (20:02 -> 20:00), damit auch 23:58 noch am selben Tag drankommt.
export const TICK=5;
const MAXSUBS=10; // höchstens so viele Geräte pro Nutzer

// Tag und Uhrzeit in der Zeitzone des Nutzers. Unbekannte oder leere Zeitzone: Europe/Berlin.
export function localNow(now,tz){
  const parts=z=>new Intl.DateTimeFormat("en-CA",{timeZone:z,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(now);
  let p;try{p=parts(tz||"Europe/Berlin")}catch(e){p=parts("Europe/Berlin")}
  const g=t=>p.find(x=>x.type===t).value;
  return {day:g("year")+"-"+g("month")+"-"+g("day"),hm:g("hour")+":"+g("minute")};
}
const grid=hm=>{const [h,m]=hm.split(":").map(Number);return String(h).padStart(2,"0")+":"+String(m-m%TICK).padStart(2,"0")};

// Ist dieses Profil jetzt dran? Ja, wenn die Erinnerung an ist, die Uhrzeit erreicht ist und heute noch nichts kam.
// Gibt den heutigen Tag des Nutzers zurück (JJJJ-MM-TT), sonst null.
export function due(p,now){
  if(!p.rem_on)return null;
  const {day,hm}=localNow(now,p.timezone);
  return hm>=grid(p.rem_time)&&p.rem_sent!==day?day:null;
}

// Was ist heute noch offen? habits = Zeilen aus der Tabelle habits, counts = {habit_id: Anzahl heute}.
// Offen heißt: heute geplant (sched: Start, Pausen, Wochentage, frühere Einstellungen) und Tagesziel nicht erreicht (ok).
export function openToday(habits,counts,day){
  const d=parseDay(day);
  return habits.map(h=>norm({...h,done:counts[h.id]?{[day]:counts[h.id]}:{}},day)).filter(h=>sched(h,d)&&!ok(h,day));
}

// Die Nachricht: ruhig, ohne Vorwurf. Höchstens drei Namen.
export function text(open){
  const names=open.slice(0,3).map(h=>h.name),more=open.length-names.length;
  return {title:"MIND",body:"Noch offen: "+names.join(", ")+(more>0?` und ${more} ${more===1?"weiteres":"weitere"}`:"")};
}

// Nur an die Push-Dienste der Browser schicken (Chrome, Edge, Android, Firefox, Safari, Samsung), nie an beliebige Adressen
const HOSTS=/(^|\.)(fcm\.googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com|push\.samsungosp\.com)$/;
export const okEndpoint=u=>{try{const x=new URL(u);return x.protocol==="https:"&&HOSTS.test(x.hostname)}catch(e){return false}};

// Ein Durchlauf. db = Zugriff auf die Datenbank (siehe index.ts), send(sub, nachricht) = eine Push schicken, gibt den
// HTTP-Status des Push-Dienstes zurück. Pro Nutzer höchstens eine Nachricht am Tag: Der Tag wird VOR dem Senden als
// erledigt markiert (claim). So schickt auch ein doppelter Durchlauf nichts doppelt.
export async function run({db,send,now=new Date()}){
  const res={due:0,sent:0,gone:0,failed:0};
  for(const p of await db.profiles()){            // alle Profile mit eingeschalteter Erinnerung
    const day=due(p,now);if(!day)continue;
    const subs=(await db.subs(p.id)).filter(s=>okEndpoint(s.endpoint)).slice(0,MAXSUBS);
    if(!subs.length)continue;                      // kein Gerät angemeldet: nichts zu tun, nichts zu merken
    if(!await db.claim(p.id,day))continue;         // ein anderer Durchlauf war schneller
    res.due++;
    const open=openToday(await db.habits(p.id),await db.counts(p.id,day),day);
    if(!open.length)continue;                      // alles erledigt oder nichts geplant: Es kommt nichts
    const msg=text(open);let ok=0,retry=0;
    for(const s of subs){
      const st=await send(s,msg).catch(()=>0);
      if(st>=200&&st<300){ok++;res.sent++}
      else if(st===404||st===410){await db.dropSub(s.id);res.gone++} // das Gerät hat sich abgemeldet: Anmeldung löschen
      else{res.failed++;if(!st||st===429||st>=500)retry++}           // Push-Dienst gerade nicht erreichbar
    }
    if(!ok&&retry)await db.release(p.id);          // nichts kam an, lag aber nicht am Gerät: beim nächsten Durchlauf nochmal
  }
  return res;
}
