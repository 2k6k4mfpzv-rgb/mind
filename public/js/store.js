// MIND – kleiner Speicher auf dem Gerät (IndexedDB). Bleibt erhalten, auch wenn die App zu ist oder kein Netz da ist.
// Hier liegen zwei Dinge (beides legt data.js ab): "ops" = Haken, die noch nicht beim Server angekommen sind,
// und "snap" = der zuletzt bekannte Stand, damit die App ohne Netz sofort etwas zeigt.
// Geht der Speicher nicht (z. B. privates Fenster) oder antwortet er nicht, läuft die App normal weiter, nur ohne
// Offline-Gedächtnis. Deshalb wartet niemand länger als 2 Sekunden auf ihn.
let opening=null;
const open=()=>opening||(opening=new Promise((res,rej)=>{
  const r=indexedDB.open("mind",1);
  r.onupgradeneeded=()=>r.result.createObjectStore("kv");
  r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);
}));
const run=(mode,fn)=>Promise.race([new Promise(res=>setTimeout(res,2000)),open().then(db=>new Promise((res,rej)=>{
  const t=db.transaction("kv",mode),q=fn(t.objectStore("kv"));
  t.oncomplete=()=>res(q.result);t.onerror=t.onabort=()=>rej(t.error);
})).catch(()=>undefined)]);

export const get=key=>run("readonly",s=>s.get(key));
export const set=(key,value)=>run("readwrite",s=>s.put(value,key));
export const wipe=()=>run("readwrite",s=>s.clear());
