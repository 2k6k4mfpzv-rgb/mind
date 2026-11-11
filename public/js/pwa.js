// MIND – installierbare App: Service Worker anmelden, neue Version erkennen, Push für dieses Gerät.
// Der Service Worker selbst ist public/sw.js. Hier steht, was die Seite dafür tun muss. Gezeichnet wird hier nichts.
import {pushMode} from "./logic.js";
import * as data from "./data.js";

const sw=navigator.serviceWorker;
let reg=null,regP=Promise.resolve(null),want=false;

// --- Service Worker und neue Version ---
// onNew wird aufgerufen, sobald eine neue Version fertig geladen bereitliegt. update() schaltet auf sie um.
export async function start(onNew){
  if(!sw)return;
  const had=!!sw.controller; // false = allererster Besuch: Da übernimmt der Service Worker, ohne dass sich etwas ändert
  regP=sw.register("sw.js").catch(()=>null);
  reg=await regP;if(!reg)return;
  const ready=()=>{if(reg.waiting&&sw.controller)onNew()};
  ready();
  reg.addEventListener("updatefound",()=>{const w=reg.installing;if(w)w.addEventListener("statechange",ready)});
  // Die neue Version hat übernommen (hier angetippt oder in einem anderen Fenster): einmal neu laden
  let done=false;
  sw.addEventListener("controllerchange",()=>{if((had||want)&&!done){done=true;location.reload()}});
}
export const check=()=>{if(reg)reg.update().catch(()=>{})}; // nachsehen, ob es eine neue Version gibt
export const update=()=>{if(reg&&reg.waiting){want=true;reg.waiting.postMessage("update")}};

// --- Push auf diesem Gerät ---
// Die Erinnerung selbst (an/aus, Uhrzeit) steht im Profil und gilt für alle Geräte. Hier geht es nur darum, ob
// dieses Gerät sie bekommt: Dafür meldet es sich beim Push-Dienst des Browsers an, und die Anmeldung wird gespeichert.
const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1;
const home=navigator.standalone===true||matchMedia("(display-mode: standalone)").matches; // läuft als App vom Home-Bildschirm
const b64=buf=>btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const bytes=s=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
const sub=r=>r.pushManager.getSubscription().catch(()=>null);
async function can(){const r=await regP;return r&&"PushManager" in window&&"Notification" in window?r:null}

// Was geht hier gerade? "on" | "off" | "blocked" | "home" (iPhone: erst zum Home-Bildschirm) | "none"
export async function pushState(){
  const r=await can();
  return pushMode({push:!!r,ios,home,perm:r?Notification.permission:"",sub:!!(r&&await sub(r))});
}
// Einschalten. Die Frage nach der Erlaubnis muss direkt auf den Tipp folgen, deshalb steht sie ganz vorn.
// Gibt "" zurück, wenn es geklappt hat, sonst den Grund: "blocked" | "server" (Push noch nicht eingerichtet) | "error"
export async function pushOn(){
  try{
    const r=await can();if(!r)return "error";
    if(await Notification.requestPermission()!=="granted")return "blocked";
    const key=await data.pushKey();if(!key)return "server";
    let s=await sub(r);
    // Alte Anmeldung mit einem anderen Schlüssel des Servers: Die würde nie ankommen, also neu anmelden
    if(s&&s.options.applicationServerKey&&b64(s.options.applicationServerKey)!==key){await s.unsubscribe();s=null}
    if(!s)s=await r.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes(key)});
    return await data.savePush(s.toJSON())?"":"error";
  }catch(e){return "error"}
}
// Ausschalten (auch beim Abmelden, sonst käme die Erinnerung weiter auf dieses Gerät)
export async function pushOff(){
  const r=await can(),s=r&&await sub(r);if(!s)return;
  await data.dropPush(s.endpoint);await s.unsubscribe().catch(()=>{});
}
// Nach dem Laden des Profils, einmal pro Öffnen: die Anmeldung dieses Geräts auffrischen (der Browser kann sie
// zwischendurch erneuern, und der Server löscht Anmeldungen, die der Push-Dienst als abgemeldet meldet)
let kept=false;
export async function pushKeep(){
  if(kept)return;
  const r=await can(),s=r&&Notification.permission==="granted"&&await sub(r);
  if(s)kept=await data.savePush(s.toJSON());
}
