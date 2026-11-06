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
- **Teststand:** Mit einer nachgebauten Datenbank im Browser geprüft: Übernahme der alten Erinnerung, Name, Zeitzone, Erinnerung an/aus und Uhrzeit, Fehlerfall ohne Tabelle, Handy-Ansicht. Ein Test mit der echten Datenbank auf der Vorschau-Seite steht noch aus.

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
