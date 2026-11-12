# MIND – Projektdokumentation

Stand: 12.11.2026. Dieses Dokument erklärt, was MIND ist, wie es aufgebaut ist und warum. Es ist so geschrieben, dass man (oder eine KI wie Claude) ohne Vorwissen weiterarbeiten kann.

## 1. Was ist MIND?
Ein privater Habit Tracker für eine Person (Paul). Er läuft als Website in jedem Browser, mit Login und Datenbank, sodass alle Geräte dieselben Daten sehen. Das Design heißt „Puls“ (seit 07.11.2026): farbige Kacheln, die sich füllen, Schrift Plus Jakarta Sans, hell und dunkel nach Geräte-Einstellung, kein Rot und kein X für verpasste Tage. Die Texte sind deutsch.

**Funktionen:** Tab-Leiste mit Heute, Verlauf, MIND (KI-Chat, siehe unten), Sammlung und Ich. **Heute:** die heute geplanten Habits als Kacheln mit Symbol (Antippen füllt sie, Mehrfach-Habits anteilig), Tagesring, Filter nach Tageszeit, Konstanz der letzten 30 Tage, faire Serie mit Puffertag, neues Habit anlegen. **Verlauf:** pro Habit eine Karte mit Punkte-Mosaik der letzten 12 Wochen (teilweise geschafft = halb gefüllter Punkt), Konstanz-Ring (letzte 30 Tage, gleiche Rechnung wie auf „Heute“), der heutige Punkt hat einen feinen Ring. Aufgeklappt: „Insgesamt … × geschafft“, Woche zum Nachtragen mit 5 Zuständen (erledigt, ohne Haken, heute dran, kommt noch, nicht geplant), Serie, Habit bearbeiten, verschieben und löschen. Dazu Fortschritt (Woche, Monat, 3 Monate), Erledigungsquote pro Wochentag (12 Wochen), Kategorien als Filter. **Ich:** Name, Zeitzone, Tarif, Erinnerung per Browser-Benachrichtigung, Export und Import als JSON-Text, Abmelden. Pro Habit: Wochentage, Farbe, Symbol, optional Tagesziel (Mehrfach-Habits, z. B. 6× am Tag), Tageszeit und Kategorie. Ändert man Tage oder Tagesziel, gilt das Neue erst ab heute, alte Haken zählen weiter nach den alten Einstellungen. Setzt ein Tipp ein Mehrfach-Habit auf 0, gibt es 5 Sekunden „Rückgängig“. Bleibt MIND lange offen, lädt es beim Zurückkommen die Daten neu, nach Mitternacht die ganze Seite. Haken von einem anderen Gerät erscheinen sofort (seit 10.11.2026).

**Seit Puls Schritt 2 und 3 (10.11.2026):** Kachel lange drücken (Handy), Rechtsklick (Mac) oder Kontextmenü-Taste öffnet ein Blatt mit Farbtupfern, Bearbeiten und Pausieren. **Pausieren** gilt ab heute, bis man fortsetzt oder bis zu einem Datum. Pausierte Tage sind nicht geplant, Konstanz und Serie leiden nicht. Auf „Heute“ steht unten „2 pausiert“ zum Fortsetzen. **Einheit** pro Habit (optional): „noch 3 Gläser“, bei einmal am Tag z. B. „5 Minuten“. **Sammlung:** 6 Themes (Farbwelten, hell und dunkel), frei nach 7, 30, 60, 100, 150 und 250 Tagen insgesamt. Ein Tag zählt, wenn mindestens ein Habit geschafft ist, nicht am Stück. Was einmal frei ist, bleibt frei.

**Installierbare App (gebaut am 11.11.2026):** MIND lässt sich wie eine App auf den Home-Bildschirm legen (iPhone: in Safari „Teilen“, dann „Zum Home-Bildschirm“) und startet dann im eigenen Fenster mit eigenem Symbol. **Ohne Netz** öffnet sich die App trotzdem und zeigt den Stand von zuletzt. Haken kann man weiter setzen, sie werden nachgeschickt, sobald das Netz wieder da ist (oben steht ruhig „Offline. 2 Haken werden nachgeschickt …“). Alles andere (Habit ändern, Einstellungen) braucht Netz. **Erinnerung als Push:** höchstens eine Nachricht am Tag zur eingestellten Uhrzeit, und nur wenn dann noch Habits offen sind. Sie kommt auch, wenn MIND zu ist. In „Ich“ steht, ob dieses Gerät sie bekommt. Gibt es eine **neue Version**, steht oben „Neue Version von MIND. Tippen zum Aktualisieren.“

**KI-Assistent (gebaut am 12.11.2026):** Der MIND-Knopf in der Mitte der Tab-Leiste öffnet einen Chat als Blatt von unten. Dazu vier Einstiege, die den Chat gleich mit einem Thema öffnen: „Woche besprechen“ (Karte oben im Verlauf), „Muster erklären“ (aufgeklappte Verlauf-Karte), „Mini-Version vorschlagen“ (Blatt der Kachel) und „Hilf mir formulieren“ (Blatt „Neues Habit“). Die KI macht Vorschläge als Karte mit „Übernehmen“ und „Anpassen“, nichts ändert sich von selbst. Sie schreibt nie zuerst (kein Push, kein Punkt). Sie bekommt nur eine Zusammenfassung der Habits, das Gespräch wird nirgends gespeichert. KI-Stellen tragen einen Funken in Koralle und die Plakette „PRO“. Gesperrt ist nichts: Solange es kein bezahltes Pro gibt, können alle sie nutzen, begrenzt auf 20 Nachrichten am Tag.

**Faire Serie (seit 07.11.2026):** Ein Tag zählt, wenn mindestens ein Habit geschafft ist (bei der Serie pro Habit: wenn dieses Habit geschafft ist). Ein Fehltag pro Woche (Mo bis So) ist ein Puffertag, die Serie pausiert dann nur. Erst ein zweiter Fehltag in derselben Woche beendet sie. Heute zählt erst, wenn geschafft.

## 2. Architektur (drei Dienste)
```
Browser  ->  Cloudflare (liefert die Dateien aus public/)
Browser  ->  Supabase   (Login und Datenbank, direkt aus dem Browser)
GitHub   ->  Cloudflare (bei jedem Commit auf main automatisch neu veröffentlicht)
Supabase ->  Push-Dienst des Browsers (Apple, Google, Mozilla) -> Gerät   (Erinnerung, seit 11.11.2026)
Browser  ->  Supabase (Server-Funktion ki)  ->  KI-Anbieter Cloudflare Workers AI   (KI-Assistent, seit 12.11.2026)
```
| Dienst | Aufgabe | Warum |
|---|---|---|
| **GitHub** (Repo `mind`) | Speichert den Code. Quelle der Wahrheit. | Jede Änderung ist nachvollziehbar, Cloudflare baut daraus. |
| **Cloudflare** (Workers, statische Dateien) | Veröffentlicht `public/` unter `mind.2k6k4mfpzv.workers.dev`. | Kostenlos, feste Adresse, kein eigener Server nötig. |
| **Supabase** | Postgres-Datenbank und Login (E-Mail und Passwort). | Echte Datenbank und fertiges Login, kostenlos, Zugriffsschutz per Regel. |

Für die Erinnerung läuft in Supabase eine kleine Server-Funktion (Edge Function `push-reminder`), die die Datenbank jede Minute anstößt. Für den KI-Assistenten gibt es eine zweite (Edge Function `ki`), die die App aufruft und die den KI-Anbieter fragt. Sonst gibt es **keinen eigenen Server und keinen Build-Schritt**. Die App besteht aus einer HTML-Datei, CSS-Dateien und JavaScript-Modulen, die der Browser direkt lädt (kein Werkzeug dazwischen, das etwas zusammenbaut). Sie spricht über die Supabase-Bibliothek mit der Datenbank.

## 3. Dateien im Repository
```
public/index.html   Das Gerüst der Seite (nur HTML). Lädt die CSS-Dateien, die Supabase-Bibliothek und js/app.js
public/sw.js        Service Worker: App startet ohne Netz, neue Version auf Tipp, zeigt die Push-Erinnerung (siehe Abschnitt 5)
public/manifest.webmanifest  Name, Symbol und Farben der installierbaren App
public/icons/       App-Symbol (icon.svg ist die Vorlage, die PNG-Größen erzeugt docs/icons.py)
public/css/         tokens.css (alle Design-Werte als Variablen), base.css (Grundregeln, Formularfelder), components.css (Bausteine und Ansichten)
public/js/          config.js, logic.js, ki.js, state.js, store.js, data.js, pwa.js, app.js und der Ordner ui/ (siehe Abschnitt 5)
public/js/vendor/   Supabase-Bibliothek, selbst gehostet (Version und Lizenz in LIES-MICH.txt)
supabase/functions/push-reminder/  Server-Funktion für die Push-Erinnerung (läuft bei Supabase, wird nicht von Cloudflare veröffentlicht)
supabase/functions/ki/  Server-Funktion für den KI-Assistenten (läuft bei Supabase)
public/fonts/       Schrift Plus Jakarta Sans (plus-jakarta-sans.woff2) und ihre Lizenz (ofl.txt). Selbst gehostet, nicht von Google (DSGVO).
wrangler.jsonc      Sagt Cloudflare, dass ./public veröffentlicht wird
docs/schema.sql     Datenbank-Struktur (einmal in Supabase ausgeführt)
docs/JJJJ-MM-TT_*.sql  Spätere Datenbank-Änderungen, nach Datum nacheinander ausgeführt (aktuell: 2026-10-16_add-pos.sql, 2026-11-06_a2-zusatzfelder.sql, 2026-11-06_a3-profiles.sql, 2026-11-07_puls-farbe-symbol.sql, 2026-11-07_puls-einstellungen-verlauf.sql, 2026-11-10_checkins.sql, 2026-11-10_puls-2-3.sql, 2026-11-11_haken-ohne-netz.sql, 2026-11-11_push.sql, 2026-11-11_erinnerung-uhrzeit.sql, 2026-11-11_erinnerung-minutengenau.sql, 2026-11-12_ki.sql)
docs/icons.py       Erzeugt die PNG-Größen des App-Symbols
tests/logik.html    Automatische Tests für Rechen-Logik, Datenschicht und Bedienwege (Serie, Konstanz, frühere Einstellungen, Aktualität, Rückgängig, Haken über den Server, zwei Geräte, Fehlerfälle, Backup, Pausieren, Blatt der Kachel, Einheit, Sammlung, Haken ohne Netz, Start vom Gerät, Push-Regeln und Verschlüsselung, KI-Assistent mit nachgebauter KI, Service Worker). Wird nicht veröffentlicht.
tests/app.html      Die App mit erfundenen Testdaten zum Ansehen, ohne die echte Datenbank
tests/mock-supabase.js  Nachgebaute Supabase-Datenbank für die beiden Testseiten (Tabellen, die Haken-Funktionen mit Tipp-IDs, Push-Anmeldungen, Realtime, feste Antworten der KI)
CLAUDE.md           Arbeitsregeln für Claude Code (wird in jeder Session automatisch gelesen)
CHANGELOG.md        Protokoll aller Änderungen
PROJEKTDOKU.md      Dieses Dokument
README.md           (Platzhalter von GitHub)
```
`wrangler.jsonc`:
```json
{ "name": "mind", "compatibility_date": "2026-10-15", "assets": { "directory": "./public" }, "previews": {} }
```
Der Name `mind` muss dem Projektnamen in Cloudflare entsprechen. Der leere Block `previews` ist nötig, damit Cloudflare für jeden Pull Request eine Vorschau-Seite baut (seit 06.11.2026). Die Vorschau nutzt dieselbe echte Datenbank. Dateinamen immer kleingeschrieben, ohne Leerzeichen. Cloudflare liefert alles unter `public/` aus, also auch `css/` und `js/`.

## 4. Datenbank
Tabelle `public.habits`:
| Spalte | Typ | Bedeutung |
|---|---|---|
| id | uuid | Primärschlüssel |
| user_id | uuid | Besitzer, wird automatisch auf `auth.uid()` gesetzt |
| name | text | Name des Habits |
| days | int[] | Geplante Wochentage, 0 = Montag bis 6 = Sonntag |
| cat | text | Kategorie, leer erlaubt |
| created | date | Ab diesem Tag zählt das Habit (davor nicht geplant) |
| done | jsonb | **Alt, nur noch Übergang (seit 10.11.2026):** erledigte Tage mit Anzahl, z. B. `{"2026-10-15":1}`. Die App liest und schreibt die Spalte nicht mehr, die Haken stehen in `checkins`. Die Datenbank hält `done` automatisch gleich (Rückweg). Wird später gelöscht. |
| pos | integer | Reihenfolge in der Liste (1, 2, 3 ...), Spalte seit 16.10.2026 |
| target | integer | Tagesziel, wie oft am Tag (1–20, Standard 1 = einmal), seit 06.11.2026 |
| daytime | text | Tageszeit: leer (Standard), `morgen`, `mittag`, `abend` oder Uhrzeit `HH:MM`, für den Filter auf „Heute“, seit 06.11.2026 |
| color | text | Farbe der Kachel: leer (Standard = automatisch aus der ID) oder `himmel`, `salbei`, `lavendel`, `apricot`, `sonne`, `rose`, `petrol`, `koralle`. Seit 07.11.2026 |
| icon | text | Symbol: leer (Standard = Anfangsbuchstabe des Namens) oder `tropfen`, `blatt`, `buch`, `hantel`, `puls`, `sonne`, `mond`, `stift`, `herz`, `apfel`, `pille`, `note`, `sprache`, `hut`, `haus`, `handy`. Seit 07.11.2026 |
| settings_log | jsonb | Frühere Einstellungen, Liste von `{"until":"JJJJ-MM-TT","days":[…],"target":n}`, aufsteigend: Bis zum Tag `until` (ausschließlich) galten diese Tage und dieses Tagesziel. Standard `[]` = es galt immer die aktuelle Einstellung. Die App ergänzt die Liste, wenn man Tage oder Tagesziel ändert. Seit 07.11.2026 (für Habits mit Tagesziel über 1 einmalig: bis 06.11.2026 galt 1×, weil es vor A2 kein Tagesziel gab) |
| unit | text | Einheit, Einzahl oder freier Text (`Glas`, `5 Minuten`), höchstens 20 Zeichen. Leer (Standard) = wie bisher „noch 3×“. Seit 10.11.2026 |
| unit_pl | text | Mehrzahl der Einheit (`Gläser`). Leer = wie `unit`. Seit 10.11.2026 |
| paused | jsonb | Pausen, Liste von `{"from":"JJJJ-MM-TT","to":"JJJJ-MM-TT" oder null}`: von `from` bis `to` (beide einschließlich) pausiert, `to` = null heißt „bis ich fortsetze“. Standard `[]` = nie pausiert. Pausierte Tage sind nicht geplant. Frühere Pausen bleiben in der Liste, damit alte Tage nicht als verpasst zählen. Seit 10.11.2026 |
| created_at | timestamptz | Sortierung innerhalb gleicher Position |

Tabelle `public.checkins` (seit 10.11.2026, eine Zeile pro Habit und Tag):
| Spalte | Typ | Bedeutung |
|---|---|---|
| habit_id | uuid | Das Habit. Wird das Habit gelöscht, gehen seine Haken mit. |
| user_id | uuid | Besitzer, wird automatisch auf `auth.uid()` gesetzt |
| day | date | Der Tag |
| count | integer | Wie oft an dem Tag erledigt (0 bis 20). 0 = Haken wieder entfernt, die Zeile bleibt stehen. |
| updated_at | timestamptz | Letzte Änderung |

Schlüssel ist (habit_id, day). Die App ändert Haken nur über Funktionen in der Datenbank:
| Funktion | Aufgabe |
|---|---|
| `checkin_add(p_habit, p_day, p_delta, p_max, p_op)` | Zählt in einem Schritt hoch oder runter und gibt die neue Anzahl zurück. Nie unter 0, nie über `p_max` (das Tagesziel). Zwei Geräte gleichzeitig: beide Haken zählen. `p_op` (seit 11.11.2026, freiwillig) ist die ID des Tipps: Kommt derselbe Tipp zweimal an, zählt er nur einmal. |
| `checkin_set(p_habit, p_day, p_count, p_op)` | Setzt die Anzahl fest (zurück auf 0, Rückgängig). `p_op` wie oben. |
| `checkins_map()` | Gibt alle Haken des Nutzers in einem Rutsch zurück: `{"<habit_id>": {"JJJJ-MM-TT": Anzahl}}`. |

Tabelle `public.checkin_ops` (seit 11.11.2026): eine Zeile pro Tipp-ID (`user_id`, `op_id`, `created_at`), damit ein nachgeschickter Haken nie doppelt zählt. Einträge, die älter als 30 Tage sind, löscht die Datenbank jede Nacht selbst.

**Übergang (bis `done` gelöscht wird):** Zwei Trigger halten `habits.done` und `checkins` gleich. `checkins_to_done` zieht `done` nach, wenn sich ein Haken ändert. `done_to_checkins` zieht `checkins` nach, wenn alter Code noch `done` schreibt (alte offene Browser-Tabs). Rückweg und späteres Aufräumen stehen unten in `docs/2026-11-10_checkins.sql`.

**Realtime:** `checkins` ist in der Veröffentlichung `supabase_realtime`. Die App bekommt Änderungen von anderen Geräten sofort (nur die eigenen Zeilen, die Zugriffsregel gilt auch hier).

Tabelle `public.profiles` (seit 06.11.2026, eine Zeile pro Konto):
| Spalte | Typ | Bedeutung |
|---|---|---|
| id | uuid | Gleich der Konto-ID (`auth.users`) |
| name | text | Name, leer erlaubt (max. 40 Zeichen) |
| timezone | text | Zeitzone, z. B. `Europe/Berlin`. Leer = die App trägt die Gerätezeitzone ein. Seit 11.11.2026 rechnet der Server damit, wann die Uhrzeit der Erinnerung erreicht ist und welcher Tag „heute“ ist. |
| plan | text | `free` (Standard) oder `premium`. Aus der App nicht änderbar. |
| rem_on | boolean | Erinnerung an/aus (Standard aus) |
| rem_time | text | Uhrzeit der Erinnerung `HH:MM` (Standard `20:00`) |
| rem_sent | date | An welchem Tag zuletzt erinnert wurde (höchstens eine Nachricht am Tag). Schreibt nur der Server, die App darf die Spalte nicht ändern. Ausnahme: Ändert sich `rem_time` auf eine Uhrzeit, die noch vor uns liegt, leert ein Trigger die Spalte (`docs/2026-11-11_erinnerung-uhrzeit.sql`), damit die neue Uhrzeit am selben Tag gilt. Seit 11.11.2026 |
| theme | text | Gewähltes Theme aus der Sammlung: leer (Standard „Puls“) oder ein Schlüssel aus `THEMES` in `js/config.js` (`nebel`, `wald`, `sand`, `tiefsee`, `abendrot`, `mitternacht`). Ein unbekannter oder noch nicht freier Schlüssel wird in der App wie leer behandelt. Seit 10.11.2026 |
| days_total | integer | Höchster je erreichter Stand an „Tagen insgesamt“ (Tage mit mindestens einem geschafften Habit). Die App erhöht ihn nur. So bleibt ein Theme frei, auch wenn später ein Habit mit seinen Haken gelöscht wird. Seit 10.11.2026 |
| created_at | timestamptz | Anlegezeit |

Das Profil legt ein Trigger (`on_auth_user_created`) beim Anlegen eines Kontos automatisch an. Die App darf das Profil nur lesen und `name`, `timezone`, `rem_on`, `rem_time`, `theme`, `days_total` ändern (Rechte pro Spalte), damit sich niemand selbst auf Premium setzen kann.

Tabelle `public.push_subs` (seit 11.11.2026, eine Zeile pro Gerät, das die Erinnerung bekommt):
| Spalte | Typ | Bedeutung |
|---|---|---|
| id | uuid | Primärschlüssel |
| user_id | uuid | Besitzer, wird automatisch auf `auth.uid()` gesetzt |
| endpoint | text | Adresse des Geräts beim Push-Dienst des Browsers (Apple, Google, Mozilla). Pro Gerät einmalig. |
| p256dh, auth | text | Schlüssel des Geräts. Damit wird die Nachricht so verschlüsselt, dass nur dieses Gerät sie lesen kann. |
| created_at | timestamptz | Anlegezeit |

**Push-Erinnerung (seit 11.11.2026):**
- Zeitplan: `pg_cron` ruft jede Minute `push_tick()` auf (seit 11.11.2026 abends, vorher alle 5 Minuten, `docs/2026-11-11_erinnerung-minutengenau.sql`), das stößt über `pg_net` die Edge Function `push-reminder` an. Solange niemand die Erinnerung an hat und ein Gerät angemeldet ist, passiert nichts. Eine zweite Aufgabe löscht nachts alte Tipp-IDs.
- Die Edge Function (`supabase/functions/push-reminder`) prüft pro Profil mit `rem_on`: Ist in seiner Zeitzone die Uhrzeit erreicht und heute noch nichts gekommen? Dann markiert sie den Tag (`rem_sent`), schaut, was offen ist, und schickt an jedes angemeldete Gerät eine Nachricht. Ist nichts offen, kommt nichts. Meldet der Push-Dienst ein Gerät als abgemeldet, wird seine Zeile in `push_subs` gelöscht.
- „Offen“ heißt dasselbe wie in der App: Die Funktion benutzt Kopien von `logic.js` und `config.js` (`sched()` und `ok()`). Ein Test prüft, dass die Kopien aktuell sind.
- **Geheimnisse** stehen nirgends im Code oder im Repository. Sie liegen im Tresor der Datenbank (Supabase Vault): `mind_push_cron` (Losung, mit der die Datenbank die Funktion anstößt, die Datenbank hat sie selbst erzeugt) und `mind_vapid_public` / `mind_vapid_private` (Schlüsselpaar für Web Push, erzeugt die Funktion beim ersten Lauf). Die Funktionen `push_secrets()` und `push_keys_set()` darf nur der Server aufrufen. `push_key()` gibt der App den öffentlichen Schlüssel. Der Sicherheitscheck von Supabase meldet `push_key()` als Hinweis (eine Funktion mit erhöhten Rechten, die Angemeldete aufrufen dürfen). Das ist gewollt: Sie gibt nur den öffentlichen Schlüssel heraus.
- Nachsehen und Anhalten: Befehle stehen unten in `docs/2026-11-11_push.sql`. Was die Funktion getan hat, steht in Supabase unter Edge Functions → `push-reminder` → Logs.

Tabelle `public.ki_log` (seit 12.11.2026, eine Zeile pro Anfrage an die KI, **ohne Inhalt**):
| Spalte | Typ | Bedeutung |
|---|---|---|
| id | bigint | Primärschlüssel |
| user_id | uuid | Wer gefragt hat |
| kind | text | Thema: `frei`, `woche`, `neu`, `mini`, `muster`, `formulieren` |
| first | boolean | Das Gespräch hat mit dieser Anfrage angefangen |
| day | date | Tag in der Zeitzone des Nutzers (dafür gilt das Tageslimit) |
| created_at | timestamptz | Zeitpunkt |

**KI-Assistent (seit 12.11.2026):**
- Die App schickt das Gespräch und eine Zusammenfassung der Habits an die Edge Function `ki` (`supabase/functions/ki`). Die prüft die Anmeldung, zählt die Anfrage und fragt den KI-Anbieter. Zurück kommt `{text, vorschlag}` oder genau ein Grund (`setup`, `pro`, `limit`, `voll`, `fehler`).
- **Limit:** `ki_take(p_user, p_kind, p_first, p_limit, p_pro)` zählt eine Anfrage, wenn das Tageslimit es erlaubt (20 am Tag, mit `plan = premium` 100, die Zahlen stehen in `coach.js`). `ki_back(p_id)` nimmt die Zählung zurück, wenn der Anbieter nicht geantwortet hat. Beide darf nur der Server aufrufen. Die App kommt an `ki_log` gar nicht heran (Row Level Security an, bewusst keine Regel). Der Sicherheitscheck von Supabase meldet das als Hinweis, das ist gewollt. Zeilen, die älter als 100 Tage sind, löscht die Datenbank nachts selbst.
- **Pro (vorbereitet, aus):** `ki_take` kennt die Regel für später schon: Ohne Pro geht nur „Woche besprechen“, ein Gespräch im Monat, sonst zeigt die App die Pro-Seite. Eingeschaltet wird sie über das Geheimnis `MIND_PRO` = `on` der Edge Function. Wer `plan = premium` hat, ist davon nie betroffen.
- **Anbieter:** Cloudflare Workers AI, Modell `@cf/mistralai/mistral-small-3.1-24b-instruct` (das kleine Modell von Mistral, es läuft bei Cloudflare). Beides steht an einer Stelle, `PROVIDER` in `supabase/functions/ki/index.ts`. Kostenlos bis 10.000 „Neurons“ am Tag **für die ganze App zusammen**, das sind grob 100 bis 130 Antworten. Ist das Kontingent leer, meldet der Chat einen Fehler, bis der Tag (UTC) um ist. Cloudflare nutzt die Eingaben nicht zum Training.
- **Geheimnisse:** `CLOUDFLARE_ACCOUNT_ID` (Konto-Nummer) und `CLOUDFLARE_API_TOKEN` (Schlüssel mit dem Recht „Workers AI: Lesen“) sind Secrets der Edge Function (Supabase-Dashboard → Edge Functions → Secrets). Sie stehen nirgends im Code oder im Repository.
- **Datenschutz:** An den Anbieter gehen die Anleitung, die Zusammenfassung (Habit-Namen, Tage, Tagesziel, Einheit, Tageszeit, Kategorie, Pause, Konstanz, Serie, letzte 7 Tage, Quote pro Wochentag) und das Gespräch. Keine E-Mail, kein Name, keine IDs. Gespräche werden bei MIND nicht gespeichert. Der Anbieter gehört in die Datenschutzerklärung (Roadmap B3), Habits können Gesundheitsdaten sein.
- Nachsehen, wie viel die KI benutzt wird: Befehl unten in `docs/2026-11-12_ki.sql`. Was die Funktion getan hat (ohne Inhalte): Supabase → Edge Functions → `ki` → Logs.

**Sicherheit:** Row Level Security ist aktiv. Auch bei `push_subs` und `checkin_ops` sieht und ändert jeder nur seine eigenen Zeilen. Die Regel `own habits` erlaubt Eingeloggten nur Zeilen mit eigener `user_id`, bei `profiles` nur die Zeile mit eigener `id`, bei `checkins` (`own checkins`) nur eigene Zeilen zu eigenen Habits. Die Haken-Funktionen laufen mit den Rechten des angemeldeten Nutzers, die Regeln gelten also auch dort. Deshalb darf der `anon`-Key im Code stehen. Die Registrierung neuer Nutzer ist in Supabase ausgeschaltet, nur Pauls Account existiert.

**Warum `checkins` statt `done` (seit 10.11.2026):** Früher stand alles als Liste im Habit, und die App schickte bei jedem Haken die ganze Liste. Hakten zwei Geräte gleichzeitig ab, überschrieb die eine Liste die andere. Mit einer Zeile pro Tag und einer Funktion, die in der Datenbank hochzählt, kann das nicht mehr passieren. Außerdem ist es die Grundlage für Haken ohne Netz (werden später nachgeschickt) und für Haken aus einer Benachrichtigung.

## 5. Aufbau des Codes
Seit 10.11.2026 ist die App in Dateien aufgeteilt. Jede hat genau eine Aufgabe, und die Richtung ist immer dieselbe:
```
config.js  ->  logic.js, ki.js  ->  state.js  ->  store.js  ->  data.js  ->  pwa.js      ->  ui/*  ->  app.js
feste Werte    rechnen              Zustand       Speicher      Supabase     installierbare   zeichnen   starten
                                                  auf dem Gerät              App, Push
```
Eine Datei benutzt nur Dateien, die links von ihr stehen. `logic.js` weiß nichts von der Seite oder der Datenbank, `data.js` zeichnet nichts.

**Aussehen (`public/css/`)**
- `tokens.css`: alle Design-Werte als CSS-Variablen: Farben (hell und dunkel), Schrift, Abstände, Rundungen, Schatten, Animationsdauern und die eine Animationskurve. Wer das Aussehen ändern will, ändert es hier. `data-theme="light"` oder `"dark"` am `<html>` erzwingt hell oder dunkel. Ganz unten stehen die Themes der Sammlung: `data-theme="wald"` usw. tauscht nur die Farben, jeweils dunkel und hell. Die 8 Habit-Farben bleiben in jedem Theme gleich. Derselbe Selektor ohne `:root` färbt die kleine Vorschau in der Sammlung, so stehen die Farben nur an einer Stelle.
- `base.css`: Schrift laden, Grundregeln, Formularfelder, kleine Helfer (`.panel`, `.note`, `.cap` …).
- `components.css`: alle Bausteine und Ansichten. Die Reihenfolge der Regeln ist wichtig, nicht umsortieren. Noch nicht alle Abstände nutzen die Variablen, das macht das Design-Paket.
- **Kacheln:** Die Füllung wächst über die CSS-Variable `--p` (0 bis 1). Der Inhalt liegt zweimal übereinander, normal und dunkel auf der Füllung, beide passend abgeschnitten. So bleibt die Schrift auf jeder Farbe lesbar.

**Logik und Daten (`public/js/`)**
- `config.js`: Supabase-Adresse und öffentlicher anon-Key, Grenzen (`TARGET_MAX`), die 8 Habit-Farben (`COLS`), 16 Symbole (`ICONS`, Linien-Icons als SVG) und die Themes der Sammlung (`THEMES`: Schlüssel, Name, frei ab so vielen Tagen).
- `logic.js`: reine Rechen-Funktionen, „heute“ kommt immer als Parameter herein (deshalb gut testbar). `norm()` setzt Standardwerte. `cfg(h, tag)` gibt die Einstellungen (Tage, Tagesziel), die an einem Tag galten (aus `settings_log`, sonst die aktuellen), `tg(h, tag)` das Tagesziel an dem Tag. `sched(h, tag)` sagt, ob ein Habit an einem Tag geplant war (nicht vor dem Start, nicht in einer Pause, nur an den gewählten Wochentagen). `pauseOn()` gibt die Pause, die an einem Tag gilt, `pauseList()` und `resumeList()` bauen die neue Pausen-Liste beim Pausieren und Fortsetzen. `unitText()` baut die Zeile „noch 3 Gläser“. `daysTotal()` zählt die Tage insgesamt für die Sammlung, `themeOk()` und `nextTheme()` sagen, welches Theme frei ist und welches als Nächstes kommt. `cnt(h, tag)` gibt die Anzahl, `ok(h, tag)` sagt, ob das Tagesziel erreicht ist (nur das zählt als erledigt). `settingsLog()` merkt sich beim Bearbeiten die alten Einstellungen. `fair()` zählt eine faire Serie (mit Puffertag), `streak()` pro Habit, `dayStreak()` für den ganzen Tag. `konst()` rechnet die Konstanz der letzten 30 Tage, `range()` erledigt gegen geplant, `dayProgress()` den Tagesring, `weekdayPattern()` das Muster nach Wochentag. `colKey(h)` gibt die Farbe eines Habits (bei leerem `color` eine feste aus der ID).
- `ki.js` (seit 12.11.2026): reine Rechen-Funktionen für die KI. `summary(habits, heute, focus)` baut die Zusammenfassung als Text und merkt sich, welche Nummer welches Habit ist (`ids`), damit keine ID die App verlässt. `proposal()` prüft einen Vorschlag der KI, bevor er gezeigt wird (Name, Tage, Tagesziel 1 bis 20, Einheit, Tageszeit, gibt es das Habit noch). Unbrauchbares wird zu `null`, dann erscheint nur der Text.
- `state.js`: der Zustand im Browser. `state` (Habits, Profil, Erinnerung) ändert nur `data.js`, `ui` (was gerade offen ist, Filter, Formularwerte) ändern die Ansichten. `today` und `TI` (heute als Text) werden beim Laden festgelegt.
- `data.js`: **die einzige Stelle, die mit Supabase spricht.** Jedes Habit hat im Browser `h.done = {"JJJJ-MM-TT": Anzahl}`, gefüllt aus `checkins_map()`.
  - **Optimistisch:** Jede Änderung wird sofort gezeigt und dann gespeichert. Schlägt das Speichern fehl, wird sie zurückgenommen und oben steht „Speichern fehlgeschlagen: …“ bzw. ohne Netz „Kein Netz. Das wurde nicht gespeichert.“ (kein Popup). Ausnahme sind Haken, siehe nächster Punkt.
  - **Haken:** `tap()` (Antippen: +1, bei erreichtem Ziel zurück auf 0) und `setCount()`. Jeder Tipp ist ein Auftrag mit eigener ID in einer Warteschlange (`pend`), die auch auf dem Gerät gespeichert ist. Pro Habit und Tag gehen die Aufträge nacheinander raus (`pump()`), damit schnelle Tipps in der richtigen Reihenfolge ankommen. Die Antwort des Servers ist die Wahrheit (z. B. wenn ein anderes Gerät auch abgehakt hat).
  - **Ohne Netz (seit 11.11.2026):** Kommt ein Auftrag nicht durch, bleibt der Haken stehen und der Auftrag liegen. `flush()` schickt alles nach: beim Laden, sobald wieder eine Anfrage klappt, und wenn der Browser „online“ meldet. Die Datenbank kennt die IDs, deshalb zählt nichts doppelt. Lehnt die Datenbank einen Auftrag ab (z. B. Habit woanders gelöscht), wird der Haken zurückgenommen. `net()` sagt, ob gerade Netz da ist und wie viele Haken warten.
  - **Stand auf dem Gerät:** Kurz nach jeder Änderung legt `keep()` Habits, Haken und Profil auf dem Gerät ab. `restore()` holt sie beim Start, damit die App sofort etwas zeigt. Beim Abmelden wird alles gelöscht (`clear()`).
  - **Push-Anmeldungen:** `pushKey()`, `savePush()`, `dropPush()` (Tabelle `push_subs`).
  - **KI:** `ki(body)` ruft die Edge Function `ki` auf und gibt deren Antwort zurück oder `{netz:true}` bzw. `{fehler:true}`. Wirft nie und zeigt keine Meldung oben, der Chat sagt es selbst.
  - **Realtime:** `watch()` hört auf Änderungen an `checkins`. Eigene, noch laufende Änderungen haben Vorrang.
  - **Neuladen:** Der Zähler `gen` verhindert, dass ein langsames Neuladen eine gerade gesetzte Änderung überschreibt.
  - **Tage insgesamt:** `keepDays()` schreibt den höchsten Stand still ins Profil (`days_total`), aber nur nach bestätigten Ständen (geladen, Haken gespeichert) und nur nach oben.
  - Gibt Bescheid über `on("change")`, `on("error")`, `on("profile")`, `on("net")`.
- `store.js`: kleiner Speicher auf dem Gerät (IndexedDB) mit `get`, `set`, `wipe`. Dort liegen die Warteschlange (`ops`) und der letzte Stand (`snap`). Geht der Speicher nicht, läuft die App ohne Offline-Gedächtnis weiter.
- `pwa.js`: meldet den Service Worker an, merkt, wenn eine neue Version bereitliegt (`start`, `update`, `check`), und kümmert sich um Push für dieses Gerät (`pushState`, `pushOn`, `pushOff`, `pushKeep`). Zeichnet nichts.

**Oberfläche (`public/js/ui/`)**
- `dom.js`: kleine Helfer (`$`, `esc`) und HTML-Bausteine, die mehrere Ansichten brauchen (Tage, Farben, Symbole, „Mehr Optionen“, der Funke `SPARK` und die Plakette `PRO` für KI-Stellen).
- `render.js`: Jede Ansicht meldet mit `onRender()` an, was sie zeichnet. `render()` zeichnet alles neu. `render(true)` lässt die Kacheln stehen, damit sich eine angetippte Kachel animiert füllt.
- `heute.js`: Kacheln, Tagesring, Konstanz-Karte, Filter nach Tageszeit.
- `verlauf.js`: Karten mit `mosaic()` und Konstanz-Ring, aufgeklappt die Woche zum Nachtragen, Bearbeiten, Pausieren oder Fortsetzen, Verschieben, Löschen in zwei Klicks, dazu Fortschritt und Muster.
- `edit.js`: das Formular „Habit bearbeiten“ (Werte in `ui.ed`). Es wird an zwei Stellen benutzt: in der Verlauf-Karte und im Blatt auf „Heute“ (`ui.ed.sheet`). `bindEdit(bereich)` macht es in einem Bereich bedienbar.
- `menu.js`: das Blatt der Kachel (`<dialog id="menu">`): Farbtupfer, Bearbeiten, Pausieren mit optionalem Enddatum, Fortsetzen, „Mini-Version vorschlagen“ (KI). `openEdit(i, werte)` öffnet es direkt im Bearbeiten mit eingetragenen Werten. Hier steckt auch das Erkennen von „lange drücken“ (eine halbe Sekunde, Bewegung bricht ab) und der Rechtsklick. Solange der Finger nach dem Öffnen noch unten ist, zählt das Loslassen weder als Haken noch als Tipp neben das Blatt.
- `sammlung.js`: Ansicht „Sammlung“, die kleine Karte im Verlauf und das Anwenden des Themes (`data-theme` am `<html>`, Farbe der Browser-Leiste).
- `ich.js`: Profil, Erinnerung (Schalter und Uhrzeit im Profil, dazu die Zeile „Dieses Gerät“: bekommt es die Push, kann es das, ist es gesperrt, iPhone erst zum Home-Bildschirm), Backup kopieren und wiederherstellen. Das Backup-Format ist wie früher (`done` pro Habit), alte Backups passen weiter.
- `sheet.js`: das Blatt „Neues Habit“ (`<dialog>`, am Handy von unten). `openSheet(vorschlag)` öffnet es vorausgefüllt (KI, „Anpassen“).
- `ki.js` (seit 12.11.2026): der KI-Chat (`<dialog id="ki">`). Das Gespräch steht in `ui.ki` und nur dort. `openKi(thema, {i, text})` öffnet ihn. Jeder Knopf mit `data-ki="…"` irgendwo in der App ist ein Einstieg (`data-ki=""` = MIND-Knopf, sonst das Thema, `data-i` = welches Habit), deshalb müssen die anderen Ansichten diese Datei nicht kennen. `send()` schickt Frage, Gespräch und Zusammenfassung an `data.ki()`. `take()` übernimmt einen Vorschlag (neues Habit anlegen oder über `startEdit`/`saveEdit` ändern), `adapt()` öffnet das Formular vorausgefüllt. Die Pro-Seite ist eine zweite Ansicht im selben Blatt und erscheint nur, wenn der Server `pro` meldet.
- `toast.js`: „Rückgängig“, 5 Sekunden über der Tab-Leiste, wenn ein Tipp ein Mehrfach-Habit auf 0 gesetzt hat.
- `app.js`: verbindet alles: Supabase-Verbindung, Login (`onAuth`), Tab-Leiste, und `refresh()`: beim Zurückkommen zur Seite Daten neu laden, nach Mitternacht die ganze Seite. Nie während `ui.ed` (Bearbeiten) oder ein Blatt offen ist. Dazu der Start vom Gerät (`data.restore()` vor der Anmeldung) und die zwei ruhigen Hinweise oben (`#net` „Offline …“, `#upd` „Neue Version …“).

**Installierbare App (`public/sw.js`, `manifest.webmanifest`, seit 11.11.2026)**
- **Service Worker:** legt beim Installieren alle Dateien aus der Liste `FILES` auf dem Gerät ab und liefert sie von dort aus. Anfragen an Supabase gehen immer direkt ins Netz. Er zeigt außerdem die Push-Nachricht an und holt MIND beim Antippen nach vorn.
- **Neue Version:** Der Browser merkt eine neue Version nur daran, dass sich `sw.js` ändert. Deshalb steht dort `VERSION`, die Prüfsumme über alle Dateien der Liste. **Nach jeder Änderung in `public/` muss `VERSION` neu eingetragen werden:** Der Test „VERSION im Service Worker passt zum Inhalt“ in `tests/logik.html` wird sonst rot und zeigt den richtigen Wert zum Kopieren. Kommt eine Datei dazu, gehört sie in `FILES` (auch das prüft ein Test).
- **Ablauf beim Update:** Die neue Version wird im Hintergrund vollständig geladen und wartet. Oben erscheint „Neue Version von MIND. Tippen zum Aktualisieren.“ Ein Tipp schaltet um und lädt neu. Wer nicht tippt, bekommt sie beim nächsten Öffnen, wenn MIND ganz zu war.
- **Ohne Netz mit abgelaufener Anmeldung:** Supabase kann die Anmeldung dann nicht erneuern und meldet nach etwa 50 Sekunden „abgemeldet“, obwohl sie noch gespeichert ist. Die App zeigt deshalb schon vorher den Stand vom Gerät und bleibt in diesem Fall dabei (`data.stays()`). Kommt das Netz zurück, erneuert Supabase die Anmeldung und es wird frisch geladen.

**Server-Funktion (`supabase/functions/push-reminder/`, seit 11.11.2026)**
- `erinnerung.js`: Regeln und Ablauf ohne Netz und ohne Deno, deshalb in `tests/logik.html` geprüft. `due()` (ist die Uhrzeit erreicht), `openToday()` (was ist offen), `text()` (die Nachricht), `run()` (ein Durchlauf).
- `webpush.js`: verschlüsselt die Nachricht für ein Gerät (RFC 8291) und weist den Server beim Push-Dienst aus (VAPID, RFC 8292), ohne fremde Bibliothek. Der Test rechnet das Beispiel aus dem Standard nach.
- `index.ts`: verbindet Datenbank, Schlüssel und Push-Dienst. Nur dieser Teil läuft ausschließlich auf dem Server.
- `logic.js`, `config.js`: Kopien aus `public/js/`. **Ändert sich eine der beiden, die Kopie nachziehen** (`cp public/js/logic.js public/js/config.js supabase/functions/push-reminder/`) **und die Funktion neu ausrollen** (Claude über den Supabase-Konnektor, Einstellung „JWT prüfen“ aus, weil die Funktion ihre eigene Losung prüft).

**Server-Funktion für die KI (`supabase/functions/ki/`, seit 12.11.2026)**
- `coach.js`: Regeln und Ablauf ohne Netz und ohne Deno, deshalb in `tests/logik.html` geprüft. `clean()` prüft und kürzt die Anfrage (höchstens 16 Nachrichten, nur die Rollen Mensch und KI). `prompt()` baut die Anleitung für das Modell: wie MIND denkt und redet, die Zusammenfassung, die Aufgabe zum Thema, das Antwortformat. **Wer den Ton oder die Regeln der KI ändern will, ändert sie hier.** `parse()` wertet die Antwort aus (JSON, sonst reiner Text). `run()` ist der Ablauf: prüfen, zählen, fragen, bei Fehlern die Zählung zurücknehmen. `LIMIT` sind die Nachrichten pro Tag.
- `index.ts`: prüft die Anmeldung, liest `profiles.plan`, verbindet Datenbank und Anbieter. Ganz oben steht `PROVIDER` (Adresse, Modell, Name des Geheimnisses): **die eine Stelle zum Wechseln des Anbieters.** Mistral, Groq und Cloudflare sprechen dieselbe Schnittstelle.
- Nach einer Änderung in diesem Ordner die Funktion neu ausrollen (Claude über den Supabase-Konnektor, Einstellung „JWT prüfen“ an: Nur Angemeldete erreichen die Funktion).

**Sonst**
- **Supabase-Bibliothek:** liegt seit 11.11.2026 selbst gehostet in `public/js/vendor/supabase.js` (Version `2.45.4`, unverändert, Prüfsumme und Lizenz in `LIES-MICH.txt` daneben). So startet MIND ohne Netz und lädt nichts mehr von fremden Servern.
- **Lokal im Browser (localStorage):** Erinnerung an/aus und Uhrzeit stehen seit A3 im Profil. Der alte Eintrag `habits-rem` wird beim ersten Laden einmal ins Profil übernommen und gelöscht. Seit 10.11.2026 dazu `mind-theme` (gewähltes Theme, damit die Seite gleich in der richtigen Farbe startet, eine Zeile in `index.html` liest es vor dem ersten Zeichnen, beim Abmelden wird es gelöscht) und `mind-seen` (bis zu wie vielen Tagen dieses Gerät die Sammlung schon gesehen hat, für den Hinweis „neu freigeschaltet“).
- **Popups:** `confirm`/`alert` werden nicht benutzt (sie wurden in der Vorschau blockiert).
- **Auf dem Gerät (IndexedDB, Datenbank `mind`):** die Warteschlange der Haken und der letzte Stand (siehe `store.js`). Beim Abmelden gelöscht.
- **Platz für später:** Animationen bauen auf den Dauern und der Kurve in `tokens.css` auf (Paket 4).
- **Pro und KI im Aussehen:** vier Werte in `tokens.css` (`--pro`, `--proInk`, `--proMute`, `--spark`), die in jedem Theme und in hell und dunkel gleich sind. Die Regeln stehen am Ende von `components.css`.

## 6. Änderungen einspielen
1. Änderungen macht Claude Code auf einem eigenen Branch mit Pull Request (Regeln in `CLAUDE.md`). Cloudflare baut für jeden Pull Request eine Vorschau.
2. Nach dem Merge auf `main` baut Cloudflare automatisch, nach etwa einer Minute ist es live. Bei Problemen: Cloudflare → Deployments → Log ansehen.
3. Seite mit Cmd+Shift+R neu laden.
4. Eintrag in `CHANGELOG.md` ergänzen (neueste oben).

**Nach jeder Änderung in `public/`:** Tests laufen lassen und `VERSION` in `public/sw.js` auf den Wert setzen, den der Test anzeigt (siehe Abschnitt 5, „Neue Version“). Sonst bekommen installierte Geräte die Änderung nicht.

**Testen (seit 07.11.2026):** Im Code-Ordner `python3 -m http.server 8000` starten. Dann `http://localhost:8000/tests/logik.html` öffnen: Oben muss „Alle … Tests bestanden“ stehen (dauert etwa 45 Sekunden, das Fenster dabei offen lassen). Ein Doppelklick auf die Datei reicht nicht: Module lädt der Browser nur über einen Webserver. `http://localhost:8000/tests/app.html` zeigt die App mit erfundenen Daten zum Durchklicken. Beides berührt die echte Datenbank nie. Neue Logik und neue Datenfunktionen bekommen einen neuen Test in `tests/logik.html`. Kommt eine neue Tabelle oder Datenbank-Funktion dazu, muss `tests/mock-supabase.js` sie auch kennen.

## 7. Entscheidungen und warum
- **Module ohne Build-Schritt statt Framework (10.11.2026, vorher eine einzige Datei):** Der Browser lädt die Dateien direkt, es gibt kein Werkzeug, das kaputtgehen kann. Die Aufteilung nach Aufgaben hält den Code verständlich, auch wenn KI, Offline und Push dazukommen.
- **Haken zählt der Server (10.11.2026):** siehe Abschnitt 4, „Warum `checkins` statt `done`“.
- **Supabase statt eigener Server:** Login und Datenbank sind fertig, kostenlos, Sicherheit per Datenbank-Regel statt eigenem Code.
- **E-Mail und Passwort:** Einfachster Login für eine Person.
- **Wochentage statt „3× pro Woche":** Gewählte Tage sind übersichtlicher, die anderen Tage bleiben leer („nicht geplant"). Eine frühere Version hatte Wochenziele, sie wurden ersetzt.
- **Zwei Klicks zum Löschen:** Wegen blockierter Popups, und es schützt vor Versehen.
- **Design „Puls“ (07.11.2026):** Motivierend ohne Druck. Belohnung ja, Verlust nie: kein Rot, kein X, Konstanz-Quote statt harter Serie. Details im Vault: `Habit Tracker/MIND – Redesign (3 Design-Konzepte).md`.
- **Frühere Einstellungen merken statt Haken umzuschreiben (07.11.2026):** Ändert man Tagesziel oder Tage, bleiben die gespeicherten Haken, wie sie sind. Die App weiß über `settings_log`, was damals galt. So stimmen Konstanz und Serie rückwirkend, und es gehen keine echten Zahlen verloren.
- **Konstanz überall 30 Tage (07.11.2026, Pauls Entscheidung):** Eine Zahl, eine Rechnung. Reagiert schnell, wenn man wieder dranbleibt. Die Punkte im Verlauf zeigen weiter 12 Wochen.
- **Pausen als Liste von Zeiträumen (10.11.2026):** Eine Pause ändert keine Haken und keine Einstellungen. Sie macht nur Tage „nicht geplant“, und weil die ganze App über `sched()` fragt, ob ein Tag geplant war, stimmen alle Zahlen von selbst. Alte Pausen bleiben gespeichert, sonst würden ihre Tage nach dem Fortsetzen rückwirkend als verpasst zählen.
- **Sammlung ohne Druck (10.11.2026):** Themes zählen nach Tagen insgesamt, nicht am Stück, und man kann nichts verlieren (Höchststand im Profil). Kein Schloss, nichts ausgegraut, kein Popup und kein Punkt an der Tab-Leiste. Alle 6 Themes sind gratis, Pro-Themes kommen erst, wenn es Pro gibt. Das Freischalten prüft nur die App, nicht die Datenbank: Es geht um Motivation, nicht um etwas, das geschützt werden muss.
- **Installierbare Web-App statt App Store (07.11.2026, gebaut 11.11.2026):** keine Gebühren, kein zweiter Code. Die Website ist die App.
- **Ohne Netz gehen nur Haken (11.11.2026):** Abhaken ist das, was man unterwegs wirklich braucht, und es lässt sich sauber nachschicken (Tipp-IDs, der Server zählt). Habits ohne Netz zu ändern würde echte Konflikte zwischen Geräten erzeugen. Das bleibt bewusst weg.
- **Push nur, wenn etwas offen ist, und nur einmal (Pauls Entscheidung 10.11.2026):** eine Nachricht zur eingestellten Uhrzeit, kein Nachhaken, keine roten Punkte. Ist alles erledigt, kommt nichts. Der Tag wird vor dem Senden als erledigt markiert, damit auch bei einem Fehler nie zwei Nachrichten kommen.
- **Schlüssel im Tresor der Datenbank statt von Hand kopiert (11.11.2026):** Die Datenbank und die Server-Funktion erzeugen ihre Geheimnisse selbst und legen sie in Supabase Vault. Kein Schlüssel wandert durch einen Chat, eine Zwischenablage oder das Repository.
- **Versionsnummer als Prüfsumme (11.11.2026):** Ohne Build-Schritt muss jemand dem Service Worker sagen, dass es etwas Neues gibt. Statt einer Nummer, die man vergisst, ist es die Prüfsumme der Dateien, und ein Test wacht darüber.
- **KI: Cloudflare Workers AI als Anbieter (12.11.2026):** Zuerst war Mistral direkt gewählt (siehe nächster Satz). Beim Einrichten zeigte sich: Mistral gibt die API für neue Konten nur noch gegen vorab bezahltes Guthaben mit Kreditkarte frei (mindestens 10 €). Deshalb der zweite Platz aus dem Vergleich. Für später mit Pro bleibt Mistral direkt der bessere Weg (Server in der EU, kein Kontingent für alle zusammen), der Wechsel ist die eine Stelle `PROVIDER`. Die erste Entscheidung war Mistral: kostenlos, Firma und Server in der EU, das Training mit den Anfragen lässt sich abschalten. Verglichen mit Cloudflare Workers AI (kein Training, aber Server weltweit und knapperes Tageskontingent), Groq (Server in den USA) und Google Gemini (Gratis-Tarif für Apps mit Nutzern in der EU nicht erlaubt). Vergleich mit Quellen im Vault: `Habit Tracker/MIND – Fable Auftrag 3 (KI-Assistent).md`.
- **KI bekommt eine Zusammenfassung, keine Daten (12.11.2026):** Die App rechnet aus, was die KI wissen muss, und schickt Text. So verlässt nichts die App, was die KI nicht braucht, und der Server braucht keine zweite Kopie der Rechen-Logik.
- **Gespräche werden nicht gespeichert (12.11.2026):** weder auf dem Server noch auf dem Gerät. Weniger Daten, weniger Risiko, nichts zum Aufräumen. Der Preis: Nach dem Schließen von MIND ist das Gespräch weg.
- **Limit und Pro-Regel auf dem Server (12.11.2026):** Das Repository ist öffentlich, die App kann jeder umbauen. Gezählt und entschieden wird deshalb in der Datenbank, die App zeigt nur an.
- **Mini-Version ändert das Habit (Pauls Entscheidung 12.11.2026):** „Übernehmen“ stellt das Habit auf die Mini-Version um, über denselben Weg wie „Bearbeiten“. Keine neue Spalte. Alte Haken zählen weiter nach den alten Einstellungen.
- **Plakette „PRO“ schon jetzt (Pauls Entscheidung 12.11.2026):** Tester sehen, was später Pro ist. Gesperrt ist nichts.
- **Schrift selbst gehostet:** Google Fonts direkt einzubinden hat das LG München 2022 als DSGVO-Verstoß gewertet. Deshalb liegt die Schrift in `public/fonts/`.

## 8. Bekannte Stolpersteine
- Cloudflare braucht `wrangler.jsonc` und den Ordner `public`, sonst Fehler „Could not detect a directory containing static files".
- Ohne `"previews": {}` in `wrangler.jsonc` scheitern Vorschau-Builds mit „missing a `previews` block“.
- Falsch geschriebene oder falsch benannte `index.html` (Großbuchstaben, Leerzeichen) führt zu einer weißen Seite.
- Ohne `docs/schema.sql` in Supabase gibt es die Meldung „Could not find the table 'public.habits'".
- **Offen:** Der Abmelden-Button reagierte in Safari nicht. Er wurde so umgebaut, dass er lokal abmeldet und den Login-Eintrag im Browser löscht. Ob das das Problem endgültig löst, ist nicht bestätigt.
- **Änderung kommt auf dem Handy nicht an:** `VERSION` in `public/sw.js` wurde nicht angepasst (der Test zeigt es). Zum Nachsehen am Mac: Entwicklerwerkzeuge → Application → Service Workers.
- **Lokal testen und der Service Worker:** Unter `http://localhost:8000/public/` meldet sich der Service Worker an und liefert danach die gemerkten Dateien aus. Wer dort eine Änderung nicht sieht: in den Entwicklerwerkzeugen „Unregister“ oder `VERSION` anpassen. Die Testseiten unter `/tests/` sind davon nicht betroffen.
- **Push auf dem iPhone** geht nur, wenn MIND vom Home-Bildschirm geöffnet wird (ab iOS 16.4). In Safari selbst gibt es dort kein Push. Die Zeile „Dieses Gerät“ in „Ich“ sagt das.
- **Keine Push kommt an:** In „Ich“ nachsehen, ob dieses Gerät angemeldet ist. Dann in Supabase die Logs der Funktion `push-reminder` und die Befehle unten in `docs/2026-11-11_push.sql`. Kommt mehrere Tage nichts, kann Apple oder Google die Anmeldung des Geräts verworfen haben: in „Ich“ aus- und wieder einschalten.
- Die App braucht `docs/2026-11-11_haken-ohne-netz.sql`. Ohne sie steht beim Abhaken oben „Could not find the function public.checkin_add(…p_op…)“. Für Push dazu `docs/2026-11-11_push.sql` und die ausgerollte Funktion, sonst steht in „Ich“ „Push ist auf dem Server noch nicht eingerichtet.“
- Wer sich ohne Netz abmeldet, verliert Haken, die noch nicht nachgeschickt waren.
- **Der Chat sagt „Die KI ist auf dem Server noch nicht eingerichtet.“:** Eins der Geheimnisse `CLOUDFLARE_ACCOUNT_ID` oder `CLOUDFLARE_API_TOKEN` fehlt bei der Edge Function `ki`.
- **Der Chat sagt „Das hat gerade nicht geklappt.“ bei jeder Frage:** In den Logs der Funktion `ki` steht der Grund, zum Beispiel `Anbieter 401` (Schlüssel falsch), `Anbieter 403` (Modell im Gratis-Plan nicht erlaubt) oder `Anbieter 429` (Tageskontingent leer).
- **Der Chat sagt immer „Das hat gerade nicht geklappt.“:** Die Funktion `ki` ist nicht ausgerollt, `docs/2026-11-12_ki.sql` ist nicht ausgeführt, der Schlüssel ist falsch oder das Modell heißt beim Anbieter anders. Die Logs der Funktion zeigen den Grund (z. B. `Anbieter 401`).
- **Antworten der KI ohne Vorschlagskarte, obwohl sie etwas vorschlägt:** Das Modell hat sich nicht an das Antwortformat gehalten. Die App zeigt dann nur den Text. Passiert das oft, die Anleitung in `coach.js` nachschärfen oder ein stärkeres Modell eintragen.
- Wird eine Datei in `public/js/` oder `public/css/` umbenannt, müssen alle Stellen mit, die sie laden (`import` in den anderen Dateien, `<link>` in `index.html`). Sonst bleibt die Seite weiß. Die Tests zeigen das sofort.
- Die App braucht auch `docs/2026-11-10_puls-2-3.sql`. Ohne sie steht oben „column habits.unit does not exist“.
- Ein neues Theme braucht drei Stellen: `THEMES` in `js/config.js`, zwei Farbzeilen (dunkel und hell) in `css/tokens.css`, und der Schlüssel darf nur Kleinbuchstaben haben (Prüfung in der Datenbank).
- Die App braucht `docs/2026-11-10_checkins.sql` in der Datenbank. Ohne sie steht oben „Could not find the function public.checkins_map“.

## 9. Wartung nach längerer Zeit (Checkliste)
Dinge ändern sich über Jahre. Prüfe:
- Läuft die Seite noch? Falls nicht: **Supabase-Projekt prüfen.** Kostenlose Projekte können pausiert werden, wenn lange niemand zugreift. Dann im Supabase-Dashboard wieder starten (Bedingungen vorher bei Supabase nachlesen).
- Cloudflare: Läuft das Deployment grün? Eventuell hat sich die Einrichtung von Workers geändert (Konfigurationsdatei `wrangler.jsonc`).
- Die Supabase-Bibliothek ist auf `2.45.4` festgelegt und liegt in `public/js/vendor/`. Sie funktioniert weiter, ist aber alt. Bei einem Update die Datei ersetzen, `LIES-MICH.txt` anpassen und die Anmelde- und Datenbankaufrufe testen.
- Push: Läuft der Zeitplan noch (`select jobname, active from cron.job`)? Die Server-Funktion nutzt die Supabase-Bibliothek in der jeweils aktuellen 2er-Version.
- KI: Gibt es das Modell bei Cloudflare noch, ist das Gratis-Kontingent noch gleich, und reicht es (Cloudflare-Dashboard → Workers AI)? Nutzung: Befehl unten in `docs/2026-11-12_ki.sql`.
- Backup: In der App „Daten kopieren" oder in Supabase unter Table Editor → `habits` als CSV exportieren.
- Zugänge: Konten bei GitHub, Cloudflare und Supabase sind alle an eine E-Mail-Adresse gebunden. Diese Adresse erreichbar halten.

## 10. Zugänge (keine Passwörter hier eintragen)
| Dienst | Konto | Wo ansehen |
|---|---|---|
| GitHub | Repo `mind` unter dem eigenen Konto | github.com |
| Cloudflare | Projekt `mind` unter Workers und Pages | dash.cloudflare.com |
| Supabase | Projekt „MIND" | supabase.com/dashboard |
| Cloudflare Workers AI | KI-Assistent (Schlüssel mit „Workers AI: Lesen“), gleiches Konto wie das Hosting | dash.cloudflare.com |

Der `service_role`-Key darf **nie** in den Code oder ins Repository.

## 11. Mit Claude weiterarbeiten (Vorlage)
(Veraltet seit dem Umzug zu Claude Code am 06.11.2026, dort liest Claude das Repository selbst.) Schicke Claude in einem neuen Chat dieses Dokument, den aktuellen Inhalt von `public/` und `CHANGELOG.md`. Dazu zum Beispiel diese Nachricht:

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
