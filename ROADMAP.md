# MIND – Roadmap

Stand: 07.11.2026. Reihenfolge: erst Funktionen, Oberfläche und Struktur (Phase A), dann für andere öffnen (Phase B).

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
  - [ ] Mitentscheiden (aus dem Review vom 07.11.2026): Haken auf mehreren Geräten gleichzeitig sauber speichern (der Server zählt hoch, statt dass die App die ganze Liste schickt). Nötig, sobald man aus einer Benachrichtigung heraus abhaken kann, sonst spätestens vor dem Launch.
- [ ] **A5 Integrierte KI:** Schlüssel nur auf dem Server (Supabase-Funktion), Limit pro Nutzer, Kosten im Blick
  - [ ] Vorher (aus dem Review vom 07.11.2026): `public/index.html` in Dateien aufteilen (Aussehen, Logik, Oberfläche), weil A5 viel Code dazubringt
- [ ] **A6 Mehr Statistiken:** Verlauf, Vergleiche, Serien-Rekorde (später teilweise Premium)
- [ ] **A7 Oberfläche: Redesign „Puls“** (kommt **vor A4**, entschieden 07.11.2026, damit A4 und A5 gleich im neuen Design entstehen): Handy-Ansicht, Bedienung, Texte
  - [x] Schritt 1: Puls-Farben und Schrift, Startseite „Heute“ mit Kacheln und Tagesring, Tab-Leiste (Heute, Verlauf, Ich), Verlauf mit Punkte-Mosaik und Konstanz-Ring pro Habit, Farbe und Symbol pro Habit (Spalten `color`, `icon`), faire Serie mit Puffertag
  - [x] Schritt 1.1 (Review vom 07.11.2026, im selben Pull Request): alte Haken zählen nach Änderungen richtig (Spalte `settings_log`), App bleibt aktuell (Mitternacht, anderes Gerät), weniger Zahlen (Konstanz überall 30 Tage), lange Namen, Rückgängig, Heute-Markierung im Mosaik, Plus mittig, Logik-Tests (`tests/logik.html`)
  - [ ] Spätere Schritte (noch offen): Kachel lange drücken (Menü), Sammlung als Belohnung

## Phase B: Öffnen für andere (Launch)
- [ ] **B1 Kontaktformular** (Tabelle für Nachrichten, nur Schreiben erlaubt, Spam-Schutz)
- [ ] **B2 Account-Funktionen:** Passwort vergessen, E-Mail-Bestätigung, Konto und Daten löschen
  - [ ] Dazu (aus dem Review vom 07.11.2026): erster Start für neue Nutzer (leere Seiten freundlich füllen, kurze Einführung, Beispiel-Habits zum Antippen)
- [ ] **B3 Rechtliches:** Impressum, Datenschutzerklärung, Einwilligung. Vor dem Öffnen klären, ggf. mit Beratung (z. B. IHK-Gründungsberatung, Steuerberater, Datenschutz).
- [ ] **B4 Premium:** Zahlungsanbieter, Grenzen serverseitig erzwingen (nicht nur in der Oberfläche)

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
- [ ] Feinschliff-Runde (aus dem Review vom 07.11.2026): Abstände, Animationen und Texte auf allen Seiten einmal zusammen durchgehen
- [ ] Haken auf zwei Geräten gleichzeitig getestet (siehe A4)
