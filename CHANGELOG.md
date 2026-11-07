# MIND – Änderungsprotokoll

Private Habit-Tracker-Website. Frontend: eine Datei (`public/index.html`). Daten und Login: Supabase. Hosting: Cloudflare (Workers mit statischen Dateien), automatisches Deployment bei jedem Commit auf `main`.

## Aufbau
| Teil | Ort |
|---|---|
| Webseite | `public/index.html` |
| Cloudflare-Konfiguration | `wrangler.jsonc` (Ordner `./public` wird veröffentlicht) |
| Datenbank-Schema | `docs/schema.sql` (in Supabase SQL Editor ausgeführt) |
| Login | Supabase Auth, E-Mail und Passwort, Registrierung gesperrt |

## Änderungen (neueste zuerst)

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
  - **Verlauf** wie im Konzept: pro Habit eine Karte mit Symbol, Mosaik der letzten 12 Wochen in der Habit-Farbe (heller = teilweise), „× insgesamt“ (Tage mit erreichtem Ziel) und „beste Woche“ (z. B. 6 / 7). Antippen klappt die Karte auf: Woche mit Pfeilen zum Nachtragen, Serie, Tagesziel, Tageszeit, Kategorie und die Knöpfe ↑, ↓, Bearbeiten (jetzt mit Farbe und Symbol) und Löschen (zwei Klicks). Darunter „Dein Fortschritt“ (Woche, Monat, 3 Monate) und „Muster“. Am Mac stehen drei Karten nebeneinander. Das alte Wochenraster mit allen Habits fällt dafür weg.
  - **Kein Rot, kein X:** Ein vergangener Tag ohne Haken ist ein ruhiges leeres Feld, der Strich fällt weg.
  - **Ich:** die Einstellungen aus A3 im ruhigen Listenstil, dazu „Konto“ mit der angemeldeten E-Mail und „Abmelden“.
  - Petrol ist etwas heller als im Entwurf (`#3A9A99` statt `#2E8C8C`), damit die dunkle Schrift auf der Kachel gut lesbar bleibt (Kontrast über 4,5 : 1).
  - Export und Import nehmen `color` und `icon` mit. Ein altes Backup ohne die Felder bekommt automatische Farben und Anfangsbuchstaben.
- **Nicht geändert:** Abhaken-Logik, Fortschritt, Muster, Erinnerung, Login, Abmelden.
- **Teststand:** Lokal mit einer nachgebauten Datenbank im Browser geprüft, im Handy-Format (375 px) und am Mac (1280 px), hell und dunkel: Kacheln füllen (auch mehrfach und zurück auf 0), Tagesring und „Alles geschafft“, Filter, Neues Habit mit Farbe und Symbol, leeres Formular, Karte aufklappen und zuklappen, Nachtragen, Woche vor und zurück, Bearbeiten mit Farbe und Symbol (auch zurück auf Buchstabe), Verschieben, Löschen in zwei Klicks, Name im Gruß, Export und Import (auch altes Backup), Fehlerfall ohne Netz, Abmelden und Anmelden. Faire Serie mit 6 festen Testfällen geprüft (alles geschafft, ein Fehltag, zwei Fehltage in einer Woche, Fehltage in verschiedenen Wochen, heute noch offen, Sonntag und Montag). Noch nicht auf der Vorschau mit echter Datenbank getestet.

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
