# MIND – Roadmap

Stand: 15.10.2026. Reihenfolge: erst Funktionen, Oberfläche und Struktur (Phase A), dann für andere öffnen (Phase B).

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
- [ ] **A2 Optionale Zusatzfelder anlegen:** Bereich „Mehr Optionen" im Formular
  - [ ] Mehrfach-Habit mit Tagesziel (z. B. Wasser 6× am Tag), Standard 1× = wie bisher
  - [ ] Tageszeit (Morgen, Mittag, Abend oder Uhrzeit), Standard keine
- [ ] **A3 Profil und Einstellungen:** Tabelle `profiles` (Name, Zeitzone, `plan`), Seite „Einstellungen", Erinnerung wandert von localStorage in die Datenbank
- [ ] **A4 Bessere Benachrichtigungen:** Prüfen, was geht (installierbare Web-App, Push, E-Mail). Entscheidung vorher.
- [ ] **A5 Integrierte KI:** Schlüssel nur auf dem Server (Supabase-Funktion), Limit pro Nutzer, Kosten im Blick
- [ ] **A6 Mehr Statistiken:** Verlauf, Vergleiche, Serien-Rekorde (später teilweise Premium)
- [ ] **A7 Oberfläche aufräumen:** Handy-Ansicht prüfen, Bedienung, Texte

## Phase B: Öffnen für andere (Launch)
- [ ] **B1 Kontaktformular** (Tabelle für Nachrichten, nur Schreiben erlaubt, Spam-Schutz)
- [ ] **B2 Account-Funktionen:** Passwort vergessen, E-Mail-Bestätigung, Konto und Daten löschen
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
