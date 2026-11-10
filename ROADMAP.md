# MIND – Roadmap

Stand: 10.11.2026. Reihenfolge: erst Funktionen, Oberfläche und Struktur (Phase A), dann für andere öffnen (Phase B).

## Grundregeln
1. **Alles Zusätzliche ist optional.** Ein Habit besteht im Minimum nur aus einem Namen. Zeiten, Mehrfach-Ziele, Kategorie und Erinnerung sind ausgeklappte Zusatzoptionen und standardmäßig aus. Neue Datenbank-Felder bekommen immer einen Standardwert, der dem heutigen Verhalten entspricht.
2. **Bestehende Daten bleiben gültig.** Keine Änderung darf alte Habits oder Haken kaputt machen. Vor jeder Datenbank-Änderung: Backup (Daten kopieren).
3. **Vorbereiten statt später umbauen.** Pro Nutzer getrennte Daten (`user_id`, Zugriffsregeln) gibt es schon. Dazu kommen früh: eine Profil-Tabelle mit Feld `plan` (Standard `free`) und eine zentrale Stelle im Code für Grenzen (z. B. maximale Habits). So wird Premium später ein Schalter.
4. **Ein Schritt pro Änderung** mit Commit-Nachricht und Changelog-Eintrag.
5. **Qualität vor Quantität.** Lieber wenige Funktionen sauber als viele halb. Ein Schritt ist erst fertig, wenn die Definition of Done erfüllt ist (siehe unten).

### Definition of Done (für jeden Schritt)
- [ ] Funktion getestet am Computer **und** am Handy
- [ ] Alte Daten und Habits funktionieren unverändert
- [ ] Fehlerfälle geprüft (leere Eingabe, kein Netz, ausgeloggt)
- [ ] Backup vor Datenbank-Änderungen gemacht
- [ ] Commit-Nachricht, `CHANGELOG.md` und bei Bedarf `PROJEKTDOKU.md` aktualisiert

## Phase A: Funktionen und Oberfläche (nur ich als Nutzer)
- [x] **A1 Habits bearbeiten** (Name, Tage, Kategorie) und **verschieben** (Reihenfolge, neue Spalte `pos`)
- [x] **A2 Optionale Zusatzfelder anlegen:** Bereich „Mehr Optionen" im Formular
  - [x] Mehrfach-Habit mit Tagesziel (z. B. Wasser 6× am Tag), Standard 1× = wie bisher
  - [x] Tageszeit (Morgen, Mittag, Abend oder Uhrzeit), Standard keine
- [x] **A3 Profil und Einstellungen:** Tabelle `profiles` (Name, Zeitzone, `plan`), Seite „Einstellungen", Erinnerung wandert von localStorage in die Datenbank
- [ ] **A4 Bessere Benachrichtigungen:** Prüfen, was geht (installierbare Web-App, Push, E-Mail). Entscheidung vorher.
  - [x] Mitentscheiden (aus dem Review vom 07.11.2026): Haken auf mehreren Geräten gleichzeitig sauber speichern (der Server zählt hoch, statt dass die App die ganze Liste schickt). Nötig, sobald man aus einer Benachrichtigung heraus abhaken kann, sonst spätestens vor dem Launch. **Erledigt am 10.11.2026 im Paket „Fundament“ (Tabelle `checkins`, Pull Request #5).**
- [ ] **A5 Integrierte KI:** Schlüssel nur auf dem Server (Supabase-Funktion), Limit pro Nutzer, Kosten im Blick
  - [x] Vorher (aus dem Review vom 07.11.2026): `public/index.html` in Dateien aufteilen (Aussehen, Logik, Oberfläche), weil A5 viel Code dazubringt. **Erledigt am 10.11.2026 im Paket „Fundament“ (`css/`, `js/` als Module, Pull Request #5).**
  - [ ] MIND-Knopf in der Mitte der Tab-Leiste (dann Heute, Verlauf, MIND, Sammlung, Ich). Öffnet den Chat als Blatt von unten mit Vorschlägen („Woche besprechen“, „Neues Habit planen“). Vorschläge übernimmt man mit „Übernehmen“ oder „Anpassen“
  - [ ] KI-Einstiege: „Mini-Version vorschlagen“ im Menü der Kachel, „Woche besprechen“ oben im Verlauf, „Muster erklären“ pro Habit, „Hilf mir formulieren“ beim neuen Habit
  - [ ] Pro-Stil: dunkle Pro-Fläche, Funke in Koralle, kleine Plakette „PRO“ (nie laut, kein Schloss, nichts ausgegraut)
  - [ ] **Pro vorbereitet, nicht gesperrt (Pauls Entscheidung 07.11.2026):** Alle Pro-Stellen werden fertig gebaut und markiert, das Gerüst steht. Solange es kein bezahltes Pro gibt, können alle sie nutzen (im Rahmen des KI-Limits). Pro einführen heißt später nur: ein paar vorbereitete Schritte (siehe B4), kein Umbau. Technisch prüft das die Supabase-Funktion auf dem Server, nicht `index.html` (das Repo ist öffentlich). Wer Pro schon hat, z. B. Tester, behält es über `plan = premium`
  - [ ] **KI-Anbieter (Pauls Entscheidung 07.11.2026):** Am Anfang kostenlose KI-Modelle mit festem Limit pro Nutzer, damit erst mal kein Geld ausgegeben wird. Anbieter und Modell stehen an genau einer Stelle (in der Supabase-Funktion), damit man später mit wenigen Zeilen wechseln kann. Wenn zahlende Nutzer es wirtschaftlich machen: bezahltes Modell und höhere Limits. Vorher prüfen: Nutzt der kostenlose Anbieter die Eingaben zum Training, und wo stehen die Server? Das betrifft den Datenschutz (B3), denn Habits können Gesundheitsdaten sein
  - [ ] Faire Pro-Seite für alle ohne Pro: was Pro kann, „Vielleicht später“, „Preis folgt · monatlich kündbar“. Zum Reinschnuppern 1× im Monat „Woche besprechen“ gratis. Sie erscheint erst, wenn Pro eingeführt ist
  - Regeln: Die KI schreibt nie zuerst (kein Push, kein roter Punkt). Erst fragen, dann vorschlagen. Ohne Pro ist alles benutzbar, Pro-Stellen sind nur markiert
- [ ] **A6 Mehr Statistiken:** Verlauf, Vergleiche, Serien-Rekorde (später teilweise Premium)
- [ ] **A7 Oberfläche: Redesign „Puls“** (kommt **vor A4**, entschieden 07.11.2026, damit A4 und A5 gleich im neuen Design entstehen): Handy-Ansicht, Bedienung, Texte
  - [x] Schritt 1: Puls-Farben und Schrift, Startseite „Heute“ mit Kacheln und Tagesring, Tab-Leiste (Heute, Verlauf, Ich), Verlauf mit Punkte-Mosaik und Konstanz-Ring pro Habit, Farbe und Symbol pro Habit (Spalten `color`, `icon`), faire Serie mit Puffertag
  - [x] Schritt 1.1 (Review vom 07.11.2026, im selben Pull Request): alte Haken zählen nach Änderungen richtig (Spalte `settings_log`), App bleibt aktuell (Mitternacht, anderes Gerät), weniger Zahlen (Konstanz überall 30 Tage), lange Namen, Rückgängig, Heute-Markierung im Mosaik, Plus mittig, Logik-Tests (`tests/logik.html`)
  - [x] Schritt 2: Kachel lange drücken (auf dem Handy lange drücken, am Mac Rechtsklick) mit Menü Bearbeiten, Farbe ändern, Pausieren. Pausieren: pausierte Tage zählen nicht als geplant, Konstanz und Serie leiden nicht. Einheit auf der Kachel, z. B. „noch 3 Gläser“, „5 Minuten“ (optional, leer = wie bisher „noch 3×“). **Live seit 10.11.2026 (Pull Request #6), von Paul auf der Vorschau getestet.** Pauls Entscheidungen: Pausieren bis zum Fortsetzen oder mit Enddatum, Bearbeiten als Blatt auf „Heute“, Einheit in Einzahl und Mehrzahl
  - [x] Schritt 3: Sammlung als eigener Tab (Tab-Leiste dann Heute, Verlauf, Sammlung, Ich). Themes wie „Abendrot“ werden nach Tagen **insgesamt** freigeschaltet, nicht am Stück. Man verliert nie etwas. Im Verlauf eine kleine Karte zum nächsten Theme. **Live seit 10.11.2026 (Pull Request #6), von Paul auf der Vorschau getestet.** Pauls Entscheidung: 6 Themes, alle gratis, nach 7, 30, 60, 100, 150 und 250 Tagen insgesamt. Pro-Themes erst, wenn es Pro gibt
  - **Zielbild (Pauls Entscheidung 07.11.2026):** das Konzeptbild „Puls + KI“ (Vault: `Habit Tracker/MIND – Zielbild Puls + KI (Abgleich).md`), außer dem, was in Schritt 1 und 1.1 bewusst anders gebaut wurde: Verlauf mit vollem Punkte-Raster und Konstanz-Ring (30 Tage) statt „insgesamt“ und „beste Woche“ auf der Karte

## Phase B: Öffnen für andere (Launch)
- [ ] **B1 Kontaktformular** (Tabelle für Nachrichten, nur Schreiben erlaubt, Spam-Schutz)
- [ ] **B2 Account-Funktionen:** Passwort vergessen, E-Mail-Bestätigung, Konto und Daten löschen
  - [ ] Dazu (aus dem Review vom 07.11.2026): erster Start für neue Nutzer (leere Seiten freundlich füllen, kurze Einführung, Beispiel-Habits zum Antippen)
- [ ] **B3 Rechtliches:** Impressum, Datenschutzerklärung, Einwilligung. Vor dem Öffnen klären, ggf. mit Beratung (z. B. IHK-Gründungsberatung, Steuerberater, Datenschutz).
- [ ] **B4 Premium:** Zahlungsanbieter, Grenzen serverseitig erzwingen (nicht nur in der Oberfläche)
  - [ ] Pro einführen, wenn Leute dafür zahlen wollen: Bezahlen auf der Pro-Seite aus A5 einbauen, Preis festlegen (monatlich kündbar), Pro-Stellen für alle ohne `plan = premium` sperren (vorbereitet in A5), dann auf bezahlte KI und höhere Limits umstellen, sobald es sich wirtschaftlich lohnt

### Launch-Checkliste („1 Klick")
Technisch ist das Öffnen ein Schalter in Supabase: *Authentication → Sign In / Providers → Allow new users to sign up*. Vorher muss erledigt sein:
- [ ] Eigener E-Mail-Dienst in Supabase (der Standard-Versand ist stark begrenzt)
- [ ] Passwort vergessen, Konto löschen funktionieren
- [ ] Impressum und Datenschutzerklärung verlinkt
- [ ] Kontaktformular getestet
- [ ] Zugriffsregeln (Row Level Security) auf allen Tabellen aktiv und getestet mit einem zweiten Testkonto
- [ ] Grenzen für Gratis-Nutzer im Code und in der Datenbank gesetzt
- [ ] Backup gemacht
- [ ] Kosten und Limits der Dienste geprüft (Supabase, Cloudflare, E-Mail, KI)
- [ ] KI-Limit pro Nutzer gesetzt (kostenlose Modelle, siehe A5), damit offene Anmeldungen keine Kosten erzeugen
- [ ] Feinschliff-Runde (aus dem Review vom 07.11.2026): Abstände, Animationen und Texte auf allen Seiten einmal zusammen durchgehen
- [ ] Haken auf zwei Geräten gleichzeitig getestet (siehe A4)
