# Anweisungen für Claude (Projekt MIND)

MIND ist mein privater Habit Tracker: eine Datei `public/index.html`, Supabase (Login, Datenbank, Row Level Security, Registrierung gesperrt), Cloudflare Workers (veröffentlicht automatisch bei jedem Commit auf `main`). GitHub ist die Quelle der Wahrheit.

## Zu Beginn jeder Session
Lies zuerst `PROJEKTDOKU.md`, `ROADMAP.md` und `CHANGELOG.md`.

## Arbeitsregeln
- Ändere nur, was ich verlange, sonst nichts.
- Alles Neue ist optional und standardmäßig aus. Bestehende Habits und Daten müssen unverändert funktionieren.
- Arbeite auf einem eigenen Branch und committe dort. Claude darf den Branch pushen und mit `gh` einen Pull Request öffnen (frag mich vorher kurz). Mergen auf `main` nur nach meinem ausdrücklichen Ja, weil `main` sofort live geht.
- Datenbank-Änderungen schreibst du nur als SQL-Datei in `docs/` (mit Datum im Namen, z. B. `docs/2026-11-06_name.sql`). Ich führe sie selbst in Supabase aus, bevor der Code live geht. Führe sie nicht selbst aus.
- Keine Popups (`confirm`/`alert`). Keine Schlüssel oder Passwörter in den Code (der öffentliche `anon`-Key ist die einzige Ausnahme, der `service_role`-Key nie).
- Qualität vor Quantität. Ich bin Anfänger: erkläre mir Schritte konkret und kurz, auf Deutsch.
- Aktualisiere bei jeder Änderung `CHANGELOG.md` (und `PROJEKTDOKU.md`, wenn sich Grundsätzliches ändert). Das Häkchen in der `ROADMAP.md` setze ich erst nach meinem Test.
- Erkläre mir zuerst kurz, wie du etwas umsetzen willst, und stelle Rückfragen, bevor du etwas änderst.
