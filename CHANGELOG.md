# MIND – Änderungsprotokoll

Private Habit-Tracker-Website. Frontend: `public/` (Gerüst `index.html`, dazu `css/` und `js/` als Module, kein Build-Schritt). Daten und Login: Supabase. Hosting: Cloudflare (Workers mit statischen Dateien), automatisches Deployment bei jedem Commit auf `main`.

## Aufbau
| Teil | Ort |
|---|---|
| Webseite | `public/index.html`, `public/css/`, `public/js/`, `public/sw.js` (Service Worker), `public/manifest.webmanifest` |
| Push-Erinnerung | `supabase/functions/push-reminder/` (Supabase Edge Function, von der Datenbank alle 5 Minuten angestoßen) |
| Cloudflare-Konfiguration | `wrangler.jsonc` (Ordner `./public` wird veröffentlicht) |
| Datenbank-Schema | `docs/schema.sql` und danach die Dateien `docs/JJJJ-MM-TT_*.sql` der Reihe nach |
| Login | Supabase Auth, E-Mail und Passwort, Registrierung gesperrt |

## Änderungen (neueste zuerst)

### 2026-11-11 – Erinnerung kommt minutengenau
- **Warum:** Paul: So kennt man es von anderen Apps, das 5-Minuten-Raster verwirrt (14:43 kam erst um 14:45 oder schon um 14:40).
- **Was:** Die Datenbank stößt die Server-Funktion jetzt jede Minute an statt alle 5 (`docs/2026-11-11_erinnerung-minutengenau.sql`). In `erinnerung.js` entfällt das Abrunden der Uhrzeit. Die Funktion ist neu ausgerollt.
- Kein Code der App geändert. Ändert keine Daten.

### 2026-11-11 – Erinnerung: Eine geänderte Uhrzeit gilt am selben Tag noch einmal
- **Warum:** Paul bekam nach dem Umstellen der Uhrzeit keine Erinnerung. Am selben Tag war schon eine verschickt, und `profiles.rem_sent` (höchstens eine Nachricht am Tag) blieb stehen.
- **Was:** Ein Trigger auf `profiles` leert `rem_sent`, wenn sich `rem_time` ändert und die neue Uhrzeit noch vor uns liegt (in der Zeitzone des Profils). Liegt sie schon hinter uns, bleibt alles, wie es ist: Es kommt keine zweite Nachricht sofort.
- **Datenbank:** `docs/2026-11-11_erinnerung-uhrzeit.sql`, ausgeführt am 11.11.2026 nach Pauls Ja. Backup der Tabelle `profiles`: `2026-11-11_vor-Erinnerung-Uhrzeit.json`. Keine Daten geändert, kein Code der App geändert.
- **Geprüft (Probelauf, zurückgenommen):** Uhrzeit auf später leert das Datum, auf früher nicht, ein anderes Feld ändern nicht, eine unbekannte Zeitzone lässt das Speichern nicht scheitern.

### 2026-11-11 – Installierbare App: offline nutzbar, Haken werden nachgeschickt, Push-Erinnerung vom Server
- **Warum:** Paket 2 von vier (Vault: `Habit Tracker/MIND – Fable Auftrag 2 (Funktionen komplett).md`), Teil B. Pauls Entscheidungen: MIND wird eine installierbare Web-App statt einer App aus dem App Store (07.11.), Push nur, wenn noch etwas offen ist (10.11.). Damit ist A4 gebaut und MIND ohne KI funktional komplett.
- **Installierbar:** `public/manifest.webmanifest` (Name, eigenes Fenster, Farben), App-Symbol im Puls-Stil (der Tagesring in Koralle auf dunklem Grund, `public/icons/`, Vorlage `icon.svg`, PNG-Größen aus `docs/icons.py`), Angaben für das iPhone in `index.html` (Home-Bildschirm, Titel, Statusleiste).
- **Ohne Netz starten:** Der Service Worker `public/sw.js` legt alle Dateien der App auf dem Gerät ab. Die Supabase-Bibliothek liegt jetzt selbst gehostet in `public/js/vendor/` (gleiche Version 2.45.4, Prüfsumme mit zwei Quellen verglichen), es wird nichts mehr von fremden Servern geladen.
- **Stand vom Gerät:** Die App merkt sich Habits, Haken und Profil auf dem Gerät (`public/js/store.js`, IndexedDB) und zeigt sie beim Start sofort, noch bevor die Anmeldung geprüft ist. Das macht den Start auch mit Netz schneller. Beim Abmelden wird alles gelöscht.
  - Mit der echten Supabase-Bibliothek nachgestellt: Ohne Netz und mit abgelaufener Anmeldung meldet sie erst nach etwa 50 Sekunden „abgemeldet“, die Anmeldung bleibt aber gespeichert. In genau diesem Fall bleibt die App beim Stand vom Gerät, statt den Login zu zeigen.
- **Haken ohne Netz:** Jeder Tipp ist ein Auftrag mit eigener ID in einer Warteschlange, die auf dem Gerät gespeichert ist. Ohne Netz bleibt der Haken stehen (vorher wurde er zurückgenommen) und oben steht ruhig „Offline. 2 Haken werden nachgeschickt, sobald du wieder Netz hast.“ Sobald das Netz zurück ist, geht alles in der richtigen Reihenfolge raus.
  - **Doppelsicher:** Die Datenbank merkt sich die IDs (`checkin_ops`). Kommt derselbe Tipp zweimal an, weil nur die Antwort verloren ging, zählt er einmal.
  - Hat ein anderes Gerät inzwischen auch abgehakt, zählen beide. Wurde das Habit woanders gelöscht, wird der Haken zurückgenommen und gemeldet.
  - Alles andere (Habit ändern, anlegen, löschen, Einstellungen) braucht weiter Netz: Es wird zurückgenommen, oben steht „Kein Netz. Das wurde nicht gespeichert.“
- **Neue Version:** Sie wird im Hintergrund vollständig geladen. Oben erscheint „Neue Version von MIND. Tippen zum Aktualisieren.“ Kein Popup. Wer nicht tippt, bekommt sie beim nächsten Öffnen. Damit der Browser eine neue Version überhaupt bemerkt, steht in `sw.js` eine Prüfsumme über alle Dateien (`VERSION`), über die ein Test wacht.
- **Push-Erinnerung (ersetzt die alte, die nur bei offener Seite ging):** Zur eingestellten Uhrzeit kommt höchstens eine Nachricht am Tag, und nur wenn dann noch Habits offen sind: „Noch offen: Wasser, Lesen und 2 weitere“. Ist alles erledigt, kommt nichts. Kein Nachhaken, keine roten Punkte.
  - In „Ich“ gilt der Schalter für alle Geräte. Neu ist die Zeile „Dieses Gerät“: bekommt die Erinnerung (Ausschalten), bekommt sie noch nicht (Einschalten), Benachrichtigungen gesperrt, iPhone erst zum Home-Bildschirm, Browser kann kein Push.
  - Auf dem Server: Edge Function `supabase/functions/push-reminder`, die die Datenbank alle 5 Minuten anstößt. Sie rechnet „offen“ mit denselben Dateien wie die App (Kopien von `logic.js` und `config.js`, ein Test prüft, dass sie gleich sind), also zählen Pausen, Wochentage und frühere Einstellungen genauso. Uhrzeit und Tag gelten in der Zeitzone aus dem Profil.
  - Die Nachricht wird für jedes Gerät einzeln verschlüsselt (Web Push, RFC 8291 und 8292), ohne fremde Bibliothek. Der Test rechnet das Beispiel aus dem Standard nach.
  - **Keine Schlüssel im Code oder im Repository, und Paul muss keinen eintragen:** Die Losung für den Aufruf erzeugt die Datenbank selbst, das Schlüsselpaar die Funktion beim ersten Lauf. Beides liegt im Tresor der Datenbank (Supabase Vault).
  - Abhaken direkt aus der Benachrichtigung („Erledigt“-Knopf) gibt es bewusst nicht: Das iPhone kann es bei Web-Apps nicht, und es wäre ein zweiter Weg mit eigener Anmeldung.
- **Datenbank (ausgeführt am 11.11.2026, siehe „Datenbank und Server“ unten):** `docs/2026-11-11_haken-ohne-netz.sql` (Tabelle `checkin_ops`, die zwei Haken-Funktionen bekommen den freiwilligen Wert `p_op`) und `docs/2026-11-11_push.sql` (Tabelle `push_subs`, Spalte `profiles.rem_sent`, Tresor, Zeitplan mit `pg_cron` und `pg_net`). Bestehende Daten werden nicht verändert, der alte Code auf `main` läuft mit beidem weiter. **Die erste Datei muss laufen, bevor der neue Code getestet wird**, sonst schlägt das Abhaken fehl. Für Push dazu die zweite Datei und die ausgerollte Funktion.
- **Aufgeräumt:** Die alte Erinnerung (`setInterval` in `ich.js`) ist weg. Der alte Browser-Eintrag `habits-rem` wird einmal ins Profil übernommen und gelöscht.
- **Tests:** `tests/logik.html` hat 141 Tests (vorher 95). Neu: Warteschlange ohne Netz (sammeln, nachschicken, doppelsicher, Reihenfolge, anderes Gerät, Neuladen mit wartenden Haken, gelöschtes Habit), Start vom Gerät ohne Netz und Rückkehr, Abmelden löscht alles, Zeile „Dieses Gerät“, Regeln der Erinnerung (Zeitzone, Sommerzeit, Mitternacht, 5-Minuten-Raster, was offen ist, Text), ganze Durchläufe mit nachgebauter Datenbank (einmal am Tag, nichts offen, Gerät abgemeldet, Push-Dienst nicht erreichbar), Verschlüsselung gegen das Beispiel aus RFC 8291 und mit Gegenprobe, Ausweis des Servers, Liste und Prüfsumme im Service Worker, Manifest. Zwei alte Tests sind angepasst, weil sich das Verhalten bewusst geändert hat (Haken ohne Netz bleiben jetzt stehen).
- **Teststand:** 141 von 141 Tests grün. Im Browser geprüft: Service Worker installiert sich, die App lädt bei abgeschaltetem Server vollständig, eine neue Version wird erkannt, wartet und übernimmt auf Tipp. Mit Testdaten angesehen (Handy 375 px und Mac 1280 px, hell und dunkel). **Nicht geprüft:** die App angemeldet gegen die echte Datenbank, eine echte Push auf einem echten Gerät, Installieren und Statusleiste auf dem iPhone.
- **Datenbank und Server (11.11.2026, nach Pauls Ja):**
  - Backup davor: `2026-11-11_vor-PWA.json` mit `habits`, `checkins` und `profiles` (Prüfsumme gleich wie in der Datenbank: 9 Habits, 99 Zeilen, 122 Haken, 1 Profil).
  - Beide SQL-Dateien liefen ohne Fehler. Danach sind alle bisherigen Daten unverändert (gleiche Prüfsumme, bei `profiles` ohne die neue Spalte `rem_sent`).
  - Probelauf zu den Haken in der echten Datenbank als angemeldeter Nutzer, komplett zurückgenommen: Tipp mit ID zählt, derselbe Tipp nochmal zählt nicht, Aufruf ohne ID (alter Code auf `main`) geht weiter, nie über das Tagesziel, `checkin_set` genauso, die alte Spalte `done` wird nachgezogen, fremder Nutzer und nicht Angemeldete werden abgelehnt.
  - Probelauf zu Push, komplett zurückgenommen: Die App bekommt den öffentlichen Schlüssel, ein Gerät steht nur einmal in `push_subs`, Adressen ohne https werden abgelehnt. Die App darf `rem_sent` nicht ändern, keine Geheimnisse lesen, keine Schlüssel setzen und den Zeitplan nicht anstoßen. Fremde sehen und löschen keine Geräte, nicht Angemeldete kommen nirgends heran. Die Schnittstelle kennt die neuen Funktionen (auch der Aufruf ohne `p_op` wird eindeutig zugeordnet).
  - Edge Function `push-reminder` ausgerollt (Version 1, eigene Prüfung der Losung statt JWT). Ohne oder mit falscher Losung antwortet sie mit 403. Von der Datenbank angestoßen antwortet sie mit 200 und hat beim ersten Lauf das Schlüsselpaar erzeugt: Im Tresor liegen `mind_push_cron`, `mind_vapid_public`, `mind_vapid_private`. Der Zeitplan ist aktiv (`mind-push` alle 5 Minuten, `mind-tipp-ids` nachts).
  - Sicherheitscheck von Supabase: ein neuer Hinweis zu `push_key()` (gewollt, gibt nur den öffentlichen Schlüssel heraus), sonst nur der bekannte Hinweis zu geleakten Passwörtern.
  - Ganzer Durchlauf in der echten Umgebung mit einem erfundenen Gerät: Die Funktion hat das Profil als dran erkannt, den Tag markiert, die offenen Habits gefunden und an Googles Push-Dienst geschickt. Der hat das Gerät als unbekannt gemeldet, die Funktion hat die Anmeldung gelöscht (Ergebnis `due 1, gone 1`). Danach wieder zurückgestellt (Uhrzeit 15:00, `rem_sent` leer, kein Gerät angemeldet). Offen bleibt nur die echte Zustellung auf ein echtes Gerät.
- **Nichts sonst geändert.** Mit Netz verhält sich die App wie vorher.

### 2026-11-10 – Puls Schritt 2 und 3: Kachel lange drücken, Pausieren, Einheit, Sammlung mit Themes
- **Warum:** Paket 2 von vier (Vault: `Habit Tracker/MIND – Fable Auftrag 2 (Funktionen komplett).md`), Teil A. Damit ist das Redesign „Puls“ funktional komplett. Pauls Entscheidungen vom 10.11.: Pausieren mit optionalem Enddatum, Bearbeiten als Blatt auf „Heute“, Einheit in Einzahl und Mehrzahl, 6 Themes gratis nach 7, 30, 60, 100, 150 und 250 Tagen insgesamt.
- **Kachel lange drücken** (Handy, etwa eine halbe Sekunde), **Rechtsklick** (Mac) oder Kontextmenü-Taste öffnet ein Blatt: Name, Farbtupfer (ein Tipp = sofort geändert), Bearbeiten, Pausieren bzw. Fortsetzen. Ein normaler Tipp hakt weiter ab, Scrollen löst nichts aus. Neue Datei `public/js/ui/menu.js`.
- **Bearbeiten als Blatt** direkt auf „Heute“. Es ist dasselbe Formular wie in der Verlauf-Karte: Der Code dafür liegt jetzt einmal in `public/js/ui/edit.js` und wird an beiden Stellen benutzt. Hinweise wie „Der Name darf nicht leer sein.“ stehen jetzt im Formular statt oben auf der Seite.
- **Pausieren:** ab heute, entweder „bis ich fortsetze“ oder bis zu einem Datum (einschließlich), danach läuft das Habit von selbst weiter. Pausierte Tage sind **nicht geplant** (eine Stelle: `sched()` in `logic.js`), deshalb bleiben Konstanz, Serie, Tagesring und Fortschritt, wie sie sind. Auf „Heute“ verschwindet die Kachel, ganz unten steht ruhig „2 pausiert“ (aufklappen, „Fortsetzen“). Im Verlauf steht „Pausiert“ an der Karte, pausierte Tage sind im Punkte-Raster ein kurzer Strich statt eines leeren Punkts, und es gibt den Knopf „Pausieren“ bzw. „Fortsetzen“. Haken aus der Zeit vor und in der Pause bleiben.
- **Einheit:** zwei optionale Felder unter „Mehr Optionen“ (Einheit und Mehrzahl). Die Kachel zeigt „noch 3 Gläser“ bzw. „noch 1 Glas“. Bei einmal am Tag steht die Einheit einfach da, z. B. „5 Minuten“. Leer = wie bisher „noch 3×“.
- **Sammlung:** neuer Tab (Tab-Leiste: Heute, Verlauf, Sammlung, Ich). 6 Themes als Farbwelten, jeweils hell und dunkel: Morgennebel (7 Tage), Wald (30), Sand (60), Tiefsee (100), Abendrot (150), Mitternacht (250). Gezählt werden **Tage insgesamt**, an denen mindestens ein Habit geschafft ist, nicht am Stück. Noch nicht freie Themes sehen genauso aus wie freie (kein Schloss, nichts ausgegraut) und zeigen nur „noch 23 Tage“. Im Verlauf eine kleine Karte zum nächsten Theme. Ein neu freigeschaltetes Theme wird nur dort und in der Sammlung ruhig erwähnt: kein Popup, kein Punkt an der Tab-Leiste. Neue Datei `public/js/ui/sammlung.js`, Farben in `public/css/tokens.css`.
  - **Man verliert nie etwas:** Der höchste Stand der Tage wird im Profil gemerkt (`days_total`) und nur erhöht. Löscht man später ein Habit mit seinen Haken, bleibt ein freigeschaltetes Theme frei.
  - Das gewählte Theme steht im Profil (gilt auf allen Geräten). Das Gerät merkt es sich zusätzlich, damit die Seite gleich in der richtigen Farbe startet. Beim Abmelden wird das zurückgesetzt.
  - Alle Textfarben der Themes sind auf Kontrast geprüft (mindestens 4,5 : 1).
- **Datenbank:** `docs/2026-11-10_puls-2-3.sql`. Neue Spalten `unit`, `unit_pl`, `paused` in `habits` und `theme`, `days_total` in `profiles`, alle mit einem Standardwert, der dem heutigen Verhalten entspricht. Bestehende Daten werden nicht verändert, der alte Code auf `main` stört sich nicht daran. **Muss laufen, bevor der neue Code getestet wird.**
- **Backup:** „Daten kopieren“ und „Importieren“ kennen Einheit und Pausen. Alte Backups passen weiter.
- **Am Rand:** Kommt ein Haken von einem anderen Gerät, während irgendein Blatt offen ist, wird erst nach dem Schließen neu gezeichnet (vorher galt das nur für „Neues Habit“ und das Bearbeiten). Nach dem Schließen des Blatts der Kachel wird sofort neu gezeichnet.
- **Tests:** `tests/logik.html` hat 95 Tests (vorher 48). Neu: Pausieren (geplant oder nicht, Konstanz, Serie, Enddatum, Fortsetzen, Punkte-Raster), Blatt der Kachel (lange drücken, Scrollen, kurzer Tipp, Rechtsklick, Farbe, Bearbeiten, Pausieren aus dem Verlauf), Einheit, Sammlung (Tage insgesamt, Schwellen, Höchststand, Theme wählen, kein Netz, Abmelden), Backup mit Einheit und Pausen. `tests/mock-supabase.js` kennt die neuen Spalten und prüft, welche Profil-Spalten die App ändern darf.
- **Teststand:** 95 von 95 Tests grün. Mit Testdaten im Browser angesehen (Handy 375 px und Mac 1280 px, hell und dunkel). **SQL am 10.11.2026 nach Pauls Ja ausgeführt** (Backup davor: `2026-11-10_vor-Puls-2-3.json` mit `habits`, `checkins` und `profiles`, Prüfsumme gleich wie in der Datenbank). Danach geprüft: alle bisherigen Daten unverändert (gleiche Prüfsumme ohne die neuen Spalten, 9 Habits, 99 Zeilen in `checkins`, 121 Haken, 1 Profil), alle 9 Habits haben die Standardwerte. Probelauf in der echten Datenbank als angemeldeter Nutzer, der am Ende komplett zurückgenommen wurde: Theme und Tage-Stand lassen sich ändern, `plan` weiterhin nicht, falsches Theme, negativer Stand, Einheit über 20 Zeichen und kaputte Pausen-Liste werden abgelehnt, Haken setzen geht bei einem pausierten Habit weiter, ein anderer Nutzer ändert nichts, nicht angemeldet wird abgelehnt. Supabase-Sicherheitscheck: keine neue Meldung. Die Vorschau liefert den aktuellen Stand aus. Paul hat die Vorschau getestet und am 10.11.2026 „Passt, mergen“ gesagt. Gemergt mit Pull Request #6.
- **Nichts sonst geändert.** Solange nichts pausiert ist und keine Einheit eingetragen ist, rechnet und zeigt die App wie vorher (die 48 bisherigen Tests laufen unverändert durch).

### 2026-11-10 – Fundament: Code in Module aufgeteilt, Haken in eigener Tabelle (mehrere Geräte sicher)
- **Warum:** Erstes von vier Paketen bis 16.11. (Vault: `Habit Tracker/MIND – Fable-Plan bis 16.11. (Profi-Level).md`). Alles, was danach kommt (Puls 2 und 3, installierbare App mit Offline und Push, KI, Design), soll auf einem sauberen Fundament stehen. Dazu der offene Punkt aus dem Review vom 07.11.: Haken zwei Geräte gleichzeitig ab, konnte ein Haken verloren gehen. **Für Paul sieht die App genau gleich aus.**
- **Teil A – Aufteilung (kein Build-Schritt, der Browser lädt die Dateien direkt):**
  - `public/index.html` enthält nur noch das Gerüst der Seite (134 statt 714 Zeilen).
  - `public/css/tokens.css` (alle Farben, Rundungen, Abstände, Schatten, Schrift, Animationsdauern als Variablen), `base.css` (Grundregeln, Formularfelder), `components.css` (Bausteine und Ansichten).
  - `public/js/config.js` (Supabase-Adresse, Farben, Symbole, Grenzen), `logic.js` (reine Rechen-Funktionen, „heute“ ist ein Parameter), `state.js` (Zustand im Browser), `data.js` (die einzige Stelle, die mit Supabase spricht), `ui/` (dom, render, heute, verlauf, ich, sheet, toast), `app.js` (Start, Login, Tab-Leiste, aktuell bleiben).
- **Teil B – Daten:** Neue Tabelle `checkins` (eine Zeile pro Habit und Tag). Die App schickt nie mehr die ganze Liste, sondern ruft Funktionen in der Datenbank auf: `checkin_add` zählt in einem Schritt hoch (nie unter 0, nie über das Tagesziel), `checkin_set` setzt fest (zurück auf 0, Rückgängig), `checkins_map` lädt alle Haken in einem Rutsch. Datei `docs/2026-11-10_checkins.sql`. **Muss laufen, bevor der neue Code getestet wird.**
  - **Umzug:** Alle bisherigen Haken werden aus `habits.done` kopiert. Die SQL prüft selbst, ob Tage und Haken vorher und nachher gleich sind (insgesamt und pro Habit), sonst bricht sie ab und ändert nichts.
  - **Rückweg bleibt offen:** Die Spalte `done` bleibt und wird automatisch aktuell gehalten (in beide Richtungen). Der alte Code auf `main` und alte offene Browser-Tabs funktionieren weiter und verlieren nichts. `done` wird frühestens in ein paar Wochen gelöscht (steht unten in der SQL-Datei).
  - **Realtime:** Ein Haken auf dem Handy erscheint sofort am Mac, ohne Neuladen.
- **Verhalten, das sich bewusst ändert (alles nur im Fehlerfall):**
  - Schlägt das Speichern fehl (kein Netz), wird die Änderung jetzt zurückgenommen (Kachel, Bearbeiten, Löschen, Verschieben, Einstellungen), statt nur eine Meldung zu zeigen. Vorher sah es aus wie gespeichert, war es aber nicht.
  - Schlägt das Neuladen fehl, bleiben die Habits stehen, statt kurz zu verschwinden.
  - Schnelle Tipps gehen nacheinander zum Server, in der richtigen Reihenfolge.
- **Tests:** `tests/logik.html` läuft jetzt über die Module und hat 48 Tests (vorher 28): die bisherigen plus Datenschicht (Server zählt, zwei Geräte gleichzeitig, schnelle Tipps, Zurückrollen bei Fehlern, Realtime, Löschen, Backup und altes Backup). `tests/mock-supabase.js` kennt `checkins`, die drei Funktionen und Realtime.
- **Teststand:** 48 von 48 grün. Vorher/Nachher automatisch verglichen (alte und neue App nebeneinander, dieselben Klicks, jedes Element mit allen berechneten CSS-Werten und Positionen): 64 Schritte (Handy 375 px und Mac 1280 px, hell und dunkel, je 16 Klick-Schritte durch Heute, Verlauf, Bearbeiten, Ich und Neues Habit), knapp 97.000 Elemente, **0 Unterschiede**. **SQL am 10.11.2026 nach Pauls Ja ausgeführt** (Backup davor: `2026-11-10_vor-Fundament.json`, Prüfsumme gleich wie in der Datenbank). Umzug: 94 Tage und 120 Haken, bei allen 9 Habits gleich, die Tabelle `habits` ist unverändert. Danach ein Probelauf in der echten Datenbank als angemeldeter Nutzer, der am Ende komplett zurückgenommen wurde: Hochzählen bis zum Tagesziel (2, 3, 4, 4), nie unter 0, Festsetzen (auch 99 wird 20, -5 wird 0), `done` wird nachgezogen, alter Code, der `done` schreibt, landet in `checkins` (neu, geändert, entfernt), Löschen nimmt die Haken mit, ein anderer Nutzer sieht nichts und darf nichts, nicht angemeldet wird abgelehnt. Supabase-Sicherheitscheck: keine Meldung zu den neuen Tabellen und Funktionen. Paul hat die Vorschau getestet und am 10.11.2026 „Passt, mergen“ gesagt. Gemergt mit Pull Request #5.
- **Hinweis:** Die Tests und die Vorschau brauchen einen kleinen Webserver (`python3 -m http.server 8000`), ein Doppelklick auf die Datei reicht nicht (Module lädt der Browser nur über http).
- **Nichts sonst geändert.** Aussehen, Texte und Bedienung sind gleich.

### 2026-11-07 – Roadmap: Zielbild „Puls + KI“ eingeplant
- **Warum:** Paul hat entschieden, dass das Konzeptbild „Puls + KI“ der Idealzustand ist, außer dem, was in Puls Schritt 1 und 1.1 bewusst anders gebaut wurde. Alles soll in der Roadmap stehen, damit nichts vergessen wird. Abgleich im Vault: `Habit Tracker/MIND – Zielbild Puls + KI (Abgleich).md`.
- **Änderung in `ROADMAP.md`:**
  - A7 Schritt 2: Kachel lange drücken, Pausieren, Einheit auf der Kachel
  - A7 Schritt 3: Sammlung
  - A5: MIND-Knopf, KI-Einstiege, Pro-Stil, faire Pro-Seite
  - A5, Pauls Entscheidung: Pro ist vorbereitet, aber nicht gesperrt. Pro-Stellen werden fertig gebaut. Solange es kein bezahltes Pro gibt, können alle sie nutzen. Später wird Pro mit ein paar vorbereiteten Schritten eingeführt, ohne Umbau.
  - A5, Pauls Entscheidung: Die KI läuft am Anfang mit kostenlosen Modellen und einem Limit pro Nutzer. Anbieter und Modell stehen an einer Stelle. Bezahlte KI und mehr Nutzung kommen erst, wenn es sich wirtschaftlich lohnt.
  - B4: Pro einführen (Bezahlen, Preis, Pro-Stellen sperren, bezahlte KI)
  - Launch-Checkliste: KI-Limit pro Nutzer
- Am Code nichts geändert.

### 2026-11-07 – Puls Schritt 1.1: Fehler aus dem Review behoben, weniger Zahlen, Rückgängig, Logik-Tests
- **Warum:** Paul hat vor dem Merge gefragt, was ein Profi anders machen würde. Dabei kamen zwei echte Fehler heraus, die es auch live schon gab, dazu Punkte, die im Alltag nerven. Review im Vault: `Habit Tracker/MIND – Puls Schritt 1 Review (Profi-Blick).md`. Paul hat entschieden, alles gleich mit in diesen Pull Request zu nehmen.
- **Fehler 1 – alte Haken zählten nach einer Zieländerung nur teilweise:** Wasser und Supplements hatten vor A2 nur „1 = geschafft“. Seit das Ziel 4 bzw. 2 ist, zählte eine alte 1 als „1 von 4“. Konstanz 17 % und 13 %, viele halbe Punkte.
  - Neue Spalte `settings_log` (Standard `[]`) merkt sich frühere Einstellungen: bis wann welche Tage und welches Tagesziel galten. Ändert man Tage oder Ziel, gilt das Neue ab heute, alte Tage zählen nach den alten Einstellungen. Die Haken selbst werden nie umgeschrieben.
  - Einmalig für Pauls Daten (seine Entscheidung): Habits mit Ziel über 1 bekommen „bis 06.11.2026 galt 1×“.
  - Datei `docs/2026-11-07_puls-einstellungen-verlauf.sql`. Muss laufen, bevor der neue Code getestet wird.
- **Fehler 2 – lange offene App wurde veraltet:** Der Tag wurde nur beim Laden bestimmt, und jeder Haken schickte die ganze Liste eines Habits. Ein Handy mit altem Stand konnte Haken vom Mac überschreiben, und über Mitternacht zeigte „Heute“ noch gestern. Jetzt: Beim Zurückkommen zur Seite werden Habits und Profil neu geladen, nach Mitternacht die ganze Seite. Nie mitten beim Bearbeiten oder Anlegen. Eine gerade gesetzte Änderung wird von einem langsamen Neuladen nicht überschrieben.
- **Weniger Zahlen:** Konstanz überall gleich gerechnet, letzte 30 Tage (Pauls Entscheidung). Gilt für die Heute-Karte und die Ringe im Verlauf. „beste Woche“ fällt weg, „12 Wochen“ steht nicht mehr auf jeder Karte, sondern einmal oben: „Die Punkte zeigen die letzten 12 Wochen, der Ring deine Konstanz der letzten 30 Tage.“ Der Ring ist dafür etwas größer.
- **Lange Namen** im Verlauf bekommen zwei Zeilen statt „Genug Wasser getrun…“.
- **Rückgängig:** Setzt ein Tipp ein Mehrfach-Habit auf 0 (z. B. Wasser 4 von 4), erscheint 5 Sekunden lang „Wasser: zurück auf 0 · Rückgängig“ über der Tab-Leiste. Kein Popup. Bei Ziel 1 reicht ein weiterer Tipp, dort erscheint nichts.
- **Orientierung:** Der heutige Punkt im Mosaik hat einen feinen Ring.
- **Plus mittig:** Das Plus auf der Kachel „Neues Habit“ ist jetzt eine Zeichnung statt eines Textzeichens und sitzt genau in der Mitte (nachgemessen).
- **Logik-Tests:** neuer Ordner `tests/` (wird nicht veröffentlicht). `tests/logik.html` lädt die echte App mit nachgebauter Datenbank und prüft 28 Fälle: faire Serie, frühere Einstellungen, Bearbeiten, Aktualität (auch „über Mitternacht“ mit vorgestellter Uhr), Konstanz, Rückgängig. `tests/app.html` zeigt die App mit erfundenen Daten. Anleitung in `PROJEKTDOKU.md`, Abschnitt 6.
- **Roadmap:** Topf 3 aus dem Review ist eingeplant: mehrere Geräte gleichzeitig bei A4, Datei aufteilen vor A5, erster Start für neue Nutzer bei B2, Feinschliff-Runde in der Launch-Checkliste.
- **Teststand:** Die Logik-Tests sind vor den Fixes rot (8 Fehler) und danach alle grün (28 von 28). Mit Testdaten angesehen im Handy-Format (375 px) und am Mac (1280 px), hell und dunkel: Kacheln, Plus, Konstanz-Karte, Rückgängig, Verlauf mit Ringen, langen Namen und Heute-Markierung, aufgeklappte Karte. Keine Fehler in der Konsole. Auf der Vorschau mit echten Daten nachgerechnet: Wasser 65 % (vorher 17 %), Supplements 78 % (vorher 13 %). Paul hat auf der Vorschau getestet und am 07.11.2026 „Passt, mergen“ gesagt. Gemergt mit Pull Request #3.

### 2026-11-07 – Redesign „Puls“, Schritt 1 (Heute mit Kacheln, Verlauf mit Mosaik, Tab-Leiste, Farbe und Symbol, faire Serie)
- **Warum:** Paul hat sich für das Redesign-Konzept „Puls“ entschieden (farbige Kacheln, die sich füllen, Tagesring, Konstanz statt harter Serie). Es kommt vor A4, damit A4 und A5 gleich im neuen Design gebaut werden. Nach dem ersten lokalen Test wollte Paul den Verlauf, die Symbole und die faire Serie wie im Konzept gleich mit drin haben. Plan im Vault: `Habit Tracker/MIND – Puls Schritt 1 (Plan).md`.
- **Datenbank:** Neue Spalten in `habits`: `color` (Standard leer = automatisch, erlaubt sind 8 Farbnamen) und `icon` (Standard leer = Anfangsbuchstabe, erlaubt sind 16 Symbolnamen). Bestehende Habits bekommen einmalig der Reihe nach eine Farbe, Symbole bleiben leer. Sonst wird nichts geändert. Datei `docs/2026-11-07_puls-farbe-symbol.sql`. **Muss laufen, bevor der neue Code getestet wird** (die Vorschau nutzt dieselbe Datenbank). Der alte Code auf `main` stört sich nicht an den Spalten.
- **Neue Dateien:** `public/fonts/plus-jakarta-sans.woff2` (Schrift Plus Jakarta Sans, 27 KB, aus `@fontsource-variable/plus-jakarta-sans` Version 5.2.8) und `public/fonts/ofl.txt` (Lizenz, SIL Open Font License). Die Schrift kommt vom eigenen Server, nicht von Google (DSGVO).
- **Änderung in `public/index.html`:**
  - Puls-Farben hell und dunkel als CSS-Variablen, Schrift Plus Jakarta Sans. Hell oder dunkel folgt wie bisher dem Gerät. Das große „MIND“ oben fällt weg (bleibt auf der Login-Seite).
  - Neue Startseite **Heute**: Datum, „Hey [Name]“ (ohne Name „Heute“) und Tagesring. Darunter die heute geplanten Habits als farbige Kacheln mit Symbol. Antippen füllt die Kachel von unten, Mehrfach-Habits anteilig (z. B. 4 von 6). Volles Ziel = Haken, nochmal tippen = zurück auf 0. Lange Namen bekommen zwei Zeilen.
  - Der Tagesring zählt Mehrfach-Habits anteilig. Ist er voll, wächst er kurz und es steht „Alles geschafft für heute.“ da. Mit „Bewegung reduzieren“ am Gerät gibt es keine Animationen.
  - Filter Alle, Morgen, Mittag, Abend aus der Tageszeit. Uhrzeiten zählen vor 12 Uhr als Morgen, bis 17 Uhr als Mittag, danach als Abend. Die Knöpfe erscheinen nur, wenn heute Habits mit Tageszeit dabei sind.
  - Karte „Konstanz · 30 Tage“: erledigt im Vergleich zu geplant in den letzten 30 Tagen. Heute zählt erst mit, was schon geschafft ist, damit die Quote morgens nicht absackt. Rechts daneben die faire Serie, z. B. „Serie 12 Tage · 1 Puffertag frei“.
  - **Faire Serie:** Ein Tag zählt, wenn mindestens ein Habit geschafft ist. Ein Fehltag pro Woche (Mo bis So) ist ein Puffertag, die Serie pausiert dann nur. Erst ein zweiter Fehltag in derselben Woche beendet sie. Heute zählt erst, wenn geschafft. Die Serie pro Habit (im Verlauf) folgt derselben Regel. Die alte harte Serie, die bei einem Fehltag auf 0 fiel, gibt es nicht mehr.
  - Kachel „Neues Habit“ öffnet das Formular als Blatt von unten (am Mac in der Mitte), jetzt mit Farbe und Symbol. Vorgewählt sind die am wenigsten benutzte Farbe und „Aa“ (kein Symbol, Anfangsbuchstabe).
  - **Tab-Leiste** unten: Heute, Verlauf, Ich. Die Knöpfe „Einstellungen“ und „‹ Übersicht“ fallen dafür weg.
  - **Verlauf:** pro Habit eine Karte mit Symbol, einem Punkte-Mosaik der letzten 12 Wochen in der Habit-Farbe und rechts einem kleinen Konstanz-Ring (geschafft im Vergleich zu geplant, 12 Wochen, heute zählt erst, wenn geschafft) sowie „beste Woche“ (z. B. 6 / 7). Teilweise geschaffte Tage sind halb gefüllte Punkte, sie füllen sich von unten wie die Kacheln. Das Raster ist immer voll (12 Wochen × 7 Tage) und so breit wie die Karte: Tage vor dem Start, nicht geplante Tage und Tage in der Zukunft sind leere graue Punkte (nach Pauls Test auf der Vorschau). Bewusst eigenständig gestaltet (Punkte und Ring wie auf „Heute“), damit der Verlauf nicht nach anderen Apps mit Kästchen-Raster aussieht. Antippen klappt die Karte auf: „Insgesamt … × geschafft“, Woche mit Pfeilen zum Nachtragen, Serie, Tagesziel, Tageszeit, Kategorie und die Knöpfe ↑, ↓, Bearbeiten (jetzt mit Farbe und Symbol) und Löschen (zwei Klicks). Darunter „Dein Fortschritt“ (Woche, Monat, 3 Monate) und „Muster“. Am Mac stehen drei Karten nebeneinander. Das alte Wochenraster mit allen Habits fällt dafür weg.
  - **Kein Rot, kein X:** Ein vergangener Tag ohne Haken ist ein ruhiges leeres Feld, der Strich fällt weg.
  - **Ich:** die Einstellungen aus A3 im ruhigen Listenstil, dazu „Konto“ mit der angemeldeten E-Mail und „Abmelden“.
  - Petrol ist etwas heller als im Entwurf (`#3A9A99` statt `#2E8C8C`), damit die dunkle Schrift auf der Kachel gut lesbar bleibt (Kontrast über 4,5 : 1).
  - Export und Import nehmen `color` und `icon` mit. Ein altes Backup ohne die Felder bekommt automatische Farben und Anfangsbuchstaben.
- **Nicht geändert:** Abhaken-Logik, Fortschritt, Muster, Erinnerung, Login, Abmelden.
- **Teststand:** Lokal mit einer nachgebauten Datenbank im Browser geprüft, im Handy-Format (375 px) und am Mac (1280 px), hell und dunkel: Kacheln füllen (auch mehrfach und zurück auf 0), Tagesring und „Alles geschafft“, Filter, Neues Habit mit Farbe und Symbol, leeres Formular, Karte aufklappen und zuklappen, Konstanz-Ring nachgerechnet, Nachtragen, Woche vor und zurück, Bearbeiten mit Farbe und Symbol (auch zurück auf Buchstabe), Verschieben, Löschen in zwei Klicks, Name im Gruß, Export und Import (auch altes Backup), Fehlerfall ohne Netz, Abmelden und Anmelden. Faire Serie mit 6 festen Testfällen geprüft (alles geschafft, ein Fehltag, zwei Fehltage in einer Woche, Fehltage in verschiedenen Wochen, heute noch offen, Sonntag und Montag). SQL am 07.11. nach Backup über den Supabase-Konnektor ausgeführt und geprüft: Spalten und Regeln da, 9 Habits mit allen Haken unverändert, jedes Habit hat eine Farbe. Paul hat auf der Vorschau mit echter Datenbank getestet (zusammen mit Schritt 1.1) und „Passt, mergen“ gesagt. Gemergt mit Pull Request #3.

### 2026-11-06 – A3: Profil und Einstellungen
- **Warum:** Grundlage für spätere Nutzer und Premium (Feld `plan`), und die Erinnerung soll auf allen Geräten gleich sein (Roadmap A3).
- **Datenbank:** Neue Tabelle `profiles` (eine Zeile pro Konto: `name`, `timezone`, `plan` Standard `free`, `rem_on`, `rem_time`). Row Level Security: nur das eigene Profil lesen und ändern. Aus der App dürfen nur `name`, `timezone`, `rem_on` und `rem_time` geändert werden, `plan` nie. Ein Trigger legt für jedes neue Konto automatisch ein Profil an, bestehende Konten bekommen eins beim Einspielen. Datei `docs/2026-11-06_a3-profiles.sql`. Die Tabelle `habits` bleibt unverändert.
- **Änderung in `public/index.html`:**
  - Neuer Knopf „Einstellungen“ oben neben „Abmelden“. Er öffnet eine eigene Ansicht mit Name, Zeitzone, Tarif (nur Anzeige), Erinnerung sowie Export und Import. Der Klappbereich „Erinnerung, Export und Import“ unten in der Übersicht fällt dafür weg.
  - Gestaltung als Einstellungsliste in einer Karte im Stil der Übersicht: Bezeichnung links, Feld rechts, dünne Trennlinien, Gruppen Profil, Erinnerung und Daten. Schalter statt Haken, Zeitzone mit eigenem Pfeil, Tarif als Plakette. Die Uhrzeit ist ausgegraut, solange die Erinnerung aus ist.
  - Daten: „Daten kopieren“ legt das Backup direkt in die Zwischenablage. Das Textfeld zum Einfügen erscheint erst unter „Aus Backup wiederherstellen“.
  - Änderungen werden sofort gespeichert, oben in der Karte erscheint kurz „Gespeichert“ (nicht bei automatischen Speicherungen beim Laden).
  - Die Erinnerung (an/aus, Uhrzeit) steht jetzt im Profil und gilt auf allen Geräten. Die Erlaubnis für Benachrichtigungen gibt jedes Gerät selbst. Fehlt sie, erscheinen ein Hinweis und der Knopf „Benachrichtigungen auf diesem Gerät erlauben“.
  - Einmalige Übernahme: Wer die Erinnerung bisher im Browser an hatte, bekommt sie beim ersten Laden ins Profil übernommen. Im Browser bleibt danach nur noch, ob heute schon erinnert wurde.
  - Ist die Zeitzone leer, trägt die App die Zeitzone des Geräts ein. Die App rechnet weiter mit der Gerätezeit. Die Zeitzone wird erst für A4 gebraucht.
  - Export enthält jetzt nur noch `on` und `time` der Erinnerung. Ein Import mit Erinnerung schreibt sie ins Profil.
- **Fehlerfall:** Fehlt die Tabelle `profiles` oder lädt das Profil nicht, laufen die Habits normal weiter. Oben steht dann ein Hinweis, und die alte Erinnerung im Browser bleibt erhalten.
- **Teststand:** Mit einer nachgebauten Datenbank im Browser geprüft: Übernahme der alten Erinnerung, Name, Zeitzone, Erinnerung an/aus und Uhrzeit, Fehlerfall ohne Tabelle, Handy-Ansicht. Danach vom Nutzer auf der Vorschau-Seite mit echter Datenbank getestet, funktioniert. Am 06.11.2026 über Pull Request #2 auf `main` gemergt und live.

### 2026-11-06 – Regel: Git-Stand immer frisch von GitHub prüfen
- **Problem:** Eine neue Session meldete, der Branch `a2-zusatzfelder` existiere noch auf GitHub. Er war aber schon gelöscht. Sie hatte nur einen veralteten lokalen Verweis gesehen.
- **Änderung:** `CLAUDE.md` verlangt jetzt `git fetch --prune`, `git ls-remote --heads origin` und `gh pr list`, bevor etwas über Branches oder Pull Requests gesagt wird, und `git fetch --prune` nach jedem Merge.
- **Nichts an der App geändert.**

### 2026-11-06 – Obsidian-Vault mit dem Projekt verbunden
- **Warum:** Was mit Claude Code erarbeitet wird, soll immer auch im Obsidian-Vault „Gehirn“ landen.
- **Änderung:** `CLAUDE.md` sagt jetzt: zu Beginn Gedächtnis und Themenseite im Vault lesen, Ergebnisse als Notiz in `Gehirn/Habit Tracker/` speichern, Gedächtnis-Ergänzungen vorschlagen. Der Ordner liegt jetzt in `~/Documents/MIND Habit Tracker/Code (aktuell)`.
- **Nur lokal (nicht im Repo):** `.claude/settings.local.json` gibt Claude Code Zugriff auf den Vault.
- **Nichts an der App geändert.**

### 2026-11-06 – Vorschau-Seiten für Pull Requests
- **Problem:** Cloudflare konnte für Branches außer `main` keine Vorschau bauen. Fehler: „Your Wrangler configuration is missing a `previews` block“.
- **Änderung:** In `wrangler.jsonc` den leeren Block `"previews": {}` ergänzt. Jeder Pull Request bekommt jetzt eine eigene Test-Adresse, die Cloudflare in den Pull Request schreibt.
- **Hinweis:** Die Vorschau nutzt dieselbe echte Supabase-Datenbank. Was man dort ändert, ist auch in den echten Daten.
- **Nichts sonst geändert.** Die echte Seite auf `main` wird wie bisher gebaut.

### 2026-11-06 – A2: Optionale Zusatzfelder (Tagesziel, Tageszeit)
- **Warum:** Manche Habits macht man mehrmals am Tag (z. B. Wasser 6×), und eine Tageszeit hilft beim Planen (Roadmap A2).
- **Datenbank:** Neue Spalten `target` (Tagesziel, Standard 1, erlaubt 1–20) und `daytime` (Standard leer; `morgen`, `mittag`, `abend` oder Uhrzeit `HH:MM`). Datei `docs/2026-11-06_a2-zusatzfelder.sql`. Am 06.11.2026 über den Supabase-Konnektor ausgeführt, Backup davor in `~/Documents/MIND Habit Tracker/Datenbank-Backups/2026-11-06_vor-A2.json`. Bestehende Daten werden nicht umgeschrieben.
- **Änderung in `public/index.html`:**
  - Formular „Neues Habit“ und „Bearbeiten“: eingeklappter Bereich „Mehr Optionen“ mit „Wie oft am Tag?“ und „Tageszeit“ (bei „Uhrzeit“ erscheint ein Zeitfeld). Nach dem Hinzufügen springen die Felder auf Standard zurück.
  - Raster: Bei Mehrfach-Habits zählt jedes Tippen +1, im Kästchen steht die Anzahl. Ziel erreicht = Haken, nochmal Tippen = zurück auf 0. Habits mit Ziel 1 verhalten sich wie bisher (an/aus).
  - Unter dem Namen steht z. B. „6× täglich · Morgen“ (nur wenn gesetzt). Die Tageszeit ist nur ein Hinweis, die Reihenfolge bleibt.
  - Fortschritt, Serie, Wochentags-Muster und Erinnerung zählen einen Tag nur als erledigt, wenn das Tagesziel voll erreicht ist.
  - Export und Import nehmen `target` und `daytime` mit.
  - Technisch nötig: Der Bereich „Erinnerung, Export und Import“ hat die id `io` bekommen, weil es jetzt mehrere aufklappbare Bereiche gibt.
- **Neu:** `CLAUDE.md` mit den Arbeitsregeln für Claude Code.
- **Hinweis:** Wer das Tagesziel später ändert, ändert rückwirkend, was als erledigt zählt (z. B. alter Haken = 1 von 2).
- **Teststand:** Mit einer nachgebauten Datenbank im Browser geprüft (Anlegen, Zählen, Bearbeiten, altes Habit an/aus, Export/Import). Danach vom Nutzer auf der Vorschau-Seite mit echter Datenbank getestet, funktioniert. Am 06.11.2026 über Pull Request #1 auf `main` gemergt und live.

### 2026-10-16 – A1: Habits bearbeiten und verschieben
- **Warum:** Habits konnten nur gelöscht, nicht geändert oder umsortiert werden (Roadmap A1).
- **Datenbank:** Neue Spalte `pos` (Reihenfolge), Bestandsdaten nach Anlegedatum nummeriert. Datei `docs/2026-10-16_add-pos.sql`. **Vor dem Commit in Supabase ausführen.**
- **Änderung in `public/index.html`:**
  - Pro Habit neue Knöpfe ↑ ↓ (verschieben, bei aktivem Kategorie-Filter innerhalb der sichtbaren Habits) und „Bearbeiten" (Name, Tage, Kategorie, Enter speichert, Esc bricht ab).
  - Laden sortiert nach `pos`, neue Habits kommen ans Ende, Import setzt `pos` in Reihenfolge.
- **Hinweis:** Wer die Tage eines Habits ändert, ändert damit rückwirkend, was als „geplant" zählt. Fortschritt und Serie vergangener Wochen verändern sich entsprechend.
- **Teststand:** Vom Nutzer im Browser getestet, funktioniert (Verschieben, Bearbeiten, Speichern).

### 2026-10-15 – Abmelden repariert
- **Problem:** Der Button „Abmelden" reagierte in Safari nicht, obwohl Speichern und Login funktionierten.
- **Änderung:** Eine Zeile in `public/index.html` (`$("out").onclick`). Abmelden meldet jetzt lokal ab, löscht die gespeicherten Login-Daten des Browsers (`sb-…` in localStorage) und zeigt sofort die Login-Seite. Es wartet nicht mehr auf die Antwort von Supabase.
- **Ursache:** Nicht sicher geklärt. Vermutet: `signOut()` hing in Safari (z. B. bei mehreren offenen Tabs).
- **Nichts sonst geändert.**

### 2026-10-15 – Datenbanktabelle angelegt (Supabase)
- Tabelle `public.habits` mit Row Level Security erstellt (`schema.sql`).
- Jeder Nutzer sieht und ändert nur seine eigenen Zeilen.
- Vorher meldete die Seite „Could not find the table 'public.habits'".

### 2026-10-15 – Seite wieder sichtbar (Dateiname korrigiert)
- Die Datei hieß versehentlich `index.html wrangler.jsonc` im Ordner `puplpublic`.
- Korrigiert zu `public/index.html`. Danach lieferte Cloudflare die Seite aus (vorher weiße Seite).
- Lehre: Dateinamen bei Linux-Hosting kleinschreiben, keine Leerzeichen.

### 2026-10-15 – Cloudflare-Konfiguration hinzugefügt
- Neue Datei `wrangler.jsonc` im Hauptordner:
  `name: mind`, `assets.directory: ./public`.
- Behebt den Build-Fehler „Could not detect a directory containing static files".

### 2026-10-15 – Umstellung auf Supabase (Login und Datenbank)
- Speichern im Browser (localStorage) ersetzt durch Supabase-Datenbank.
- Login-Seite (E-Mail und Passwort), Abmelden-Button.
- Habits werden mit `insert`, `update` (Haken) und `delete` in der Tabelle `habits` gespeichert.
- Erinnerungs-Einstellung bleibt bewusst lokal im Browser.
- Export und Import kopieren JSON und ersetzen beim Import alle Habits in der Datenbank.

### Davor – Design und Funktionen (als Prototyp)
- Dunkles, minimales Design mit Akzentfarbe Weiß, Name MIND.
- Wochenraster mit 5 Zuständen (erledigt, verpasst, heute fällig, bevorstehend, nicht geplant).
- Fortschritt (Woche, Monat, 3 Monate), Muster nach Wochentag, Kategorien-Filter, Serien (Streaks).
- Habits planen nach Wochentagen, Erinnerung, Export und Import.

## Hinweise für später
- Der `anon public` Key im Code darf öffentlich sein. Geschützt sind die Daten durch Login und Row Level Security.
- **Nie** den `service_role` Key in den Code oder ins Repository schreiben.
- Neue Version einspielen: `public/index.html` in GitHub bearbeiten, Commit auf `main`, Cloudflare baut in ca. 1 Minute.
- Backup: In der App „Daten kopieren", oder in Supabase unter Table Editor → `habits` als CSV exportieren.
- Registrierung neuer Nutzer in Supabase ausgeschaltet lassen (Authentication → Sign In / Providers).
