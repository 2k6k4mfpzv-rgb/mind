# MIND – Projektdokumentation

Stand: 07.11.2026. Dieses Dokument erklärt, was MIND ist, wie es aufgebaut ist und warum. Es ist so geschrieben, dass man (oder eine KI wie Claude) ohne Vorwissen weiterarbeiten kann.

## 1. Was ist MIND?
Ein privater Habit Tracker für eine Person (Paul). Er läuft als Website in jedem Browser, mit Login und Datenbank, sodass alle Geräte dieselben Daten sehen. Das Design heißt „Puls“ (seit 07.11.2026): farbige Kacheln, die sich füllen, Schrift Plus Jakarta Sans, hell und dunkel nach Geräte-Einstellung, kein Rot und kein X für verpasste Tage. Die Texte sind deutsch.

**Funktionen:** Tab-Leiste mit Heute, Verlauf und Ich. **Heute:** die heute geplanten Habits als Kacheln mit Symbol (Antippen füllt sie, Mehrfach-Habits anteilig), Tagesring, Filter nach Tageszeit, Konstanz der letzten 30 Tage, faire Serie mit Puffertag, neues Habit anlegen. **Verlauf:** pro Habit eine Karte mit Punkte-Mosaik der letzten 12 Wochen (teilweise geschafft = halb gefüllter Punkt), Konstanz-Ring und „beste Woche“. Aufgeklappt: „Insgesamt … × geschafft“, Woche zum Nachtragen mit 5 Zuständen (erledigt, ohne Haken, heute dran, kommt noch, nicht geplant), Serie, Habit bearbeiten, verschieben und löschen. Dazu Fortschritt (Woche, Monat, 3 Monate), Erledigungsquote pro Wochentag (12 Wochen), Kategorien als Filter. **Ich:** Name, Zeitzone, Tarif, Erinnerung per Browser-Benachrichtigung, Export und Import als JSON-Text, Abmelden. Pro Habit: Wochentage, Farbe, Symbol, optional Tagesziel (Mehrfach-Habits, z. B. 6× am Tag), Tageszeit und Kategorie.

**Faire Serie (seit 07.11.2026):** Ein Tag zählt, wenn mindestens ein Habit geschafft ist (bei der Serie pro Habit: wenn dieses Habit geschafft ist). Ein Fehltag pro Woche (Mo bis So) ist ein Puffertag, die Serie pausiert dann nur. Erst ein zweiter Fehltag in derselben Woche beendet sie. Heute zählt erst, wenn geschafft.

## 2. Architektur (drei Dienste)
```
Browser  ->  Cloudflare (liefert die Datei)  
Browser  ->  Supabase   (Login und Datenbank, direkt aus dem Browser)
GitHub   ->  Cloudflare (bei jedem Commit auf main automatisch neu veröffentlicht)
```
| Dienst | Aufgabe | Warum |
|---|---|---|
| **GitHub** (Repo `mind`) | Speichert den Code. Quelle der Wahrheit. | Jede Änderung ist nachvollziehbar, Cloudflare baut daraus. |
| **Cloudflare** (Workers, statische Dateien) | Veröffentlicht `public/` unter `mind.2k6k4mfpzv.workers.dev`. | Kostenlos, feste Adresse, kein eigener Server nötig. |
| **Supabase** | Postgres-Datenbank und Login (E-Mail und Passwort). | Echte Datenbank und fertiges Login, kostenlos, Zugriffsschutz per Regel. |

Es gibt **keinen eigenen Server und keinen Build-Schritt**. Die ganze App ist eine HTML-Datei, die direkt im Browser läuft und über die Supabase-Bibliothek mit der Datenbank spricht.

## 3. Dateien im Repository
```
public/index.html   Die komplette App (HTML, CSS, JavaScript in einer Datei)
public/fonts/       Schrift Plus Jakarta Sans (plus-jakarta-sans.woff2) und ihre Lizenz (ofl.txt). Selbst gehostet, nicht von Google (DSGVO).
wrangler.jsonc      Sagt Cloudflare, dass ./public veröffentlicht wird
docs/schema.sql     Datenbank-Struktur (einmal in Supabase ausgeführt)
docs/JJJJ-MM-TT_*.sql  Spätere Datenbank-Änderungen, nach Datum nacheinander ausgeführt (aktuell: 2026-10-16_add-pos.sql, 2026-11-06_a2-zusatzfelder.sql, 2026-11-06_a3-profiles.sql, 2026-11-07_puls-farbe-symbol.sql)
CLAUDE.md           Arbeitsregeln für Claude Code (wird in jeder Session automatisch gelesen)
CHANGELOG.md        Protokoll aller Änderungen
PROJEKTDOKU.md      Dieses Dokument
README.md           (Platzhalter von GitHub)
```
`wrangler.jsonc`:
```json
{ "name": "mind", "compatibility_date": "2026-10-15", "assets": { "directory": "./public" }, "previews": {} }
```
Der Name `mind` muss dem Projektnamen in Cloudflare entsprechen. Der leere Block `previews` ist nötig, damit Cloudflare für jeden Pull Request eine Vorschau-Seite baut (seit 06.11.2026). Die Vorschau nutzt dieselbe echte Datenbank. Dateinamen immer kleingeschrieben, ohne Leerzeichen.

## 4. Datenbank
Eine Tabelle `public.habits`:
| Spalte | Typ | Bedeutung |
|---|---|---|
| id | uuid | Primärschlüssel |
| user_id | uuid | Besitzer, wird automatisch auf `auth.uid()` gesetzt |
| name | text | Name des Habits |
| days | int[] | Geplante Wochentage, 0 = Montag bis 6 = Sonntag |
| cat | text | Kategorie, leer erlaubt |
| created | date | Ab diesem Tag zählt das Habit (davor nicht geplant) |
| done | jsonb | Erledigte Tage mit Anzahl, z. B. `{"2026-10-15":1}`; bei Mehrfach-Habits `{"2026-11-06":3}` |
| pos | integer | Reihenfolge in der Liste (1, 2, 3 ...), Spalte seit 16.10.2026 |
| target | integer | Tagesziel, wie oft am Tag (1–20, Standard 1 = einmal), seit 06.11.2026 |
| daytime | text | Tageszeit: leer (Standard), `morgen`, `mittag`, `abend` oder Uhrzeit `HH:MM`, für den Filter auf „Heute“, seit 06.11.2026 |
| color | text | Farbe der Kachel: leer (Standard = automatisch aus der ID) oder `himmel`, `salbei`, `lavendel`, `apricot`, `sonne`, `rose`, `petrol`, `koralle`. Seit 07.11.2026 |
| icon | text | Symbol: leer (Standard = Anfangsbuchstabe des Namens) oder `tropfen`, `blatt`, `buch`, `hantel`, `puls`, `sonne`, `mond`, `stift`, `herz`, `apfel`, `pille`, `note`, `sprache`, `hut`, `haus`, `handy`. Seit 07.11.2026 |
| created_at | timestamptz | Sortierung innerhalb gleicher Position |

Eine Tabelle `public.profiles` (seit 06.11.2026, eine Zeile pro Konto):
| Spalte | Typ | Bedeutung |
|---|---|---|
| id | uuid | Gleich der Konto-ID (`auth.users`) |
| name | text | Name, leer erlaubt (max. 40 Zeichen) |
| timezone | text | Zeitzone, z. B. `Europe/Berlin`. Leer = die App trägt die Gerätezeitzone ein. Wird noch nicht zum Rechnen genutzt. |
| plan | text | `free` (Standard) oder `premium`. Aus der App nicht änderbar. |
| rem_on | boolean | Erinnerung an/aus (Standard aus) |
| rem_time | text | Uhrzeit der Erinnerung `HH:MM` (Standard `20:00`) |
| created_at | timestamptz | Anlegezeit |

Das Profil legt ein Trigger (`on_auth_user_created`) beim Anlegen eines Kontos automatisch an. Die App darf das Profil nur lesen und `name`, `timezone`, `rem_on`, `rem_time` ändern (Rechte pro Spalte), damit sich niemand selbst auf Premium setzen kann.

**Sicherheit:** Row Level Security ist aktiv. Die Regel `own habits` erlaubt Eingeloggten nur Zeilen mit eigener `user_id`, bei `profiles` nur die Zeile mit eigener `id`. Deshalb darf der `anon`-Key im Code stehen. Die Registrierung neuer Nutzer ist in Supabase ausgeschaltet, nur Pauls Account existiert.

**Warum `done` als jsonb:** Eine Zeile pro Habit statt einer Zeile pro Tag hält den Code einfach. Nachteil: Bei sehr vielen Jahren Daten wird die Zelle größer. Für eine Person ist das unproblematisch.

## 5. Aufbau von `public/index.html`
- **Konfiguration oben im Script:** `SUPA_URL` und `SUPA_KEY` (öffentlicher anon-Key).
- **Supabase-Bibliothek:** per `<script>` von jsdelivr, fest auf Version `2.45.4` gepinnt, damit sich nichts unbemerkt ändert.
- **Datenmodell im Browser:** Array `habits`. `norm()` setzt Standardwerte. `sched(h, tag)` sagt, ob ein Habit an einem Tag geplant ist. `cnt(h, tag)` gibt die Anzahl an einem Tag, `ok(h, tag)` sagt, ob das Tagesziel erreicht ist (nur das zählt als erledigt). `fair()` zählt eine faire Serie (mit Puffertag), `streak(h)` nutzt sie pro Habit. `range()` zählt erledigt gegen geplant.
- **Farben und Symbole (Puls):** CSS-Variablen oben im `<style>` (hell und dunkel). Die 8 Habit-Farben stehen in `COLS`, die 16 Symbole (Linien-Icons als SVG) in `ICONS`. `colKey(h)` gibt die Farbe eines Habits, bei leerem `color` eine feste aus der ID, `hexOf(h)` den Farbwert. `icoOf(h)` gibt das Symbol oder den Anfangsbuchstaben.
- **Ansichten:** Drei Bereiche `#v-heute`, `#v-verlauf`, `#v-ich`, umgeschaltet mit `tab()` über die Tab-Leiste `#tabs`. Später kommt der MIND-Knopf (A5) als eigener Knopf in die Mitte der Leiste.
- **`render()`** baut die Oberfläche neu (Verlauf-Karten, Fortschritt, Wochentags-Muster, Tagesauswahl, Kacheln, Tagesring). `renderHeute()` baut die Kacheln, `ring()` den Tagesring, die Konstanz-Karte und die Serie. Im Verlauf baut `card()` eine Karte mit `mosaic()` und `stats()` (insgesamt, beste Woche, Konstanz), aufgeklappt (`openId`) kommt `weekHtml()` dazu, beim Bearbeiten `editHtml()`. Nach dem Antippen einer Kachel wird nur diese Kachel geändert (`render(true)`), damit sie sich animiert füllt.
- **Kacheln:** Die Füllung wächst über die CSS-Variable `--p` (0 bis 1). Der Inhalt liegt zweimal übereinander, normal und dunkel auf der Füllung, beide passend abgeschnitten. So bleibt die Schrift auf jeder Farbe lesbar.
- **Neues Habit:** Formular in einem `<dialog>` (`#sheet`), am Handy als Blatt von unten.
- **Speichern:** Jede Aktion schreibt direkt in die Datenbank (`insert`, `update` der Spalte `done`, `delete`). `chk()` zeigt Fehler oben an. Kacheln und Verlauf werden zuerst lokal aktualisiert, dann gespeichert.
- **Login:** `onAuthStateChange` blendet Login-Seite oder App ein und lädt die Daten (`load()`).
- **Einstellungen:** im Bereich „Ich“. `loadProf()` lädt das Profil, `updProf()` speichert eine Änderung sofort.
- **Lokal im Browser (localStorage):** Nur `habits-rem` mit `last` (an welchem Tag dieses Gerät schon erinnert hat). Erinnerung an/aus und Uhrzeit stehen seit A3 im Profil. Eine ältere Einstellung im Browser wird beim ersten Laden einmalig ins Profil übernommen.
- **Popups:** `confirm`/`alert` werden nicht benutzt (sie wurden in der Vorschau blockiert). Löschen läuft in zwei Klicks („Löschen", dann „Wirklich löschen?").

## 6. Änderungen einspielen
1. `public/index.html` in GitHub öffnen, Stift-Symbol, ändern, **Commit changes** auf `main` (mit kurzer Nachricht).
2. Cloudflare baut automatisch, nach etwa einer Minute ist es live. Bei Problemen: Cloudflare → Deployments → Log ansehen.
3. Seite mit Cmd+Shift+R neu laden.
4. Eintrag in `CHANGELOG.md` ergänzen (neueste oben).

## 7. Entscheidungen und warum
- **Eine Datei statt Framework:** Wenig bewegliche Teile, leicht zu verstehen, kein Build, bei Problemen schnell reparierbar.
- **Supabase statt eigener Server:** Login und Datenbank sind fertig, kostenlos, Sicherheit per Datenbank-Regel statt eigenem Code.
- **E-Mail und Passwort:** Einfachster Login für eine Person.
- **Wochentage statt „3× pro Woche":** Gewählte Tage sind übersichtlicher, die anderen Tage bleiben leer („nicht geplant"). Eine frühere Version hatte Wochenziele, sie wurden ersetzt.
- **Zwei Klicks zum Löschen:** Wegen blockierter Popups, und es schützt vor Versehen.
- **Design „Puls“ (07.11.2026):** Motivierend ohne Druck. Belohnung ja, Verlust nie: kein Rot, kein X, Konstanz-Quote statt harter Serie. Details im Vault: `Habit Tracker/MIND – Redesign (3 Design-Konzepte).md`.
- **Schrift selbst gehostet:** Google Fonts direkt einzubinden hat das LG München 2022 als DSGVO-Verstoß gewertet. Deshalb liegt die Schrift in `public/fonts/`.

## 8. Bekannte Stolpersteine
- Cloudflare braucht `wrangler.jsonc` und den Ordner `public`, sonst Fehler „Could not detect a directory containing static files".
- Ohne `"previews": {}` in `wrangler.jsonc` scheitern Vorschau-Builds mit „missing a `previews` block“.
- Falsch geschriebene oder falsch benannte `index.html` (Großbuchstaben, Leerzeichen) führt zu einer weißen Seite.
- Ohne `docs/schema.sql` in Supabase gibt es die Meldung „Could not find the table 'public.habits'".
- **Offen:** Der Abmelden-Button reagierte in Safari nicht. Er wurde so umgebaut, dass er lokal abmeldet und den Login-Eintrag im Browser löscht. Ob das das Problem endgültig löst, ist nicht bestätigt.
- Erinnerungen funktionieren nur, solange die Seite im Browser geöffnet ist.

## 9. Wartung nach längerer Zeit (Checkliste)
Dinge ändern sich über Jahre. Prüfe:
- Läuft die Seite noch? Falls nicht: **Supabase-Projekt prüfen.** Kostenlose Projekte können pausiert werden, wenn lange niemand zugreift. Dann im Supabase-Dashboard wieder starten (Bedingungen vorher bei Supabase nachlesen).
- Cloudflare: Läuft das Deployment grün? Eventuell hat sich die Einrichtung von Workers geändert (Konfigurationsdatei `wrangler.jsonc`).
- Die Supabase-Bibliothek ist auf `2.45.4` festgelegt. Sie funktioniert weiter, ist aber alt. Bei einem Update die Anmelde- und Datenbankaufrufe testen.
- Backup: In der App „Daten kopieren" oder in Supabase unter Table Editor → `habits` als CSV exportieren.
- Zugänge: Konten bei GitHub, Cloudflare und Supabase sind alle an eine E-Mail-Adresse gebunden. Diese Adresse erreichbar halten.

## 10. Zugänge (keine Passwörter hier eintragen)
| Dienst | Konto | Wo ansehen |
|---|---|---|
| GitHub | Repo `mind` unter dem eigenen Konto | github.com |
| Cloudflare | Projekt `mind` unter Workers und Pages | dash.cloudflare.com |
| Supabase | Projekt „MIND" | supabase.com/dashboard |

Der `service_role`-Key darf **nie** in den Code oder ins Repository.

## 11. Mit Claude weiterarbeiten (Vorlage)
Schicke Claude in einem neuen Chat dieses Dokument, den aktuellen Inhalt von `public/index.html` und `CHANGELOG.md`. Dazu zum Beispiel diese Nachricht:

> Das ist mein Projekt MIND (Doku und Code im Anhang). Ich möchte: [Wunsch]. Ändere nur das, was dafür nötig ist, und lass alles andere unverändert. Gib mir die geänderte Datei, eine Commit-Nachricht und einen Eintrag für die CHANGELOG.md.

Wichtig: Immer die aktuelle Datei aus GitHub schicken, nicht eine alte Kopie. Claude erinnert sich nicht zuverlässig an frühere Chats.

## 12. Doku aktuell halten (bei jeder Änderung)
Bei **jeder** Änderung am Projekt:
1. **Commit-Nachricht** mit Art und Inhalt, z. B. `Feat: Habits bearbeiten`, `Fix: Abmelden in Safari`, `Docs: Doku aktualisiert`. Optional eine Erklärung im Feld „Extended description".
2. **`CHANGELOG.md`:** Neuen Eintrag ganz oben einfügen (siehe Vorlage).
3. **`PROJEKTDOKU.md`:** Nur ändern, wenn sich etwas Grundsätzliches ändert (neue Funktion, andere Datenbank-Spalte, anderer Dienst, neue Stolperfalle). Dann auch das „Stand"-Datum oben anpassen.
4. **Datenbank geändert?** Die SQL-Änderung als Datei in `docs/` ablegen (z. B. `docs/2026-11-02_spalte-prio.sql`) und in Abschnitt 4 nachtragen.

Vorlage für einen Changelog-Eintrag:
```
### JJJJ-MM-TT – Kurztitel
- **Warum:** Was war das Problem oder der Wunsch?
- **Änderung:** Was wurde geändert, in welcher Datei?
- **Ursache / Hinweis:** Falls bekannt, auch was unsicher ist.
- **Nichts sonst geändert.** (oder was sonst betroffen ist)
```
