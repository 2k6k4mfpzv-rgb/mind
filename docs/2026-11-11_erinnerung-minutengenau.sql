-- MIND – Erinnerung minutengenau (11.11.2026)
-- Die Datenbank stoesst die Edge Function jetzt jede Minute an statt alle 5 Minuten.
-- Dazu gehoert die neue Fassung von supabase/functions/push-reminder/erinnerung.js (ohne Abrunden der Uhrzeit).
-- Aendert keine Daten. cron.schedule mit demselben Namen ersetzt den bisherigen Zeitplan.
-- Rueckgaengig: select cron.schedule('mind-push', '*/5 * * * *', 'select public.push_tick()');

select cron.schedule('mind-push', '* * * * *', 'select public.push_tick()');
