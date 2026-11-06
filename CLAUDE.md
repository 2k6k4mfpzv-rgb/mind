# Anweisungen für Claude (Projekt MIND)

MIND ist mein privater Habit Tracker: eine Datei `public/index.html`, Supabase (Login, Datenbank, Row Level Security, Registrierung gesperrt), Cloudflare Workers (veröffentlicht automatisch bei jedem Commit auf `main`). GitHub ist die Quelle der Wahrheit.

## Zu Beginn jeder Session
1. Lies zuerst `PROJEKTDOKU.md`, `ROADMAP.md` und `CHANGELOG.md`.
2. Lies mein Gedächtnis im Obsidian-Vault: `~/Documents/Gehirn/Memory/Claude Gedächtnis.md` und die Themenseite `~/Documents/Gehirn/Themen/MIND Habit Tracker.md`. Für den Vault gelten zusätzlich die Regeln in `~/Documents/Gehirn/CLAUDE.md`.

## Mein Gehirn (Obsidian-Vault) aktuell halten
Der Vault `~/Documents/Gehirn` ist mein Wissen. Was wir hier erarbeiten, muss dort landen, nicht nur im Chat oder im Repo:
- Pläne, Entscheidungen, Analysen und Anleitungen als neue Notiz in `~/Documents/Gehirn/Habit Tracker/` (mit `erstellt:`-Datum, Link auf [[MIND Habit Tracker]] und Wikilinks zu verwandten Notizen). Neu anlegen ist erlaubt, bestehende Notizen nur nach Rückfrage ändern.
- Wenn sich etwas Wichtiges ändert (Stand, Ablauf, Zugänge), schlag mir am Ende vor, `Memory/Claude Gedächtnis.md` zu ergänzen. Schreib dort erst nach meinem Ja.
- Sag mir am Ende jeder Aufgabe, welche Notiz du angelegt oder geändert hast.
- Nichts aus `Datenbank-Backups/` oder anderen privaten Daten in den Vault oder ins Repo kopieren.

## Arbeitsregeln
- Ändere nur, was ich verlange, sonst nichts.
- Alles Neue ist optional und standardmäßig aus. Bestehende Habits und Daten müssen unverändert funktionieren.
- Arbeite auf einem eigenen Branch und committe dort. Claude darf den Branch pushen und mit `gh` einen Pull Request öffnen (frag mich vorher kurz). Mergen auf `main` nur nach meinem ausdrücklichen Ja, weil `main` sofort live geht.
- Datenbank-Änderungen schreibst du nur als SQL-Datei in `docs/` (mit Datum im Namen, z. B. `docs/2026-11-06_name.sql`). Claude darf sie über den Supabase-Konnektor ausführen, aber nur nach meinem ausdrücklichen Ja und immer erst nach einem Backup der Tabelle `habits` (als JSON in `~/Documents/MIND Habit Tracker/Datenbank-Backups/`, nie ins Repo). Die SQL muss laufen, bevor der Code auf `main` geht.
- Keine Popups (`confirm`/`alert`). Keine Schlüssel oder Passwörter in den Code (der öffentliche `anon`-Key ist die einzige Ausnahme, der `service_role`-Key nie).
- Qualität vor Quantität. Ich bin Anfänger: erkläre mir Schritte konkret und kurz, auf Deutsch.
- Aktualisiere bei jeder Änderung `CHANGELOG.md` (und `PROJEKTDOKU.md`, wenn sich Grundsätzliches ändert). Das Häkchen in der `ROADMAP.md` setze ich erst nach meinem Test.
- Erkläre mir zuerst kurz, wie du etwas umsetzen willst, und stelle Rückfragen, bevor du etwas änderst.
