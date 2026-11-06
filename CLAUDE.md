# Anweisungen für Claude (Projekt MIND)

MIND ist mein privater Habit Tracker: eine Datei `public/index.html`, Supabase (Login, Datenbank, Row Level Security, Registrierung gesperrt), Cloudflare Workers (veröffentlicht automatisch bei jedem Commit auf `main`). GitHub ist die Quelle der Wahrheit.

Ich starte Sessions normalerweise im Obsidian-Vault `~/Documents/Gehirn` (meine Zentrale). Diese Regeln gelten trotzdem für jede Arbeit an diesem Code, egal aus welchem Ordner die Session gestartet wurde.

## Zu Beginn jeder Session
1. Lies zuerst `~/Documents/Gehirn/Habit Tracker/MIND – Aktueller Stand.md`. Dort steht, wo wir stehen und was als Nächstes kommt.
2. Lies `PROJEKTDOKU.md`, `ROADMAP.md` und `CHANGELOG.md`.
3. Lies mein Gedächtnis im Obsidian-Vault: `~/Documents/Gehirn/Memory/Claude Gedächtnis.md` und die Themenseite `~/Documents/Gehirn/Themen/MIND Habit Tracker.md`. Für den Vault gelten zusätzlich die Regeln in `~/Documents/Gehirn/CLAUDE.md`.
4. Bevor du etwas über Branches oder Pull Requests sagst, hol den echten Stand von GitHub: `git fetch --prune`, dann `git ls-remote --heads origin` und `gh pr list`. Lokale Verweise wie `remotes/origin/...` können veraltet sein und beweisen nicht, dass ein Branch auf GitHub noch existiert.

## Mein Gehirn (Obsidian-Vault) aktuell halten
Der Vault `~/Documents/Gehirn` ist mein Wissen. Was wir hier erarbeiten, muss dort landen, nicht nur im Chat oder im Repo:
- **Am Ende jeder Session (und nach jedem größeren Schritt) aktualisierst du `Habit Tracker/MIND – Aktueller Stand.md`:** „Jetzt gerade“ auf den neuen Stand bringen, oben im Verlauf einen kurzen Eintrag mit Datum ergänzen, `geändert:` anpassen. Diese eine Notiz darfst du ohne Rückfrage ändern. Halb fertige Arbeit (offener Branch, Pull Request, nicht ausgeführte SQL) muss dort stehen.
- Pläne, Entscheidungen, Analysen und Anleitungen als neue Notiz in `~/Documents/Gehirn/Habit Tracker/` (mit `erstellt:`-Datum, Link auf [[MIND Habit Tracker]] und Wikilinks zu verwandten Notizen). Neu anlegen ist erlaubt, bestehende Notizen nur nach Rückfrage ändern.
- Wenn sich etwas Wichtiges ändert (Stand, Ablauf, Zugänge), schlag mir am Ende vor, `Memory/Claude Gedächtnis.md` zu ergänzen. Schreib dort erst nach meinem Ja.
- Sag mir am Ende jeder Aufgabe, welche Notiz du angelegt oder geändert hast.
- Nichts aus `Datenbank-Backups/` oder anderen privaten Daten in den Vault oder ins Repo kopieren.

## Arbeitsregeln
- Ändere nur, was ich verlange, sonst nichts.
- Alles Neue ist optional und standardmäßig aus. Bestehende Habits und Daten müssen unverändert funktionieren.
- Arbeite auf einem eigenen Branch und committe dort. Claude darf den Branch pushen und mit `gh` einen Pull Request öffnen (frag mich vorher kurz). Mergen auf `main` nur nach meinem ausdrücklichen Ja, weil `main` sofort live geht. Nach dem Merge den Branch löschen (`gh pr merge --delete-branch`) und danach `git fetch --prune` ausführen, damit keine veralteten Verweise übrig bleiben.
- Datenbank-Änderungen schreibst du nur als SQL-Datei in `docs/` (mit Datum im Namen, z. B. `docs/2026-11-06_name.sql`). Claude darf sie über den Supabase-Konnektor ausführen, aber nur nach meinem ausdrücklichen Ja und immer erst nach einem Backup der Tabelle `habits` (als JSON in `~/Documents/MIND Habit Tracker/Datenbank-Backups/`, nie ins Repo). Die SQL muss laufen, bevor der Code auf `main` geht.
- Keine Popups (`confirm`/`alert`). Keine Schlüssel oder Passwörter in den Code (der öffentliche `anon`-Key ist die einzige Ausnahme, der `service_role`-Key nie).
- Qualität vor Quantität. Ich bin Anfänger: erkläre mir Schritte konkret und kurz, auf Deutsch.
- Aktualisiere bei jeder Änderung `CHANGELOG.md` (und `PROJEKTDOKU.md`, wenn sich Grundsätzliches ändert). Das Häkchen in der `ROADMAP.md` setze ich erst nach meinem Test.
- Erkläre mir zuerst kurz, wie du etwas umsetzen willst, und stelle Rückfragen, bevor du etwas änderst.
