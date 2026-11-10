-- Puls Schritt 2 und 3 (Fable Auftrag 2, Teil A): Einheit, Pausieren, Theme und "Tage insgesamt".
-- Einmal in Supabase ausfuehren, BEVOR der neue Code getestet wird (die Vorschau nutzt dieselbe echte Datenbank).
-- Vorher Backup der Tabellen habits, checkins und profiles.
--
-- Es kommen nur neue Spalten dazu, jede mit einem Standardwert, der dem heutigen Verhalten entspricht.
-- Bestehende Habits, Haken und das Profil werden nicht veraendert. Der alte Code auf main stoert sich nicht
-- an den neuen Spalten. Alles laeuft in einer Transaktion: Geht etwas schief, bleibt die Datenbank unveraendert.

begin;

-- 1. Einheit pro Habit (Puls 2). Leer = wie bisher ("noch 3x").
--    unit = Einzahl oder freier Text ("Glas", "5 Minuten"), unit_pl = Mehrzahl ("Glaeser"), leer = wie unit.
alter table public.habits
  add column if not exists unit text not null default '',
  add column if not exists unit_pl text not null default '';
alter table public.habits
  add constraint habits_unit_len check (char_length(unit) <= 20 and char_length(unit_pl) <= 20);

-- 2. Pausieren (Puls 2). paused = Liste von {"from": "JJJJ-MM-TT", "to": "JJJJ-MM-TT" oder null}.
--    Von "from" bis "to" (beide einschliesslich) ist das Habit pausiert, diese Tage zaehlen nicht als geplant.
--    "to" = null heisst: pausiert, bis man es fortsetzt. Leer = nie pausiert. Die App pflegt die Liste selbst.
alter table public.habits
  add column if not exists paused jsonb not null default '[]'::jsonb;
alter table public.habits
  add constraint habits_paused_valid check (jsonb_typeof(paused) = 'array');

-- 3. Sammlung (Puls 3), im Profil, damit es auf allen Geraeten gilt.
--    theme = gewaehltes Theme (leer = Standard "Puls"). Welche Namen es gibt, weiss die App (js/config.js),
--    ein unbekannter Name wird dort wie leer behandelt.
--    days_total = hoechster je erreichter Stand an "Tagen insgesamt". Die App erhoeht ihn nur. So geht ein
--    freigeschaltetes Theme nicht wieder verloren, wenn man spaeter ein Habit mit seinen Haken loescht.
alter table public.profiles
  add column if not exists theme text not null default '',
  add column if not exists days_total integer not null default 0;
alter table public.profiles
  add constraint profiles_theme_valid check (theme ~ '^[a-z]{0,20}$'),
  add constraint profiles_days_total_valid check (days_total >= 0);

-- Die App darf im Profil nur einzelne Spalten aendern (siehe 2026-11-06_a3-profiles.sql). Diese zwei kommen dazu.
-- plan bleibt gesperrt.
grant update (theme, days_total) on public.profiles to authenticated;

commit;

-- Rueckweg (nur falls noetig, nichts davon ist fuer den alten Code wichtig):
--   alter table public.habits drop column unit, drop column unit_pl, drop column paused;
--   alter table public.profiles drop column theme, drop column days_total;
