-- A2: Optionale Zusatzfelder (Tagesziel und Tageszeit). Einmal in Supabase SQL Editor ausfuehren,
-- BEVOR der neue Code auf main geht. Vorher Backup: in der App "Daten kopieren".
-- Bestehende Habits bekommen die Standardwerte (Ziel 1, keine Tageszeit) = Verhalten wie bisher.
-- Die Spalte done bleibt unveraendert: 1 = einmal erledigt, bei Mehrfach-Habits steht dort die Anzahl.

alter table public.habits
  add column if not exists target integer not null default 1,
  add column if not exists daytime text not null default '';

-- Nur sinnvolle Werte erlauben: Ziel 1 bis 20; Tageszeit leer, morgen, mittag, abend oder Uhrzeit HH:MM
alter table public.habits
  add constraint habits_target_range check (target between 1 and 20),
  add constraint habits_daytime_valid check (
    daytime in ('', 'morgen', 'mittag', 'abend') or daytime ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  );
