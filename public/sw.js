// MIND – Service Worker: ein kleines Programm, das der Browser neben der Seite laufen lässt.
// Er macht drei Dinge: 1. Die App startet ohne Netz (alle Dateien liegen auf dem Gerät).
// 2. Eine neue Version wird im Hintergrund geladen und erst auf Tipp übernommen ("Neue Version").
// 3. Er zeigt die Push-Erinnerung an, auch wenn MIND zu ist.
// Die Daten (Habits, Haken) laufen NICHT hier durch: Anfragen an Supabase gehen immer direkt ins Netz (js/data.js).

// VERSION ändert sich mit jeder Änderung an einer Datei aus FILES. Nur so merkt der Browser, dass es etwas Neues gibt.
// Der richtige Wert ist die Prüfsumme über alle Dateien: tests/logik.html rechnet ihn aus und zeigt ihn an,
// wenn er hier nicht stimmt. Kommt eine Datei in public/ dazu, gehört sie in die Liste (auch das prüft der Test).
const VERSION="cbf84faffa2e";
const FILES=[
  "./","manifest.webmanifest",
  "css/tokens.css","css/base.css","css/components.css",
  "fonts/plus-jakarta-sans.woff2",
  "icons/icon.svg","icons/icon-192.png","icons/icon-512.png","icons/maskable-512.png","icons/apple-touch-icon.png",
  "js/vendor/supabase.js",
  "js/config.js","js/logic.js","js/state.js","js/store.js","js/data.js","js/pwa.js",
  "js/ui/dom.js","js/ui/render.js","js/ui/toast.js","js/ui/sheet.js","js/ui/edit.js","js/ui/menu.js",
  "js/ui/heute.js","js/ui/verlauf.js","js/ui/sammlung.js","js/ui/ich.js",
  "js/app.js"
];
const CACHE="mind-"+VERSION;

// Installieren: alle Dateien frisch vom Server holen (am Zwischenspeicher des Browsers vorbei).
// Fehlt eine, schlägt die Installation fehl und die bisherige Version bleibt. Es gibt nie eine halbe Version.
self.addEventListener("install",e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:"reload"})))));
});
// Übernehmen: alte Versionen wegräumen. Beim allerersten Besuch gleich für die offene Seite zuständig werden.
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys()
    .then(ks=>Promise.all(ks.filter(k=>k.startsWith("mind-")&&k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});
// Die Seite sagt "update" (Tipp auf "Neue Version"): nicht warten, bis alle Fenster zu sind
self.addEventListener("message",e=>{if(e.data==="update")self.skipWaiting()});

// Dateien der App kommen vom Gerät, alles andere normal aus dem Netz
self.addEventListener("fetch",e=>{
  const r=e.request;
  if(r.method!=="GET"||new URL(r.url).origin!==location.origin)return;
  e.respondWith(caches.open(CACHE).then(async c=>await c.match(r.mode==="navigate"?"./":r,{ignoreSearch:true})||fetch(r)));
});

// Push-Erinnerung vom Server (supabase/functions/push-reminder): {title, body}
self.addEventListener("push",e=>{
  let d={};try{d=e.data.json()}catch(_){}
  e.waitUntil(self.registration.showNotification(d.title||"MIND",{body:d.body||"",icon:"icons/icon-192.png",tag:"mind-erinnerung"}));
});
// Antippen: MIND nach vorn holen oder öffnen
self.addEventListener("notificationclick",e=>{
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(ws=>{
    const w=ws.find(w=>w.url.startsWith(self.registration.scope));
    return w?w.focus():self.clients.openWindow("./");
  }));
});
