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
