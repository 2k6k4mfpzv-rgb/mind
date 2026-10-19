# MIND – Projektdokumentation

Stand: 16.10.2026. Dieses Dokument erklärt, was MIND ist, wie es aufgebaut ist und warum. Es ist so geschrieben, dass man (oder eine KI wie Claude) ohne Vorwissen weiterarbeiten kann.

## 1. Was ist MIND?
Ein privater Habit Tracker für eine Person (Paul). Er läuft als Website in jedem Browser, mit Login und Datenbank, sodass alle Geräte dieselben Daten sehen. Das Design ist dunkel, minimal und weiß-akzentuiert. Die Texte sind deutsch.

**Funktionen:** Habits anlegen, bearbeiten, verschieben und löschen, pro Habit Wochentage festlegen, Wochenraster mit 5 Zuständen (erledigt, verpasst, heute fällig, bevorstehend, nicht geplant), Fortschritt (Woche, Monat, 3 Monate), Erledigungsquote pro Wochentag (12 Wochen), Serien (Tage in Folge), Kategorien als Filter, Erinnerung per Browser-Benachrichtigung, Export und Import als JSON-Text.

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
wrangler.jsonc      Sagt Cloudflare, dass ./public veröffentlicht wird
docs/schema.sql     Datenbank-Struktur (einmal in Supabase ausgeführt)
docs/JJJJ-MM-TT_*.sql  Spätere Datenbank-Änderungen, nach Datum nacheinander ausgeführt (aktuell: 2026-10-16_add-pos.sql)
CHANGELOG.md        Protokoll aller Änderungen
PROJEKTDOKU.md      Dieses Dokument
README.md           (Platzhalter von GitHub)
```
`wrangler.jsonc`:
```json
{ "name": "mind", "compatibility_date": "2026-10-15", "assets": { "directory": "./public" } }
```
Der Name `mind` muss dem Projektnamen in Cloudflare entsprechen. Dateinamen immer kleingeschrieben, ohne Leerzeichen.

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
| done | jsonb | Erledigte Tage, z. B. `{"2026-10-15":1}` |
| pos | integer | Reihenfolge in der Liste (1, 2, 3 ...), Spalte seit 16.10.2026 |
| created_at | timestamptz | Sortierung innerhalb gleicher Position |

**Sicherheit:** Row Level Security ist aktiv. Die Regel `own habits` erlaubt Eingeloggten nur Zeilen mit eigener `user_id`. Deshalb darf der `anon`-Key im Code stehen. Die Registrierung neuer Nutzer ist in Supabase ausgeschaltet, nur Pauls Account existiert.

**Warum `done` als jsonb:** Eine Zeile pro Habit statt einer Zeile pro Tag hält den Code einfach. Nachteil: Bei sehr vielen Jahren Daten wird die Zelle größer. Für eine Person ist das unproblematisch.

## 5. Aufbau von `public/index.html`
- **Konfiguration oben im Script:** `SUPA_URL` und `SUPA_KEY` (öffentlicher anon-Key).
- **Supabase-Bibliothek:** per `<script>` von jsdelivr, fest auf Version `2.45.4` gepinnt, damit sich nichts unbemerkt ändert.
- **Datenmodell im Browser:** Array `habits`. `norm()` setzt Standardwerte. `sched(h, tag)` sagt, ob ein Habit an einem Tag geplant ist. `streak()` zählt die Serie, `range()` zählt erledigt gegen geplant.
- **`render()`** baut die Oberfläche komplett neu (Raster, Fortschritt, Wochentags-Muster, Tagesauswahl).
- **Speichern:** Jede Aktion schreibt direkt in die Datenbank (`insert`, `update` der Spalte `done`, `delete`). `chk()` zeigt Fehler oben an. Das Raster wird zuerst lokal aktualisiert, dann gespeichert.
- **Login:** `onAuthStateChange` blendet Login-Seite oder App ein und lädt die Daten (`load()`).
- **Lokal im Browser (localStorage):** Nur die Erinnerungs-Einstellung (`habits-rem`), weil sie gerätespezifisch ist.
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

## 8. Bekannte Stolpersteine
- Cloudflare braucht `wrangler.jsonc` und den Ordner `public`, sonst Fehler „Could not detect a directory containing static files".
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
